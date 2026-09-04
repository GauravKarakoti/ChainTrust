# ChainTrust ⛓️

**ChainTrust** is an AI-powered blockchain threat intelligence platform. Built for the **Neo4j Track**, it leverages the speed and deep-link analytics of Neo4j to follow money trails, expose scam clusters, and identify Sybil funding patterns in real-time. 

## 🏆 Neo4j Hackathon Alignment

ChainTrust perfectly aligns with the Neo4j Track requirements by utilizing graph technology where it shines most:
* **Following Money Trails:** Traversing multi-hop blockchain transactions to see where funds originate and where they end up.
* **Fraud & Threat Detection:** Identifying circular transaction loops (wash trading) and tracing 1-to-many funding patterns (Sybil attacks).
* **AI Synergy:** Taking the fast, complex network patterns found by Neo4j and feeding them into Groq to generate easy-to-understand risk assessments for end users.

## 🚀 Features

* **Real-Time Graph Traversal:** 3-hop and beyond transaction analysis powered by Neo4j.
* **Interactive Visualization:** Explore wallet nodes, smart contracts, and token flows using a Cytoscape.js interface.
* **AI Risk Explainer:** Automated, readable breakdowns of a wallet's risk profile based on its graph topology.
* **Trust Scoring System:** Algorithmic risk scoring based on proximity to known scam hubs, transaction diversity, and age.

## 💻 Tech Stack

* **Main Database:** Neo4j (Community Edition / AuraDB)
* **Frontend:** React, Vite, Tailwind CSS
* **Graph Visualization:** Cytoscape.js
* **AI Analysis:** Groq

## 🛠️ Local Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Connect to Neo4j:
- Update your Neo4j REST endpoints and credentials in `/src/services/neo4j.js` and `.env`
4. Run the development server:
    ```bash
    npm run dev
    ```

## 🧠 Why Neo4j?
Traditional relational databases struggle to execute multi-hop queries (e.g., "Find all wallets that received funds from Wallet A, and then interacted with Tornado Cash within 3 hops"). Neo4j allows ChainTrust to execute these deep-link threat detection queries in milliseconds, making real-time Web3 security a reality.