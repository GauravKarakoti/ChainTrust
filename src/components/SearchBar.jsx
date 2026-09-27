import { useState, useEffect } from 'react'
import { fetchPresetWallets } from '../services/neo4j'

export default function SearchBar({ onSearch, isLoading }) {
  const [value, setValue] = useState('')
  const [presets, setPresets] = useState([])

  useEffect(() => {
    fetchPresetWallets().then(setPresets)
  }, [])

  const RISK_DOT = {
    HIGH: 'bg-pumpkin',
    CRITICAL: 'bg-nether',
    SAFE: 'bg-creeper',
    MEDIUM: 'bg-yellow-500',
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-4 font-pixel">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 shadow-block border-4 border-black">
        <div className="flex-1 flex items-center gap-3 bg-obsidian px-4 py-3 border-l-8 border-l-cobblestone">
          <span className="text-white text-xl">⛏️</span>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="ENTER WALLET HASH..."
            className="flex-1 bg-transparent outline-none text-white text-lg md:text-xl uppercase placeholder-cobblestone tracking-wider"
          />
          {value && (
            <button type="button" onClick={() => setValue('')} className="text-cobblestone hover:text-white transition-colors text-xl">✕</button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-8 py-3 bg-pumpkin hover:bg-white disabled:bg-cobblestone disabled:text-obsidian text-black text-lg md:text-xl uppercase transition-colors border-l-4 border-black"
        >
          {isLoading ? 'DIGGING' : 'CRAFT TRACE'}
        </button>
      </form>

      {presets.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap bg-obsidian py-2 px-4 border-4 border-black shadow-block max-w-max mx-auto">
          <span className="text-[14px] text-cobblestone uppercase flex-shrink-0">Grimoire:</span>
          {presets.map(({ address, risk, label }) => (
            <button
              key={address}
              onClick={() => { setValue(address); onSearch(address); }}
              className="flex items-center gap-2 text-[14px] px-3 py-1 bg-black hover:bg-gray-800 text-gray-300 hover:text-white border-2 border-cobblestone uppercase transition-all shadow-block-sm"
            >
              <span className={`w-3 h-3 border-2 border-black ${RISK_DOT[risk] || 'bg-slate-500'}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}