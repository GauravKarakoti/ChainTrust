import Groq from "groq-sdk";

const TG_TOKEN = import.meta.env.VITE_TG_TOKEN;
const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

export const groq = new Groq({apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true});

export async function fetchWalletGraph(address) {
  if (!address) return { nodes: [], edges: [] }; 

  try {
    const response = await fetch(`/restpp/query/ChainTrustGraph/check_wallet_risk?target_wallet=${address}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TG_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.error || !data.results || data.results.length === 0) {
      return { nodes: [], edges: [] };
    }
    
    const nodesData = data.results.find(r => r.Nodes)?.Nodes || [];
    const edgesData = data.results.find(r => r.Edges)?.Edges || [];
    
    const nodes = nodesData.map(node => ({
      data: { 
        id: node.v_id, 
        label: node.attributes.short_address, 
        type: node.v_type.toLowerCase(), 
        risk: (node.attributes['@calculated_risk'] || node.attributes.risk_level || 'UNKNOWN').toUpperCase().replace(' RISK', ''),
        address: node.v_id, 
        short: node.attributes.short_address,
        // NEW: Map the jurisdiction attribute from TigerGraph
        jurisdiction: node.attributes.jurisdiction || null, 
        // Optional: If you also added entityName or tags in TG, map them here too!
        entityName: node.attributes.entity_name || null,
        tags: node.attributes.tags ? node.attributes.tags.split(',') : []
      }
    }));

    const edges = edgesData.map(edge => ({
      data: {
        id: edge.e_id || `${edge.from_id}-${edge.to_id}`, 
        source: edge.from_id,
        target: edge.to_id,
        type: edge.e_type,
        value: edge.attributes.amount + ' ETH'
      }
    }));

    return { nodes, edges };
  } catch (error) {
    console.error('TigerGraph connection error:', error);
    return { nodes: [], edges: [] };
  }
}

export async function upsertGraphData(transactions, riskMap = {}, metadataMap = {}) {
  const payload = {
    vertices: { "Wallet": {} },
    edges: { "Wallet": {} }
  };

  transactions.forEach(tx => {
    // 1. Base vertex setup (Address and Short Address)
    if (!payload.vertices.Wallet[tx.from]) {
        payload.vertices.Wallet[tx.from] = { 
            "address": { "value": tx.from }, 
            "short_address": { "value": tx.from.substring(0,6) }
        };
    }
    if (!payload.vertices.Wallet[tx.to]) {
        payload.vertices.Wallet[tx.to] = { 
            "address": { "value": tx.to }, 
            "short_address": { "value": tx.to.substring(0,6) }
        };
    }

    // 2. Apply Risk Levels
    if (riskMap[tx.from]) {
        payload.vertices.Wallet[tx.from].risk_level = { "value": riskMap[tx.from] };
    }
    if (riskMap[tx.to]) {
        payload.vertices.Wallet[tx.to].risk_level = { "value": riskMap[tx.to] };
    }

    // --- NEW: Apply Metadata (Jurisdiction, Entity, Tags) ---
    const applyMetadata = (walletAddress) => {
        if (metadataMap[walletAddress]) {
            const meta = metadataMap[walletAddress];
            if (meta.jurisdiction) {
                payload.vertices.Wallet[walletAddress].jurisdiction = { "value": meta.jurisdiction };
            }
            if (meta.entityName) {
                payload.vertices.Wallet[walletAddress].entity_name = { "value": meta.entityName };
            }
            if (meta.tags && meta.tags.length > 0) {
                // TG expects a string, so we join arrays with commas
                const tagStr = Array.isArray(meta.tags) ? meta.tags.join(',') : meta.tags;
                payload.vertices.Wallet[walletAddress].tags = { "value": tagStr };
            }
        }
    };

    applyMetadata(tx.from);
    applyMetadata(tx.to);

    // 3. Edge setup
    if (!payload.edges.Wallet[tx.from]) {
        payload.edges.Wallet[tx.from] = { "TRANSACTION": { "Wallet": {} } };
    }
    
    payload.edges.Wallet[tx.from]["TRANSACTION"]["Wallet"][tx.to] = {
      "amount": { "value": tx.value },
    };
  });

  const response = await fetch('/restpp/graph/ChainTrustGraph', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TG_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("TigerGraph Ingestion Failed:", errorData);
  }
}

export async function syncWalletTransactions(address) {
  if (!address) return;
  const lowerAddress = address.toLowerCase();

  try {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${ETHERSCAN_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "1" || !data.result) {
      console.warn('No transactions found or API limit reached:', data.message);
      return;
    }

    const transactions = data.result.map(tx => ({
      from: tx.from.toLowerCase(),
      to: tx.to.toLowerCase(),
      value: (Number(tx.value) / 1e18).toFixed(4) 
    }));

    const existingProfile = await fetchWalletProfile(lowerAddress);
    const riskMap = {};
    const metadataMap = {};

    // --- 1. LOCAL DEMO ENTITY MAP (Optional, but great for UI testing) ---
    // Since enterprise APIs are gated, you can manually tag famous addresses here.
    const KNOWN_ENTITIES = {
      "0x28c6c06298d514db089934071355e5743bf21d60": { name: "Binance Cold Wallet", region: "AE" },
      "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c": { name: "Ronin Bridge Exploiter (Lazarus)", region: "KP" },
      "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc": { name: "Tornado Cash Router", region: "🌐" }
    };

    // --- 2. EXTRACT DATA FROM GOPLUS (Free API) ---
    try {
      const riskRes = await fetch(`https://api.gopluslabs.io/api/v1/address_security/${lowerAddress}?chain_id=1`);
      const riskData = await riskRes.json();
      
      let isMalicious = false;
      let uiTags = [];
      let uiRegion = null;
      let uiEntityName = null;

      // Check our local map first
      if (KNOWN_ENTITIES[lowerAddress]) {
        uiEntityName = KNOWN_ENTITIES[lowerAddress].name;
        uiRegion = KNOWN_ENTITIES[lowerAddress].region;
      }

      if (riskData.result && riskData.result[lowerAddress]) {
        const flags = riskData.result[lowerAddress];
        
        // Map GoPlus specific flags to your UI Tags
        if (flags.sanctioned === "1") {
            uiTags.push('ofac-sanctioned');
            uiRegion = uiRegion || 'KP'; // Default sanctioned to North Korea flag for visual impact
        }
        if (flags.mixer === "1") uiTags.push('mixer-linked');
        if (flags.phishing_activities === "1") uiTags.push('known-scam');
        if (flags.cybercrime === "1" || flags.darkweb_transactions === "1") uiTags.push('blacklisted');
        
        // If ANY GoPlus risk flag is "1", mark it as malicious
        isMalicious = Object.values(flags).some(val => String(val) === "1");
      }
      
      // Calculate final risk level
      if (isMalicious) {
        riskMap[lowerAddress] = 'CRITICAL';
      } else {
        const currentRisk = existingProfile?.risk || 'UNKNOWN';
        if (currentRisk === 'UNKNOWN') riskMap[lowerAddress] = 'SAFE';
      }

      // If we found any tags, region, or entity name, save it to the metadata map
      if (uiTags.length > 0 || uiRegion || uiEntityName) {
         metadataMap[lowerAddress] = {
             jurisdiction: uiRegion,
             entityName: uiEntityName,
             tags: uiTags
         };
      }
      
    } catch (apiError) {
      console.warn("GoPlus Risk API failed, falling back to GSQL logic:", apiError);
    }

    // 3. Pass BOTH the riskMap and the metadataMap into upsert
    await upsertGraphData(transactions, riskMap, metadataMap);
    console.log(`✅ Synced ${transactions.length} transactions for ${address} to TigerGraph`);
    
  } catch (error) {
    console.error('Failed to sync blockchain data:', error);
  }
}

