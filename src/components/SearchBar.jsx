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

  const handlePreset = (address) => {
    setValue(address)
    onSearch(address)
  }

  const RISK_DOT = {
    HIGH: 'bg-gta-orange',
    CRITICAL: 'bg-gta-red',
    SAFE: 'bg-gta-green',
    MEDIUM: 'bg-amber-500',
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-4 font-hud">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 shadow-[0_5px_20px_rgba(255,117,24,0.3)] border-4 border-black">
        <div className="flex-1 flex items-center gap-3 bg-black/95 px-4 py-3 border-l-8 border-l-gta-orange">
          <span className="text-white text-lg font-bold">☠️</span>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="ENTER SUSPECT SOUL ID..."
            className="flex-1 bg-transparent outline-none text-white text-sm md:text-base uppercase font-bold placeholder-gta-purple tracking-wider"
          />
          {value && (
            <button type="button" onClick={() => setValue('')} className="text-gta-purple hover:text-white transition-colors font-bold">✕</button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-8 py-3 bg-gta-orange hover:bg-gta-red disabled:bg-gray-900 disabled:text-gray-700 text-black text-sm md:text-base font-black uppercase tracking-widest transition-all"
        >
          {isLoading ? 'CONJURING...' : 'HUNT'}
        </button>
      </form>

      {presets.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap bg-black/80 py-2 px-4 border-2 border-gta-purple max-w-max mx-auto rounded-sm shadow-[0_0_10px_rgba(91,33,182,0.4)]">
          <span className="text-[10px] text-gta-orange uppercase tracking-widest font-bold flex-shrink-0">Cursed Targets:</span>
          {presets.map(({ address, risk, label }) => (
            <button
              key={address}
              onClick={() => handlePreset(address)}
              className="flex items-center gap-2 text-[10px] font-bold px-3 py-1 bg-black hover:bg-gta-purple text-gray-300 hover:text-white border border-gta-purple uppercase transition-all"
            >
              <span className={`w-2 h-2 rounded-full border border-black shadow-[0_0_5px_currentColor] ${RISK_DOT[risk] || 'bg-slate-500'}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}