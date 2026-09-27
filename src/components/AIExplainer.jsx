import { useState, useEffect, useRef } from 'react'
import { fetchAIExplanations } from '../services/neo4j'

function parseMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
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
      typeText(data[0] || "Seance complete. Review supernatural flags.");
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
    CRITICAL: 'text-pumpkin',
    HIGH: 'text-yellow-500',
    MEDIUM: 'text-creeper',
    LOW: 'text-cobblestone',
    SAFE: 'text-white',
  }

  if (!wallet) {
    return (
      <div className="bg-obsidian border-4 border-black p-5 h-full flex flex-col font-pixel">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-4 h-4 border-2 border-black bg-cobblestone" />
          <h3 className="text-2xl font-block text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">WITCH'S GRIMOIRE</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-cobblestone text-xl uppercase">No Soul Selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-obsidian border-4 border-black p-5 flex flex-col h-full font-pixel">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0 border-b-4 border-black pb-3">
        <div className={`w-4 h-4 border-2 border-black ${isTyping ? 'bg-pumpkin animate-pulse' : 'bg-creeper'}`} />
        <h3 className="text-xl md:text-2xl font-block text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">CURSE ANALYSIS</h3>
        <span className="ml-auto text-[14px] bg-black text-cobblestone border-2 border-black px-2 py-1 uppercase shadow-block-sm">Enchantment: Groq</span>
      </div>

      <div className="bg-black border-4 border-cobblestone p-3 mb-4 flex items-center gap-4 flex-shrink-0 shadow-block-sm">
        <div className="w-12 h-12 bg-obsidian border-4 border-black flex items-center justify-center text-xl text-white font-block">
          {wallet.type === 'contract' ? 'C' : 'E'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg text-white uppercase truncate drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">{wallet.label || wallet.short}</p>
          <p className="text-[14px] text-cobblestone truncate">{wallet.short}</p>
        </div>
        <span className={`text-2xl font-block ${riskColorClass[wallet.risk] || 'text-white'} drop-shadow-[2px_2px_0_rgba(0,0,0,1)]`}>
          {wallet.risk}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-[#2b1c0e] border-l-8 border-l-pumpkin p-4 min-h-[120px] relative mb-4 shadow-block-sm border-4 border-black">
          <p className="text-[16px] text-pumpkin uppercase mb-2 drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">Grimoire Translation</p>
          <p
            className={`text-lg text-white leading-relaxed ${isTyping ? 'cursor-blink' : ''}`}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(displayedText || "Brewing translation...") }}
          />
        </div>

        {!isTyping && (
          <div className={`mt-3 p-3 flex items-start gap-4 border-4 shadow-block-sm ${
            wallet.risk === 'SAFE' || wallet.risk === 'LOW'
              ? 'bg-obsidian border-creeper'
              : wallet.risk === 'MEDIUM'
              ? 'bg-obsidian border-yellow-500'
              : 'bg-obsidian border-pumpkin'
          }`}>
            <span className="text-3xl flex-shrink-0">
              {wallet.risk === 'SAFE' || wallet.risk === 'LOW' ? '🧪' : wallet.risk === 'MEDIUM' ? '⚠️' : '☠️'}
            </span>
            <div>
              <p className="text-lg text-white uppercase drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">
                {wallet.risk === 'SAFE' || wallet.risk === 'LOW'
                  ? 'Verdict: Cured'
                  : wallet.risk === 'MEDIUM'
                  ? 'Verdict: Observe'
                  : 'Verdict: Banish to Nether'}
              </p>
              <p className="text-[14px] text-cobblestone uppercase mt-1">
                Corruption: <span className="text-white">{100 - (wallet.trustScore || 0)}/100</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4 flex-shrink-0">
        {isTyping ? (
          <button onClick={handleSkip}
            className="flex-1 py-3 text-lg bg-black hover:bg-white border-4 border-cobblestone hover:border-black text-cobblestone hover:text-black uppercase shadow-block transition-all">
            Skip Casting
          </button>
        ) : (
          <>
            {explanations.length > 1 && (
              <button onClick={handleNext}
                className="flex-1 py-3 text-lg bg-white hover:bg-gray-300 border-4 border-black text-black uppercase shadow-block transition-all">
                Next Page ({explanationIndex + 1}/{explanations.length})
              </button>
            )}
            {explanations.length > 0 && (
              <button onClick={() => typeText(explanations[explanationIndex])}
                className="py-3 px-6 text-lg bg-black hover:bg-obsidian border-4 border-cobblestone text-white uppercase shadow-block transition-all">
                ↺ Recast
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}