const TG_TOKEN = import.meta.env.VITE_TG_TOKEN;

/**
 * Fetches the 3-hop transaction graph for a specific wallet address
 */
export async function fetchWalletGraph(address) {
  try {
    const response = await fetch(`/restpp/query/ChainTrustGraph/check_wallet_risk?target_wallet=${address}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TG_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    const nodes = data.results[0].Nodes.map(node => ({
      data: { 
        id: node.v_id, 
        label: node.attributes.short_address, 
        type: node.v_type.toLowerCase(), 
        risk: node.attributes.risk_level 
      }
    }));

    const edges = data.results[0].Edges.map(edge => ({
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

/**
 * Fetches the specific risk profile details for the inspector panel
 */
export async function fetchWalletProfile(address) {
  try {
    const response = await fetch(`/restpp/graph/ChainTrustGraph/vertices/Wallet/${address}`, {
      headers: { 'Authorization': `Bearer ${TG_TOKEN}` }
    });
    const data = await response.json();
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