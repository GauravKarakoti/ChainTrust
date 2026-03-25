const TG_TOKEN = import.meta.env.VITE_TG_TOKEN;
const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

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
    
    if (data.error || !data.results || !data.results[0]) {
      return { nodes: [], edges: [] };
    }
    
    const nodes = (data.results[0].Nodes || []).map(node => ({
      data: { 
        id: node.v_id, 
        label: node.attributes.short_address, 
        type: node.v_type.toLowerCase(), 
        risk: node.attributes.risk_level || 'UNKNOWN' // Will now be populated by API or GSQL
      }
    }));

    const edges = (data.results[0].Edges || []).map(edge => ({
      data: {
        id: edge.e_id,
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
      
      let targetRisk = 'Safe';
      if (riskData.result) {
         // If any security flag from GoPlus is true ("1"), flag it as malicious
         const isMalicious = Object.values(riskData.result).some(val => val === "1");
         if (isMalicious) targetRisk = 'Critical Risk';
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
  // 1. Return null early if no address
  if (!address) return null; 

  try {
    const response = await fetch(`/restpp/graph/ChainTrustGraph/vertices/Wallet/${address}`, {
      headers: { 'Authorization': `Bearer ${TG_TOKEN}` }
    });
    const data = await response.json();
    
    // 2. Safely check if results exist before accessing index 0
    if (data.error || !data.results || !data.results[0]) {
      return null;
    }

    return data.results[0].attributes;
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
    // FIX: Changed ?wallet= to ?wallet_id= to match the GSQL query parameter
    const response = await fetch(`/restpp/query/ChainTrustGraph/generate_ai_explanation?wallet_id=${address}`, {
      headers: { 'Authorization': `Bearer ${TG_TOKEN}` }
    });
    const data = await response.json();
    return data.results[0].explanations || ["No analysis available for this wallet."];
  } catch (error) {
    console.error('Failed to fetch AI explanations:', error);
    return ["TigerGraph connection failed. Unable to generate explanation."];
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