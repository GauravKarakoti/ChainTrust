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

  const handleNodeSelect = useCallback(async (nodeData) => {
    if (!nodeData) {
      setSelectedNode(null);
      return;
    }

    setSelectedNode(nodeData);

    try {
      const fullProfile = await fetchWalletProfile(nodeData.address);
      if (fullProfile) {
        setSelectedNode(prev => (prev?.address === nodeData.address ? { ...prev, ...fullProfile } : prev));
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
      const mergedProfile = { ...tgProfileData, ...targetGraphNode };
      
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
      setIsLoading(false)
    }
  }, [handleSearch, searchedAddress])

  return (
    <div className="min-h-screen flex flex-col font-hud bg-transparent">
      <header className="flex-shrink-0 border-b-4 border-gray-800 bg-black sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-16 md:h-24 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <img src="/logo.png" alt="ChainTrust" className="w-10 md:h-12 object-contain" />
            <span className="text-xl md:text-3xl font-gta text-white tracking-widest" style={{ WebkitTextStroke: '1px black' }}>
              CHAINTRUST
            </span>
          </div>

          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Neo4jWorkspace />
            <div className="hidden sm:flex items-center gap-2 text-[12px] font-black text-gta-green bg-black border-2 border-gta-green px-3 py-1 uppercase tracking-widest">
              <span className="w-2 h-2 border border-black bg-gta-green animate-pulse" />
              ETH NET
            </div>
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 border-b-2 border-gray-800 bg-dark-900/90 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="text-left min-w-0">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">TARGET IDENTITY</p>
              <p className="text-[12px] md:text-sm font-black text-white uppercase tracking-widest truncate max-w-[150px] md:max-w-[300px]">
                {searchedAddress || 'AWAITING INPUT'}
              </p>
            </div>
          </div>
          <div className="ml-4">
            <TrustScoreRing score={targetProfile.trustScore || 0} risk={targetProfile.risk || 'UNKNOWN'} size={50} />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-6 flex flex-col md:flex-row gap-6 min-h-0">
        
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-4 flex-wrap bg-dark-800 p-3 border-2 border-gray-700">
            <span className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">FILTERS:</span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setGraphFilter(f === graphFilter ? 'ALL' : f)}
                  className={`text-[11px] px-4 py-1.5 border-2 font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                    graphFilter === f
                      ? 'bg-white border-white text-black'
                      : 'bg-black border-gray-600 text-gray-400 hover:border-white hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[450px] md:h-full md:flex-1 relative">
            {isLoading ? (
              <div className="w-full h-full bg-gta-hudBase border-4 border-gray-800 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
                <div className="text-center relative z-10">
                  <h2 className="font-gta text-5xl text-white tracking-widest animate-pulse" style={{ WebkitTextStroke: '2px black' }}>TRACING</h2>
                  <p className="text-xs text-hallow-orange font-bold uppercase tracking-widest mt-3 bg-black px-4 py-1 border border-hallow-orange inline-block shadow-[0_0_10px_rgba(255,117,24,0.3)]">
                    LSPD Nightmare Protocol Active 🎃
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 w-72 relative z-10 bg-black p-4 border-2 border-gray-700">
                  {['Pinging Node', 'Analyzing Risk Factors', 'Checking FIB Watchlist', 'Mapping Sub-Network'].map((step, i) => (
                    <div key={step} className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{step}</span>
                      <div className="w-2 h-2 bg-white animate-ping" style={{ animationDelay: `${i * 0.2}s` }} />
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

        <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col gap-4">
          <div className="flex gap-2 bg-black border-4 border-gray-800 p-1 flex-shrink-0">
            {[
              { id: 'inspector', label: 'TARGET STATS' },
              { id: 'ai', label: 'FIB DOSSIER' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all border-2 ${
                  activeTab === id 
                    ? 'bg-white text-black border-white' 
                    : 'bg-dark-900 text-gray-500 hover:text-white border-transparent'
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