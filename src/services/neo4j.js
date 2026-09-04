import neo4j from 'neo4j-driver';
import Groq from "groq-sdk";

const NEO4J_URI = import.meta.env.VITE_NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = import.meta.env.VITE_NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = import.meta.env.VITE_NEO4J_PASSWORD || '';
const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

export const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

export const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

export async function fetchWalletGraph(address) {
  if (!address) return { nodes: [], edges: [] };
  const lowerAddress = address.toLowerCase();
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (w:Wallet {address: $address})
       OPTIONAL MATCH (w)-[r:TRANSACTION]-(neighbor:Wallet)
       RETURN w AS target, collect(DISTINCT neighbor) AS neighbors, collect(DISTINCT r) AS rels`,
      { address: lowerAddress }
    );

    if (result.records.length === 0) return { nodes: [], edges: [] };

    const record = result.records[0];
    const targetNode = record.get('target');
    if (!targetNode) return { nodes: [], edges: [] };

    const nodesMap = new Map();

    const addNode = (node) => {
      if (!node || !node.properties) return;
      const props = node.properties;
      const addr = props.address;
      if (addr && !nodesMap.has(addr)) {
        nodesMap.set(addr, {
          data: {
            id: addr,
            label: props.short_address || addr.substring(0, 6),
            type: 'wallet',
            risk: (props.risk_level || 'UNKNOWN').toUpperCase().replace(' RISK', ''),
            threatSource: props.threat_source || 'Unknown',
            address: addr,
            short: props.short_address || addr.substring(0, 6)
          }
        });
      }
    };

    addNode(targetNode);

    const neighbors = record.get('neighbors') || [];
    neighbors.forEach(n => addNode(n));

    const rels = record.get('rels') || [];
    const edges = [];

    for (let i = 0; i < rels.length; i++) {
      const r = rels[i];
      const startResult = await session.run(
        `MATCH ()-[r:TRANSACTION]->() WHERE elementId(r) = $eid RETURN startNode(r).address AS source, endNode(r).address AS target`, 
        { eid: r.elementId }
      );
      if (startResult.records.length > 0) {
        const src = startResult.records[0].get('source');
        const tgt = startResult.records[0].get('target');
        edges.push({
          data: {
            id: r.elementId || `edge-${i}`,
            source: src,
            target: tgt,
            type: 'TRANSACTION',
            value: (r.properties?.amount || '0') + ' ETH'
          }
        });
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges
    };
  } catch (error) {
    console.error('Neo4j graph fetch error:', error);
    return { nodes: [], edges: [] };
  } finally {
    await session.close();
  }
}

export async function syncWalletTransactions(address) {
  if (!address) return;
  const lowerAddress = address.toLowerCase();

  try {
    const url = `/etherscan/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${ETHERSCAN_KEY}`;
    
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

    const uniqueAddresses = [...new Set(transactions.flatMap(tx => [tx.from, tx.to]))];
    const riskMap = {};

    const batchSize = 5;
    for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
      const batch = uniqueAddresses.slice(i, i + batchSize);
      await Promise.all(batch.map(async (addr) => {
        try {
          const riskRes = await fetch(`/goplus/api/v1/address_security/${addr}?chain_id=1`);
          const riskData = await riskRes.json();
          
          // Trap rate limiting instead of treating as SAFE
          if (riskData.code === 4029 || riskData.message === 'too many requests' || riskRes.status === 429) {
            console.warn(`⚠️ GoPlus Rate Limited for ${addr} (code 4029)`);
            riskMap[addr] = { risk: 'RATE_LIMITED', source: 'GoPlus API (Rate Limited 4029)' };
            return;
          }

          let isContract = false;
          let isMalicious = false;
          if (riskData.result) {
            const flags = riskData.result[addr] || riskData.result[addr.toLowerCase()] || riskData.result;
            isContract = String(flags.contract_address) === "1";
            
            const threatKeys = [
              'phishing_activities', 'stealing_attack', 'money_laundering', 
              'cybercrime', 'financial_crime', 'sanctioned', 'mixer', 
              'blacklist_doubt', 'honeypot_related_address', 'blackmail_activities', 'gas_abuse'
            ];
            
            isMalicious = threatKeys.some(key => String(flags[key]) === "1");
          }
          
          riskMap[addr] = {
            risk: isMalicious ? 'CRITICAL' : 'SAFE',
            isContract: isContract,
            source: isMalicious ? 'GoPlus Threat Detection' : (isContract ? 'Verified Contract' : 'GoPlus Static Scan')
          };
        } catch (apiError) {
          console.warn(`GoPlus Risk API failed for ${addr}:`, apiError);
          riskMap[addr] = { risk: 'UNKNOWN', source: 'Scan Failed' };
        }
      }));
    }

    await upsertGraphData(transactions, riskMap);
    await applyDynamicGraphRisk();

    console.log(`✅ Synced ${transactions.length} transactions and mapped dynamic risks for ${address}`);
    
  } catch (error) {
    console.error('Failed to sync blockchain data:', error);
  }
}

export async function upsertGraphData(transactions, riskMap = {}) {
  const session = driver.session();
  try {
    for (const tx of transactions) {
      const fromEntry = typeof riskMap[tx.from] === 'object' 
        ? riskMap[tx.from] 
        : { risk: riskMap[tx.from] || 'UNKNOWN', source: 'Static Scan' };

      const toEntry = typeof riskMap[tx.to] === 'object' 
        ? riskMap[tx.to] 
        : { risk: riskMap[tx.to] || 'UNKNOWN', source: 'Static Scan' };

      await session.run(
        `MERGE (f:Wallet {address: $from})
         ON CREATE SET f.short_address = $fromShort, 
                       f.risk_level = $fromRisk, 
                       f.threat_source = $fromSource
         ON MATCH SET f.risk_level = CASE 
                        WHEN $fromRisk = 'CRITICAL' THEN 'CRITICAL'
                        WHEN $fromRisk = 'RATE_LIMITED' AND NOT f.risk_level IN ['CRITICAL', 'HIGH'] THEN 'RATE_LIMITED'
                        WHEN $fromRisk = 'SAFE' AND f.risk_level IN ['UNKNOWN', 'RATE_LIMITED'] THEN 'SAFE'
                        ELSE f.risk_level END,
                      f.threat_source = CASE 
                        WHEN $fromRisk = 'CRITICAL' THEN $fromSource
                        WHEN $fromRisk = 'RATE_LIMITED' AND NOT f.risk_level IN ['CRITICAL', 'HIGH'] THEN $fromSource
                        ELSE f.threat_source END
         
         MERGE (t:Wallet {address: $to})
         ON CREATE SET t.short_address = $toShort, 
                       t.risk_level = $toRisk, 
                       t.threat_source = $toSource
         ON MATCH SET t.risk_level = CASE 
                        WHEN $toRisk = 'CRITICAL' THEN 'CRITICAL'
                        WHEN $toRisk = 'RATE_LIMITED' AND NOT t.risk_level IN ['CRITICAL', 'HIGH'] THEN 'RATE_LIMITED'
                        WHEN $toRisk = 'SAFE' AND t.risk_level IN ['UNKNOWN', 'RATE_LIMITED'] THEN 'SAFE'
                        ELSE t.risk_level END,
                      t.threat_source = CASE 
                        WHEN $toRisk = 'CRITICAL' THEN $toSource
                        WHEN $toRisk = 'RATE_LIMITED' AND NOT t.risk_level IN ['CRITICAL', 'HIGH'] THEN $toSource
                        ELSE t.threat_source END
         
         MERGE (f)-[r:TRANSACTION {amount: $amount}]->(t)`,
        {
          from: tx.from,
          fromShort: tx.from.substring(0, 6),
          fromRisk: fromEntry.risk,
          fromSource: fromEntry.source,
          to: tx.to,
          toShort: tx.to.substring(0, 6),
          toRisk: toEntry.risk,
          toSource: toEntry.source,
          amount: tx.value
        }
      );
    }
  } catch (error) {
    console.error("Neo4j Ingestion Failed:", error);
  } finally {
    await session.close();
  }
}

export async function applyDynamicGraphRisk() {
  const session = driver.session();
  try {
    // Escalate risk to MEDIUM (Victim/Exposure tier) if connected to a CRITICAL node.
    // This prevents innocent victims from being flagged as HIGH/CRITICAL attackers themselves.
    const query = `
      MATCH (malicious:Wallet)-[:TRANSACTION]-(target:Wallet)
      WHERE malicious.risk_level = 'CRITICAL' 
        AND target.risk_level IN ['SAFE', 'UNKNOWN', 'RATE_LIMITED']
        AND coalesce(target.is_contract, false) = false
      SET target.risk_level = 'MEDIUM',
          target.threat_source = 'Graph Exposure (Transacted with CRITICAL node)'
      RETURN count(target) AS updatedCount
    `;
    
    const result = await session.run(query);
    const updatedCount = result.records[0].get('updatedCount').toNumber();
    
    if (updatedCount > 0) {
      console.log(`Dynamically escalated risk to MEDIUM for ${updatedCount} exposed wallets.`);
    }
  } catch (error) {
    console.error("Failed to apply dynamic graph risk:", error);
  } finally {
    await session.close();
  }
}

export async function fetchWalletProfile(address) {
  if (!address) return null;
  const lowerAddress = address.toLowerCase();
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (w:Wallet {address: $address}) RETURN w`,
      { address: lowerAddress }
    );

    if (result.records.length === 0) return null;

    const node = result.records[0].get('w');
    const attributes = node.properties;
    const risk = (attributes.risk_level || 'UNKNOWN').toUpperCase().replace(' RISK', '');
    
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
      } else if (risk === 'RATE_LIMITED' || risk === 'UNKNOWN') {
        trustScore = 50; // Neutral unverified state
      } else {
        trustScore = Math.max(5, 20 + variance);
      }
    }

    return {
      ...attributes,
      address: lowerAddress,
      short: attributes.short_address || lowerAddress.substring(0, 6),
      risk,
      trustScore,
      threatSource: attributes.threat_source || 'Static Scan'
    };
  } catch (error) {
    console.error('Neo4j profile error:', error);
    return null;
  } finally {
    await session.close();
  }
}

