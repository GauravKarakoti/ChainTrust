import { useState, useEffect, useRef } from 'react'
import { fetchAIExplanations } from '../services/neo4j'

function parseMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-gta-green">$1</strong>')
}

export default function AIExplainer({ wallet }) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [explanationIndex, setExplanationIndex] = useState(0)
  const [explanations, setExplanations] = useState([])
  const timerRef = useRef(null)
  const fullTextRef = useRef('')

  const typeText = (text) => {
    setDisplayedText('')
    setIsTyping(true)
    fullTextRef.current = text
    let i = 0
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      i++
      setDisplayedText(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timerRef.current)
        setIsTyping(false)
      }
    }, 18)
  }

  useEffect(() => {
    if (!wallet) return;
    
    let isMounted = true;
    
    async function loadExplanations() {
      const data = await fetchAIExplanations(wallet.address || wallet.id || wallet.short);
      if (!isMounted) return;
      setExplanations(data);
      setExplanationIndex(0);
      typeText(data[0] || "Analysis complete. Review wallet flags.");
    }
    
    loadExplanations();
    
    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [wallet])

  const handleNext = () => {
    if (!wallet || explanations.length === 0) return
    const next = (explanationIndex + 1) % explanations.length
    setExplanationIndex(next)
    typeText(explanations[next])
  }

  const handleSkip = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setDisplayedText(fullTextRef.current)
    setIsTyping(false)
  }

  const riskColorClass = {
    CRITICAL: 'text-gta-red',
    HIGH: 'text-orange-500',
    MEDIUM: 'text-amber-500',
    LOW: 'text-slate-300',
    SAFE: 'text-gta-green',
  }

  if (!wallet) {
    return (
      <div className="bg-gta-hudBase border-4 border-black shadow-[0_0_15px_rgba(0,0,0,0.8)] p-5 h-full flex flex-col font-hud">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 border border-black bg-gray-500 animate-pulse" />
          <h3 className="text-2xl font-gta text-white tracking-widest" style={{ WebkitTextStroke: '1px black' }}>FIB DOSSIER</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-lg font-bold uppercase tracking-widest">No target selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gta-hudBase border-4 border-black shadow-[0_0_15px_rgba(0,0,0,0.8)] p-5 flex flex-col h-full font-hud">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0 border-b-4 border-black pb-3">
        <div className={`w-4 h-4 border-2 border-black ${isTyping ? 'animate-pulse bg-gta-red' : 'bg-gta-green'}`} />
        <h3 className="text-2xl font-gta text-white tracking-widest" style={{ WebkitTextStroke: '1px black' }}>LCPD PROFILER</h3>
        <span className="ml-auto text-[10px] bg-black text-white font-bold border-2 border-gray-700 px-2 py-1 uppercase tracking-widest">Network: Groq</span>
      </div>

      {/* Wallet context */}
      <div className="bg-black/60 border-2 border-gray-800 p-3 mb-4 flex items-center gap-4 flex-shrink-0">
        <div className="w-10 h-10 bg-gray-900 border-2 border-black shadow-[0_0_5px_rgba(255,255,255,0.3)] flex items-center justify-center text-lg text-white font-bold">
          {wallet.type === 'contract' ? 'C' : 'W'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white uppercase tracking-wider truncate">{wallet.label || wallet.short}</p>
          <p className="text-[11px] mono text-gray-500 truncate">{wallet.short}</p>
        </div>
        <span className={`text-2xl font-gta tracking-widest ${riskColorClass[wallet.risk] || 'text-white'}`} style={{ WebkitTextStroke: '1px black' }}>
          {wallet.risk}
        </span>
      </div>

      {/* Analysis text */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-black/80 border-l-4 border-l-gta-blue p-4 min-h-[120px] relative mb-4">
          <p className="text-[12px] text-gta-blue font-bold uppercase tracking-widest mb-2">Subject Analysis</p>
          <p
            className={`text-sm text-gray-200 font-medium leading-relaxed ${isTyping ? 'cursor-blink' : ''}`}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(displayedText) }}
          />
        </div>

        {/* Verdict */}
        {!isTyping && (
          <div className={`mt-3 p-3 flex items-start gap-4 border-2 shadow-lg ${
            wallet.risk === 'SAFE' || wallet.risk === 'LOW'
              ? 'bg-gta-green/20 border-gta-green'
              : wallet.risk === 'MEDIUM'
              ? 'bg-orange-500/20 border-orange-500'
              : 'bg-gta-red/20 border-gta-red'
          }`}>
            <span className="text-3xl flex-shrink-0 drop-shadow-md">
              {wallet.risk === 'SAFE' || wallet.risk === 'LOW' ? '✅' : wallet.risk === 'MEDIUM' ? '⚠️' : '💀'}
            </span>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest">
                {wallet.risk === 'SAFE' || wallet.risk === 'LOW'
                  ? 'Verdict: Cleared'
                  : wallet.risk === 'MEDIUM'
                  ? 'Verdict: Keep on Radar'
                  : 'Verdict: Shoot on Sight'}
              </p>
              <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">
                Threat Level: <span className="text-white">{wallet.trustScore || 0}/100</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-4 flex-shrink-0">
        {isTyping ? (
          <button onClick={handleSkip}
            className="flex-1 py-3 text-xs bg-black hover:bg-white border-2 border-gray-700 hover:border-black text-gray-400 hover:text-black font-bold uppercase tracking-widest transition-all">
            Skip Transmission
          </button>
        ) : (
          <>
            {explanations.length > 1 && (
              <button onClick={handleNext}
                className="flex-1 py-3 text-xs bg-black hover:bg-white border-2 border-gray-700 hover:border-black text-white hover:text-black font-bold uppercase tracking-widest transition-all">
                Next Intel ({explanationIndex + 1}/{explanations.length})
              </button>
            )}
            {explanations.length > 0 && (
              <button onClick={() => typeText(explanations[explanationIndex])}
                className="py-3 px-6 text-xs bg-gta-blue/20 hover:bg-gta-blue border-2 border-gta-blue text-gta-blue hover:text-white font-bold uppercase tracking-widest transition-all">
                ↺ Replay
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}