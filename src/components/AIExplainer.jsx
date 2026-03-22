import { useState, useEffect, useRef } from 'react'
import { AI_EXPLANATIONS } from '../data/mockData'

function parseMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
}

export default function AIExplainer({ wallet }) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [explanationIndex, setExplanationIndex] = useState(0)
  const timerRef = useRef(null)
  const fullTextRef = useRef('')

  const getExplanations = (risk) => AI_EXPLANATIONS[risk] || AI_EXPLANATIONS['MEDIUM']

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
    if (!wallet) return
    const explanations = getExplanations(wallet.risk)
    const idx = 0
    setExplanationIndex(0)
    typeText(explanations[idx])
    return () => clearInterval(timerRef.current)
  }, [wallet])

  const handleNext = () => {
    if (!wallet) return
    const explanations = getExplanations(wallet.risk)
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
    CRITICAL: 'text-red-400',
    HIGH: 'text-orange-400',
    MEDIUM: 'text-amber-400',
    LOW: 'text-green-400',
    SAFE: 'text-emerald-400',
  }

  if (!wallet) {
    return (
      <div className="bg-dark-800 border border-[#1e2847] rounded-xl p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-300">AI Risk Analysis</h3>
          <span className="ml-auto text-[10px] bg-purple-950 text-purple-400 border border-purple-800 px-2 py-0.5 rounded-full">GPT-4o</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-600 text-sm text-center">Select a wallet to generate AI risk explanation</p>
        </div>
      </div>
    )
  }

  const explanations = getExplanations(wallet.risk)

  return (
    <div className="bg-dark-800 border border-[#1e2847] rounded-xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${isTyping ? 'animate-pulse bg-purple-500' : 'bg-purple-600'}`} />
        <h3 className="text-sm font-semibold text-slate-300">AI Risk Analysis</h3>
        <span className="ml-auto text-[10px] bg-purple-950 text-purple-400 border border-purple-800 px-2 py-0.5 rounded-full">GPT-4o</span>
      </div>

      {/* Wallet context */}
      <div className="bg-dark-900 rounded-lg p-3 mb-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-dark-700 border border-[#1e2847] flex items-center justify-center text-sm">
          {wallet.type === 'contract' ? '◆' : '◎'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">{wallet.label || wallet.short}</p>
          <p className="text-[10px] mono text-slate-500 truncate">{wallet.short}</p>
        </div>
        <span className={`text-xs font-bold ${riskColorClass[wallet.risk] || 'text-slate-400'}`}>
          {wallet.risk}
        </span>
      </div>

      {/* Analysis text */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-dark-900 rounded-lg p-4 min-h-[100px] relative">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">Analysis</p>
          <p
            className={`text-sm text-slate-300 leading-relaxed ${isTyping ? 'cursor-blink' : ''}`}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(displayedText) }}
          />
        </div>

        {/* Verdict */}
        {!isTyping && (
          <div className={`mt-3 rounded-lg p-3 flex items-start gap-3 border ${
            wallet.risk === 'SAFE' || wallet.risk === 'LOW'
              ? 'bg-emerald-950/30 border-emerald-900'
              : wallet.risk === 'MEDIUM'
              ? 'bg-amber-950/30 border-amber-900'
              : 'bg-red-950/30 border-red-900'
          }`}>
            <span className="text-xl flex-shrink-0">
              {wallet.risk === 'SAFE' || wallet.risk === 'LOW' ? '✅' : wallet.risk === 'MEDIUM' ? '⚠️' : '🚨'}
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                {wallet.risk === 'SAFE' || wallet.risk === 'LOW'
                  ? 'Recommendation: Proceed with caution'
                  : wallet.risk === 'MEDIUM'
                  ? 'Recommendation: Monitor closely'
                  : 'Recommendation: Avoid interaction'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Trust Score: <span className="mono font-semibold text-slate-300">{wallet.trustScore}/100</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-4 flex-shrink-0">
        {isTyping ? (
          <button onClick={handleSkip}
            className="flex-1 py-2 text-xs bg-dark-700 hover:bg-dark-600 border border-[#1e2847] text-slate-400 hover:text-white rounded-lg transition-all">
            Skip Animation
          </button>
        ) : (
          <>
            {explanations.length > 1 && (
              <button onClick={handleNext}
                className="flex-1 py-2 text-xs bg-dark-700 hover:bg-dark-600 border border-[#1e2847] text-slate-400 hover:text-white rounded-lg transition-all">
                Next Finding ({explanationIndex + 1}/{explanations.length})
              </button>
            )}
            <button onClick={() => typeText(explanations[explanationIndex])}
              className="py-2 px-4 text-xs bg-purple-900/40 hover:bg-purple-900/60 border border-purple-800 text-purple-300 rounded-lg transition-all">
              ↺ Re-run
            </button>
          </>
        )}
      </div>
    </div>
  )
}
