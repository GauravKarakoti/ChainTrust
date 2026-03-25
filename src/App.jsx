import { useState, useCallback, useEffect } from 'react'
import GraphView from './components/GraphView'
import NodeInspector from './components/NodeInspector'
import AIExplainer from './components/AIExplainer'
import AlertsPanel from './components/AlertsPanel'
import SearchBar from './components/SearchBar'
import TrustScoreRing from './components/TrustScoreRing'
import { fetchWalletGraph, fetchWalletProfile, syncWalletTransactions } from './services/tigergraph'

const FILTER_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'SAFE']

const STATS = [
  { label: 'Wallets Analyzed', value: '2.4M', change: '+12k today', up: true },
  { label: 'Scam Clusters', value: '8,431', change: '+23 today', up: false },
  { label: 'Flagged Txs', value: '142K', change: '+891 today', up: false },
  { label: 'Avg Response', value: '120ms', change: 'TigerGraph', up: true },
]

export default function App() {
  const [selectedNode, setSelectedNode] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // Start loading on mount
  const [graphFilter, setGraphFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState('inspector') 
  const [searchedAddress, setSearchedAddress] = useState('')
  const [graphKey, setGraphKey] = useState(0)
  
  // NEW: State for TigerGraph data
  const [graphElements, setGraphElements] = useState({ nodes: [], edges: [] })
  const [targetProfile, setTargetProfile] = useState({})
  
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false)

  const handleNodeSelect = useCallback(async (nodeData) => {
    if (!nodeData) {
      setSelectedNode(null);
      return;
    }

    // Instantly set shallow data from the graph so the UI reacts immediately
    setSelectedNode(nodeData);

    try {
      // Fetch the deep profile to get trustScore, balance, tags, etc.
      const fullProfile = await fetchWalletProfile(nodeData.address);
      
      if (fullProfile) {
        setSelectedNode(prev => {
          // Check to ensure the user hasn't clicked a different node while fetching
          if (prev && prev.address === nodeData.address) {
            return { ...prev, ...fullProfile };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Failed to fetch deep profile:", err);
    }
  }, []);

  const handleSearch = useCallback(async (address) => {
    // 1. Normalize the address to match TigerGraph's stored lowercase IDs
    const normalizedAddress = address.toLowerCase();
    
    setIsLoading(true)
    setSelectedNode(null)
    setSearchedAddress(normalizedAddress) // Use normalized here so the UI reflects it
    
    try {
      // 2. Pass the normalized address to ALL your service calls
      await syncWalletTransactions(normalizedAddress);

      // Now TigerGraph will correctly match the Vertex IDs
      const tgGraphData = await fetchWalletGraph(normalizedAddress)
      const tgProfileData = await fetchWalletProfile(normalizedAddress)
      
      setGraphElements(tgGraphData || { nodes: [], edges: [] })
      setTargetProfile(tgProfileData || {})
      setSelectedNode(tgProfileData || null)
    } catch (error) {
      console.error("Failed to fetch TigerGraph data:", error)
      setGraphElements({ nodes: [], edges: [] })
      setTargetProfile({})
    } finally {
      setIsLoading(false)
      setGraphKey(k => k + 1)
    }
  }, [])

  useEffect(() => {
    if (searchedAddress) {
      handleSearch(searchedAddress)
    } else {
      setIsLoading(false) // Stop loading indicator if empty
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Top Nav */}
      <header className="flex-shrink-0 border-b border-[#1e2847] bg-dark-800/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-24 flex items-center gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
              ⛓
            </div>
            <span className="text-base font-bold gradient-text">ChainTrust</span>
            <span className="text-[10px] text-slate-600 border border-[#1e2847] px-1.5 py-0.5 rounded">v0.9 BETA</span>
          </div>

          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              TigerGraph Connected
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Ethereum Mainnet
            </div>
          </div>
        </div>
      </header>

      <div className="md:hidden p-3 border-b border-[#1e2847]">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* Stats Bar */}
      <div className="flex-shrink-0 border-b border-[#1e2847] bg-dark-800/40">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center gap-1 overflow-x-auto">
          {STATS.map(({ label, value, change, up }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-1 flex-shrink-0 border-r border-[#1e2847] last:border-0">
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest whitespace-nowrap">{label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold mono text-slate-200">{value}</span>
                  <span className={`text-[10px] ${up ? 'text-emerald-500' : 'text-red-500'}`}>{change}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="ml-auto flex items-center gap-3 px-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">Analyzing</p>
              <p className="text-xs mono font-semibold text-slate-300 truncate max-w-[140px]">{searchedAddress}</p>
            </div>
            {/* UPDATED: Reference dynamic state instead of static mock */}
            <TrustScoreRing score={targetProfile.trustScore || 0} risk={targetProfile.risk || 'UNKNOWN'} size={44} />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-4 flex gap-4 min-h-[500px]">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[11px] text-slate-600 uppercase tracking-widest">Filter:</span>
            <div className="flex gap-1.5">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setGraphFilter(f === graphFilter ? 'ALL' : f)}
                  className={`text-[11px] px-3 py-1 rounded-lg border transition-all ${
                    graphFilter === f
                      ? 'bg-blue-900/50 border-blue-700 text-blue-300'
                      : 'bg-dark-800 border-[#1e2847] text-slate-500 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-600">
              <span>Powered by</span>
              <span className="text-blue-400 font-semibold">TigerGraph</span>
              <span>·</span>
              <span className="text-purple-400 font-semibold">Cytoscape.js</span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="w-full h-full bg-dark-800 rounded-xl border border-[#1e2847] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-2 border-blue-900 rounded-full" />
                  <div className="absolute inset-0 w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-300">Scanning transaction graph...</p>
                  <p className="text-[11px] text-slate-600 mt-1">Traversing TigerGraph · 3-hop analysis</p>
                </div>
                <div className="flex gap-1.5">
                  {['Wallet nodes', 'Edge traversal', 'Risk scoring', 'AI analysis'].map((step, i) => (
                    <div key={step} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                      <span className="text-[10px] text-slate-600">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <GraphView
                key={graphKey}
                elements={graphElements}
                onNodeSelect={handleNodeSelect} // <-- Update this line
                selectedNode={selectedNode}
                filter={graphFilter}
              />
            )}
          </div>
        </div>

        <div className="w-80 flex-shrink-0 flex flex-col gap-4 min-h-0">
          <div className="flex gap-1 bg-dark-800 border border-[#1e2847] rounded-xl p-1 flex-shrink-0">
            {[
              { id: 'inspector', label: '🔍 Inspector' },
              { id: 'ai', label: '🤖 AI Analysis' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === id
                    ? 'bg-dark-700 text-white shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'inspector' ? (
              <div className="h-full bg-dark-800 border border-[#1e2847] rounded-xl overflow-hidden">
                <NodeInspector wallet={selectedNode} onClose={() => setSelectedNode(null)} />
              </div>
            ) : (
              <div className="h-full">
                <AIExplainer wallet={selectedNode} />
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="flex-shrink-0 max-w-[1600px] mx-auto w-full px-4 pb-4">
        <AlertsPanel 
          isExpanded={isAlertsExpanded} 
          onToggleExpand={() => setIsAlertsExpanded(!isAlertsExpanded)} 
        />
      </div>
    </div>
  )
}