import { useState, useCallback, useEffect } from 'react'
import GraphView from './components/GraphView'
import NodeInspector from './components/NodeInspector'
import AIExplainer from './components/AIExplainer'
import SearchBar from './components/SearchBar'
import TrustScoreRing from './components/TrustScoreRing'
import { fetchWalletGraph, fetchWalletProfile, syncWalletTransactions } from './services/neo4j'
import Neo4jWorkspace from './components/Neo4jWorkspace'

const FILTER_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'SAFE']

export default function App() {
  const [selectedNode, setSelectedNode] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [graphFilter, setGraphFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState('inspector') 
  const [searchedAddress, setSearchedAddress] = useState('')
  const [graphKey, setGraphKey] = useState(0)
  
  const [graphElements, setGraphElements] = useState({ nodes: [], edges: [] })
  const [targetProfile, setTargetProfile] = useState({})
  
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false)

  const handleNodeSelect = useCallback(async (nodeData) => {
    if (!nodeData) {
      setSelectedNode(null);
      return;
    }

    setSelectedNode(nodeData);

    try {
      const fullProfile = await fetchWalletProfile(nodeData.address);
      
      if (fullProfile) {
        setSelectedNode(prev => {
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
      
      const targetGraphNode = tgGraphData?.nodes.find(n => n.data.id === normalizedAddress)?.data;
      console.log("Fetched target graph node:", targetGraphNode);
      
      const mergedProfile = {
        ...tgProfileData,
        ...targetGraphNode
      };
      console.log("Merged profile data:", mergedProfile);
      
      setGraphElements(tgGraphData || { nodes: [], edges: [] })
      setTargetProfile(mergedProfile || {})
      setSelectedNode(mergedProfile || null)
    } catch (error) {
      console.error("Failed to fetch Neo4j data:", error)
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
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col font-hud bg-transparent">
      {/* Header */}
      <header className="flex-shrink-0 border-b-4 border-black bg-black/95 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-16 md:h-24 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="ChainTrust Logo" 
              className="w-10 md:h-12 object-contain drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" 
            />
            <span className="text-xl md:text-3xl font-gta text-white tracking-widest drop-shadow-md" style={{ WebkitTextStroke: '1px black' }}>
              CHAINTRUST
            </span>
          </div>

          {/* Desktop Search */}
          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Neo4jWorkspace />
            <div className="hidden sm:flex items-center gap-2 text-[12px] font-black text-gta-green bg-black border-2 border-gray-700 px-3 py-1 uppercase tracking-widest shadow-inner">
              <span className="w-2 h-2 border border-black bg-gta-green animate-pulse" />
              ETH
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar */}
      <div className="md:hidden p-3 border-b-4 border-black bg-black/90">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* Sub-header (Target Status) */}
      <div className="flex-shrink-0 border-b-4 border-black bg-black/80 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="text-left min-w-0">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Active Target</p>
              <p className="text-[12px] md:text-sm font-black text-white uppercase tracking-widest truncate max-w-[150px] md:max-w-[300px]">
                {searchedAddress || 'NO TARGET ACQUIRED'}
              </p>
            </div>
          </div>
          <div className="ml-4">
            <TrustScoreRing score={targetProfile.trustScore || 0} risk={targetProfile.risk || 'UNKNOWN'} size={50} />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-6 flex flex-col md:flex-row gap-6 min-h-0">
        
        {/* Left Side: Graph Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          
          {/* Radar Filters */}
          <div className="flex items-center gap-4 flex-wrap bg-black/60 p-3 border-2 border-gray-800">
            <span className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">Radar Filters:</span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setGraphFilter(f === graphFilter ? 'ALL' : f)}
                  className={`text-[11px] px-4 py-1.5 border-2 font-bold uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${
                    graphFilter === f
                      ? 'bg-white border-white text-black'
                      : 'bg-black border-gray-700 text-gray-400 hover:border-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Graph Container */}
          <div className="h-[450px] md:h-full md:flex-1 relative">
            {isLoading ? (
              <div className="w-full h-full bg-gta-hudBase border-4 border-black flex flex-col items-center justify-center gap-8 shadow-[0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                <div className="text-center relative z-10">
                  <h2 className="font-gta text-5xl text-white tracking-widest animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ WebkitTextStroke: '2px black' }}>SCANNING</h2>
                  <p className="text-xs text-gta-green font-bold uppercase tracking-widest mt-3 bg-black px-4 py-1 border border-gta-green inline-block">Traversing Network · 3-Hop Radius</p>
                </div>
                
                <div className="flex flex-col gap-3 w-72 relative z-10 bg-black/80 p-4 border-2 border-gray-800">
                  {['Locating Subject', 'Tracing Connections', 'Assessing Threat Levels', 'Running Profiler'].map((step, i) => (
                    <div key={step} className="flex items-center justify-between border-b-2 border-gray-900 pb-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{step}</span>
                      <div className="w-3 h-3 border border-black bg-gta-green animate-ping" style={{ animationDelay: `${i * 0.2}s` }} />
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
        <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col gap-4">
          <div className="flex gap-2 bg-black border-4 border-black p-1 flex-shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            {[
              { id: 'inspector', label: 'TARGET INFO' },
              { id: 'ai', label: 'FIB DOSSIER' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all border-2 ${
                  activeTab === id 
                    ? 'bg-white text-black border-white' 
                    : 'bg-gray-900 text-gray-500 hover:text-white border-gray-800 hover:border-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-[450px] md:flex-1 min-h-0 overflow-hidden relative">
            {activeTab === 'inspector' ? (
              <NodeInspector wallet={selectedNode} onClose={() => setSelectedNode(null)} />
            ) : (
              <AIExplainer wallet={selectedNode} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}