export async function fetchWalletProfile(address) {
  if (!address) return null; 

  try {
    const response = await fetch(`/restpp/graph/ChainTrustGraph/vertices/Wallet/${address}`, {
      headers: { 'Authorization': `Bearer ${TG_TOKEN}` }
    });
    const data = await response.json();
    
    if (data.error || !data.results || !data.results[0]) {
      return null;
    }

    const attributes = data.results[0].attributes;
    const risk = (attributes.risk_level || 'UNKNOWN').toUpperCase().replace(' RISK', '');
    
    // Calculate deterministic trust score if missing from backend
    let trustScore = attributes.trust_score;
    if (trustScore === undefined) {
      let seed = 0;
      for (let i = 0; i < address.length; i++) {
        seed += address.charCodeAt(i);
      }
      const variance = (seed % 15) - 7;
      
      if (risk === 'SAFE' || risk === 'LOW') {
        trustScore = Math.min(100, 85 + variance);
      } else if (risk === 'MEDIUM') {
        trustScore = 50 + variance;
      } else {
        trustScore = Math.max(5, 20 + variance);
      }
    }

    return {
      ...attributes,
      address: address,
      short: attributes.short_address || address,
      risk,
      trustScore // Append the calculated or fetched score
    };
  } catch (error) {
    console.error('TigerGraph profile error:', error);
    return null;
  }
}