export async function fetchPresetWallets() {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (w:Wallet) WHERE w.risk_level IN ['CRITICAL', 'HIGH', 'SAFE', 'RATE_LIMITED'] RETURN w.address AS address, w.risk_level AS risk, w.short_address AS label LIMIT 6`
    );
    return result.records.map(record => ({
      address: record.get('address'),
      risk: (record.get('risk') || 'UNKNOWN').toUpperCase(),
      label: record.get('label') || record.get('address').substring(0, 6)
    }));
  } catch (error) {
    console.error('Failed to fetch presets from Neo4j:', error);
    return [];
  } finally {
    await session.close();
  }
}

export async function fetchAIExplanations(address) {
  const session = driver.session();
  const lowerAddress = address.toLowerCase();

  try {
    const result = await session.run(
      `MATCH (w:Wallet {address: $address})
       OPTIONAL MATCH (w)-[r:TRANSACTION]-(neighbor:Wallet)
       RETURN w.risk_level AS base_risk, 
              w.threat_source AS threat_source,
              count(r) AS total_txs, 
              sum(CASE WHEN neighbor.risk_level IN ['CRITICAL', 'HIGH'] THEN 1 ELSE 0 END) AS flagged_txs`,
      { address: lowerAddress }
    );

    let base_risk = "UNKNOWN";
    let threat_source = "Static Scan";
    let total_txs = 0;
    let flagged_txs = 0;

    if (result.records.length > 0) {
      const rec = result.records[0];
      base_risk = rec.get('base_risk') || "UNKNOWN";
      threat_source = rec.get('threat_source') || "Static Scan";
      total_txs = neo4j.isInt(rec.get('total_txs')) ? rec.get('total_txs').toNumber() : Number(rec.get('total_txs') || 0);
      flagged_txs = neo4j.isInt(rec.get('flagged_txs')) ? rec.get('flagged_txs').toNumber() : Number(rec.get('flagged_txs') || 0);
    }

    const riskRatio = total_txs > 0 ? ((flagged_txs / total_txs) * 100).toFixed(1) : 0;

    if (!groq) {
      return [`Metrics: ${base_risk} risk, ${total_txs} txs.`, "Add VITE_GROQ_API_KEY to enable AI."];
    }

    const prompt = `You are a cybersecurity blockchain analyst. Analyze this wallet: ${address}.

    Metrics:
    - Risk Score: ${base_risk}
    - Threat Origin: ${threat_source}
    - Total Transactions (recent window): ${total_txs}
    - Flagged Transactions: ${flagged_txs}
    - Exposure Ratio: ${riskRatio}%

    Important context:
    - If Risk Score is RATE_LIMITED, explicitly warn that external security APIs encountered rate limiting (HTTP 429 / Code 4029), meaning direct threat verification was incomplete.
    - Historical malicious activity may not appear in recent transaction counts.

    Instructions:
    - Base your reasoning primarily on flagged transactions, threat origin, and exposure ratio.
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
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(completion.choices[0]?.message.content || '{"explanations": []}');
    
    return content.explanations && content.explanations.length > 0 
      ? content.explanations 
      : ["Analysis complete. Threat verification status updated."];

  } catch (error) {
    console.error('Failed to generate AI explanation with Neo4j:', error);
    return ["Neo4j metrics processed, but AI generation failed. Please check console."];
  } finally {
    await session.close();
  }
}