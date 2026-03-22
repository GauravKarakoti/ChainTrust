import { useState } from 'react'
import { PRESET_WALLETS } from '../data/mockData'

export default function SearchBar({ onSearch, isLoading }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  const handlePreset = (address) => {
    setValue(address)
    onSearch(address)
  }

  const RISK_DOT = {
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
    SAFE: 'bg-emerald-500',
    MEDIUM: 'bg-amber-500',
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className={`flex-1 flex items-center gap-3 bg-dark-800 border rounded-xl px-4 py-2.5 transition-all ${
          focused ? 'border-blue-600 shadow-lg shadow-blue-900/20' : 'border-[#1e2847]'
        }`}>
          <span className="text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Enter wallet address or ENS name..."
            className="flex-1 bg-transparent outline-none text-sm text-slate-200 placeholder-slate-600 mono"
          />
          {value && (
            <button type="button" onClick={() => setValue('')} className="text-slate-600 hover:text-slate-400 transition-colors">✕</button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-700 disabled:text-slate-600 text-white text-sm font-semibold rounded-xl transition-all glow-blue"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Scanning
            </span>
          ) : 'Analyze'}
        </button>
      </form>

      {/* Preset buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest flex-shrink-0">Quick load:</span>
        {PRESET_WALLETS.map(({ address, risk, label }) => (
          <button
            key={address}
            onClick={() => handlePreset(address)}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 bg-dark-800 hover:bg-dark-700 border border-[#1e2847] hover:border-slate-600 text-slate-400 hover:text-white rounded-lg transition-all"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[risk] || 'bg-slate-500'}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