/**
 * Fetches preset wallet queries for the search bar
 */
export async function fetchPresetWallets() {
  try {
    const response = await fetch(`/restpp/query/ChainTrustGraph/get_preset_wallets`, {
      headers: { 'Authorization': `Bearer ${TG_TOKEN}` }
    });
    const data = await response.json();
    return data.results[0].Presets || [];
  } catch (error) {
    console.error('Failed to fetch presets:', error);
    return [];
  }
}

export async function fetchAIExplanations(address) {
  try {
    // 1. Fetch graph metrics from TigerGraph
    const tgResponse = await fetch(`/restpp/query/ChainTrustGraph/generate_ai_explanation?wallet_id=${address}`, {
      headers: { 'Authorization': `Bearer ${TG_TOKEN}` }
    });
    const tgData = await tgResponse.json();

    if (tgData.error || !tgData.results || !tgData.results[0]) {
      return ["Failed to retrieve network metrics from TigerGraph."];
    }

    const metrics = tgData.results[0];
    const baseRisk = metrics.base_risk || "UNKNOWN";
    const totalTxs = metrics.total_txs || 0;
    const flaggedTxs = metrics.flagged_txs || 0;
    const riskRatio = metrics.risk_ratio || 0;
    
    if (!groq) {
      return [`Metrics: ${baseRisk} risk, ${totalTxs} txs.`, "Add VITE_GROQ_API_KEY to enable AI."];
    }

    // 2. Updated Prompt: Includes the word "json" to satisfy the API requirement
    // and specifies a structured array format for the UI.
    const prompt = `You are a cybersecurity blockchain analyst. Analyze this wallet: ${address}.

    Metrics:
    - Risk Score: ${baseRisk}
    - Total Transactions (recent window): ${totalTxs}
    - Flagged Transactions: ${flaggedTxs}
    - Exposure Ratio: ${riskRatio}%

    Important context:
    - Blockchain explorers like Etherscan may only return recent transactions.
    - A value of 0 transactions does NOT necessarily mean the wallet is new or inactive.
    - Historical malicious activity may not appear in recent transaction counts.

    Instructions:
    - Base your reasoning primarily on flagged transactions and exposure ratio.
    - Do NOT assume "0 transactions" implies high risk or new wallet.
    - Ensure the explanation logically aligns with the given risk score.

    Output:
    Provide exactly 3 sentences explaining the risk.

    Format:
    {
      "explanations": [
        "sentence 1",
        "sentence 2",
        "sentence 3"
      ]
    }`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    // 3. Parse and return the array
    const content = JSON.parse(completion.choices[0]?.message.content || '{"explanations": []}');
    
    // Return the array directly so AIExplainer.jsx can map through it
    return content.explanations && content.explanations.length > 0 
      ? content.explanations 
      : ["Analysis complete. No specific threats identified."];

  } catch (error) {
    console.error('Failed to generate AI explanation:', error);
    return ["TigerGraph metrics processed, but AI generation failed. Please check console."];
  }
}

/**
 * Fetches live real-time network alerts
 */
export async function fetchLiveAlerts() {
  try {
    const response = await fetch(`/restpp/query/ChainTrustGraph/get_live_alerts`, {
      headers: { 'Authorization': `Bearer ${TG_TOKEN}` }
    });
    const data = await response.json();
    return data.results[0].Alerts || [];
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return [];
  }
}