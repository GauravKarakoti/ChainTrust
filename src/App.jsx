import { useState, useCallback, useEffect } from 'react'
import GraphView from './components/GraphView'
import NodeInspector from './components/NodeInspector'
import AIExplainer from './components/AIExplainer'
import AlertsPanel from './components/AlertsPanel'
import SearchBar from './components/SearchBar'
import TrustScoreRing from './components/TrustScoreRing'
import { fetchWalletGraph, fetchWalletProfile, syncWalletTransactions } from './services/tigergraph'
import TigerGraphWorkspace from './components/TigerGraphWorkspace'

const FILTER_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'SAFE']

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
    const normalizedAddress = address.toLowerCase();
    
    setIsLoading(true)
    setSelectedNode(null)
    setSearchedAddress(normalizedAddress) 
    
    try {
      await syncWalletTransactions(normalizedAddress);

      const tgGraphData = await fetchWalletGraph(normalizedAddress)
      const tgProfileData = await fetchWalletProfile(normalizedAddress)
      
      // NEW: Extract the target node from the graph to inherit its calculated `risk`
      const targetGraphNode = tgGraphData?.nodes.find(n => n.data.id === normalizedAddress)?.data;
      
      // NEW: Merge profile attributes with graph node data
      const mergedProfile = {
        ...tgProfileData,
        ...targetGraphNode
      };
      
      setGraphElements(tgGraphData || { nodes: [], edges: [] })
      setTargetProfile(mergedProfile || {})
      setSelectedNode(mergedProfile || null)
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
      {/* Header: Prevent overflow on mobile */}
      <header className="flex-shrink-0 border-b border-[#1e2847] bg-dark-800/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-16 md:h-24 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-1.5 md:gap-2.5 flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="ChainTrust Logo" 
              className="w-10 md:h-10 object-contain" 
            />
            <span className="text-sm md:text-base font-bold gradient-text">ChainTrust</span>
          </div>

          {/* Desktop Search */}
          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {/* Status Indicators: Visible and compact on mobile */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <TigerGraphWorkspace />
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] md:text-[11px] text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              ETH
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar */}
      <div className="md:hidden p-3 border-b border-[#1e2847] bg-dark-800">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* Sub-header */}
      <div className="flex-shrink-0 border-b border-[#1e2847] bg-dark-800/40">
        <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-left min-w-0">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">Analyzing</p>
              <p className="text-[11px] md:text-xs mono font-semibold text-slate-300 truncate max-w-[150px] md:max-w-[200px]">
                {searchedAddress || 'None'}
              </p>
            </div>
          </div>
          <TrustScoreRing score={targetProfile.trustScore || 0} risk={targetProfile.risk || 'UNKNOWN'} size={44} />
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-4 flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* Left Side: Graph Area - FIXED HEIGHT ON MOBILE */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] text-slate-600 uppercase tracking-widest">Filter:</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setGraphFilter(f === graphFilter ? 'ALL' : f)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap ${
                    graphFilter === f
                      ? 'bg-blue-900/50 border-blue-700 text-blue-300'
                      : 'bg-dark-800 border-[#1e2847] text-slate-500'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Graph Container: Fixed height h-[450px] on mobile is critical for rendering */}
          <div className="h-[450px] md:h-full md:flex-1 relative">
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
                onNodeSelect={handleNodeSelect}
                selectedNode={selectedNode}
                filter={graphFilter}
              />
            )}
          </div>
        </div>

        {/* Right Side: Tabbed Inspector */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="flex gap-1 bg-dark-800 border border-[#1e2847] rounded-xl p-1 flex-shrink-0">
            {[
              { id: 'inspector', label: '🔍 Inspector' },
              { id: 'ai', label: '🤖 AI Analysis' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === id ? 'bg-dark-700 text-white shadow' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-[450px] md:flex-1 min-h-0 overflow-hidden">
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

      {/* Footer: Alerts */}
      <div className="flex-shrink-0 max-w-[1600px] mx-auto w-full px-4 pb-4">
        <AlertsPanel 
          isExpanded={isAlertsExpanded} 
          onToggleExpand={() => setIsAlertsExpanded(!isAlertsExpanded)} 
        />
      </div>
    </div>
  )
}