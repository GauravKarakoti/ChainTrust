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
      console.error("Failed to fetch graph data:", error)
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
    <div className="min-h-screen flex flex-col font-pixel bg-transparent">
      <header className="flex-shrink-0 border-b-4 border-black bg-obsidian shadow-block sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-20 md:h-24 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <img src="/logo.png" alt="ChainTrust" className="w-10 md:h-12 object-contain" />
            <span className="text-xl md:text-2xl font-block text-white tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
              CHAINTRUST
            </span>
          </div>

          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Neo4jWorkspace />
            <div className="hidden sm:flex items-center gap-2 text-[16px] font-pixel text-creeper bg-obsidian border-4 border-black shadow-block px-3 py-1 uppercase">
              <span className="w-3 h-3 border-2 border-black bg-creeper animate-pulse" />
              ETH
            </div>
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 border-b-4 border-black bg-obsidian/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="text-left min-w-0">
              <p className="text-[14px] text-cobblestone uppercase mb-1 drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">TARGET ENTITY</p>
              <p className="text-[18px] md:text-xl font-block text-white uppercase truncate max-w-[150px] md:max-w-[300px] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                {searchedAddress || 'AWAITING SPAWN'}
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
          <div className="flex items-center gap-4 flex-wrap bg-obsidian p-3 border-4 border-black shadow-block">
            <span className="text-[16px] text-cobblestone uppercase">SORT BY:</span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setGraphFilter(f === graphFilter ? 'ALL' : f)}
                  className={`text-[16px] px-4 py-1.5 border-4 transition-all shadow-block-sm whitespace-nowrap ${
                    graphFilter === f
                      ? 'bg-pumpkin border-black text-black'
                      : 'bg-obsidian border-black text-cobblestone hover:bg-cobblestone hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[450px] md:h-full md:flex-1 relative border-4 border-black shadow-block">
            {isLoading ? (
              <div className="w-full h-full bg-obsidian flex flex-col items-center justify-center gap-8 relative overflow-hidden">
                <div className="text-center relative z-10">
                  <h2 className="font-block text-3xl text-white drop-shadow-[4px_4px_0_rgba(0,0,0,1)] animate-pulse">MINING DATA</h2>
                  <p className="text-lg text-creeper uppercase mt-3 bg-black px-4 py-2 border-4 border-creeper inline-block shadow-block">
                    Spawning Wither Protocol 💀
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 w-80 relative z-10 bg-obsidian p-4 border-4 border-black shadow-block">
                  {['Generating Chunks', 'Tracking Endermen', 'Brewing Potions', 'Lighting Portals'].map((step, i) => (
                    <div key={step} className="flex items-center justify-between border-b-4 border-black pb-2">
                      <span className="text-[16px] text-cobblestone uppercase">{step}</span>
                      <div className="w-3 h-3 border-2 border-black bg-pumpkin animate-ping" style={{ animationDelay: `${i * 0.2}s` }} />
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
          <div className="flex gap-2 bg-obsidian border-4 border-black p-2 flex-shrink-0 shadow-block">
            {[
              { id: 'inspector', label: 'ENTITY STATS' },
              { id: 'ai', label: "WITCH'S GRIMOIRE" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3 text-[16px] font-pixel uppercase transition-all border-4 shadow-block-sm ${
                  activeTab === id 
                    ? 'bg-pumpkin text-black border-black' 
                    : 'bg-obsidian text-cobblestone hover:text-white border-black'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-[450px] md:flex-1 min-h-0 overflow-hidden relative shadow-block">
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