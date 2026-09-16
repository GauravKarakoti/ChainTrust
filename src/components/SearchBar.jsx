import { useState, useEffect } from 'react'
import { fetchPresetWallets } from '../services/neo4j'

export default function SearchBar({ onSearch, isLoading }) {
  const [value, setValue] = useState('')
  const [presets, setPresets] = useState([])

  useEffect(() => {
    fetchPresetWallets().then(setPresets)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  const RISK_DOT = {
    HIGH: 'bg-hallow-orange',
    CRITICAL: 'bg-gta-red',
    SAFE: 'bg-gta-green',
    MEDIUM: 'bg-amber-500',
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-4 font-hud">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 shadow-lg border-4 border-black">
        <div className="flex-1 flex items-center gap-3 bg-dark-800 px-4 py-3 border-l-8 border-l-white">
          <span className="text-gray-400 text-lg font-bold">🔍</span>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="ENTER WALLET ADDRESS..."
            className="flex-1 bg-transparent outline-none text-white text-sm md:text-base uppercase font-bold placeholder-gray-600 tracking-wider"
          />
          {value && (
            <button type="button" onClick={() => setValue('')} className="text-gray-500 hover:text-white transition-colors font-bold">✕</button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-8 py-3 bg-white hover:bg-gray-200 disabled:bg-gray-900 disabled:text-gray-700 text-black text-sm md:text-base font-black uppercase tracking-widest transition-all"
        >
          {isLoading ? 'SCANNING' : 'LOCATE'}
        </button>
      </form>

      {presets.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap bg-black py-2 px-4 border border-gray-800 max-w-max mx-auto">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex-shrink-0">Watchlist:</span>
          {presets.map(({ address, risk, label }) => (
            <button
              key={address}
              onClick={() => { setValue(address); onSearch(address); }}
              className="flex items-center gap-2 text-[10px] font-bold px-3 py-1 bg-dark-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 uppercase transition-all"
            >
              <span className={`w-2 h-2 rounded-full border border-black ${RISK_DOT[risk] || 'bg-slate-500'}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}