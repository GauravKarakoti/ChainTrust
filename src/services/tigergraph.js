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
    
    // Find the objects containing Nodes and Edges respectively
    const nodesData = data.results.find(r => r.Nodes)?.Nodes || [];
    const edgesData = data.results.find(r => r.Edges)?.Edges || [];
    
    const nodes = nodesData.map(node => ({
      data: { 
        id: node.v_id, 
        label: node.attributes.short_address, 
        type: node.v_type.toLowerCase(), 
        risk: (node.attributes['@calculated_risk'] || node.attributes.risk_level || 'UNKNOWN').toUpperCase().replace(' RISK', ''),
        address: node.v_id, 
        short: node.attributes.short_address
      }
    }));

    const edges = edgesData.map(edge => ({
      data: {
        // TigerGraph doesn't always return a native e_id. 
        // Using a composite ID prevents graph rendering bugs if e_id is undefined.
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

// 1. NEW: Added riskMap parameter to populate risk_level during upsert
export async function upsertGraphData(transactions, riskMap = {}) {
  const payload = {
    vertices: { "Wallet": {} },
    edges: { "Wallet": {} }
  };

  transactions.forEach(tx => {
    payload.vertices.Wallet[tx.from] = { 
        "address": { "value": tx.from }, 
        "short_address": { "value": tx.from.substring(0,6) },
        "risk_level": { "value": riskMap[tx.from] || 'UNKNOWN' } 
    };
    payload.vertices.Wallet[tx.to] = { 
        "address": { "value": tx.to }, 
        "short_address": { "value": tx.to.substring(0,6) },
        "risk_level": { "value": riskMap[tx.to] || 'UNKNOWN' }
    };

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

    // 2. NEW: Call GoPlus Security API to get risk level for the target wallet
    const riskMap = {};
    try {
      const riskRes = await fetch(`https://api.gopluslabs.io/api/v1/address_security/${address}?chain_id=1`);
      const riskData = await riskRes.json();
      
      let targetRisk = 'SAFE'; // Changed from 'Safe'
      if (riskData.result && riskData.result[address.toLowerCase()]) {
        const securityFlags = riskData.result[address.toLowerCase()];
        const isMalicious = Object.values(securityFlags).some(val => val === "1");
        if (isMalicious) targetRisk = 'CRITICAL'; // Changed from 'Critical Risk'
      }
      riskMap[address.toLowerCase()] = targetRisk;
    } catch (apiError) {
      console.warn("GoPlus Risk API failed, falling back to GSQL logic:", apiError);
    }

    // Pass the riskMap into upsert
    await upsertGraphData(transactions, riskMap);
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
    
    // NEW: Normalize the attributes so `risk` and `address` are always explicitly defined
    return {
      ...attributes,
      address: address,
      short: attributes.short_address || address,
      risk: (attributes.risk_level || 'UNKNOWN').toUpperCase().replace(' RISK', '')
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
    Metrics: Risk ${baseRisk}, Total Txs ${totalTxs}, Flagged Txs ${flaggedTxs}, Exposure ${riskRatio}%.
    
    Provide a 3-sentence risk assessment. Format your response as a JSON object containing an array of strings named "explanations". 
    Each string should be one sentence. Use **markdown bolding** for key numbers.
    Example: { "explanations": ["line 1", "line 2", "line 3"] }`;

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