# ChainTrust ⛓️

**ChainTrust** is an AI-powered blockchain threat intelligence platform. Built for the **TigerGraph Track**, it leverages the speed and deep-link analytics of TigerGraph to follow money trails, expose scam clusters, and identify Sybil funding patterns in real-time. 

## 🏆 TigerGraph Hackathon Alignment

ChainTrust perfectly aligns with the TigerGraph Track requirements by utilizing graph technology where it shines most:
* **Following Money Trails:** Traversing multi-hop blockchain transactions to see where funds originate and where they end up.
* **Fraud & Threat Detection:** Identifying circular transaction loops (wash trading) and tracing 1-to-many funding patterns (Sybil attacks).
* **AI Synergy:** Taking the fast, complex network patterns found by TigerGraph and feeding them into GPT-4o to generate easy-to-understand risk assessments for end users.

## 🚀 Features

* **Real-Time Graph Traversal:** 3-hop and beyond transaction analysis powered by TigerGraph.
* **Interactive Visualization:** Explore wallet nodes, smart contracts, and token flows using a Cytoscape.js interface.
* **AI Risk Explainer:** Automated, readable breakdowns of a wallet's risk profile based on its graph topology.
* **Trust Scoring System:** Algorithmic risk scoring based on proximity to known scam hubs, transaction diversity, and age.

## 💻 Tech Stack

* **Main Database:** TigerGraph (Community Edition / Savanna)
* **Frontend:** React, Vite, Tailwind CSS
* **Graph Visualization:** Cytoscape.js
* **AI Analysis:** GPT-4o (OpenAI)

## 🛠️ Local Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Connect to TigerGraph:
- Update your TigerGraph REST endpoints and credentials in `/src/services/tigergraph.js` and `.env`
4. Run the development server:
    ```bash
    npm run dev
    ```

## 🧠 Why TigerGraph?
Traditional relational databases struggle to execute multi-hop queries (e.g., "Find all wallets that received funds from Wallet A, and then interacted with Tornado Cash within 3 hops"). TigerGraph allows ChainTrust to execute these deep-link threat detection queries in milliseconds, making real-time Web3 security a reality.