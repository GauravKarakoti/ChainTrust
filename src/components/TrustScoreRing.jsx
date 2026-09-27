export default function TrustScoreRing({ score, risk, size = 120 }) {
  const wantedLevel = Math.max(0, 5 - Math.floor(score / 20))
  const isMaxWanted = wantedLevel === 5

  const riskColors = {
    CRITICAL: 'text-pumpkin',
    HIGH: 'text-yellow-500',
    MEDIUM: 'text-creeper',
    LOW: 'text-cobblestone',
    SAFE: 'text-white',
    UNKNOWN: 'text-cobblestone',
  }

  const getLabel = (s) => {
    if (s >= 80) return 'PURE'
    if (s >= 60) return 'HAUNTED'
    if (s >= 40) return 'CURSED'
    if (s >= 20) return 'SPOOKED'
    return 'DOOMED'
  }

  return (
    <div className="flex flex-col items-end">
      <div className={`flex gap-1 ${isMaxWanted ? 'cursed-blink' : ''}`}>
        {[1, 2, 3, 4, 5].map((block) => (
          <svg 
            key={block}
            width={size / 5} 
            height={size / 5} 
            viewBox="0 0 24 24" 
            className={`transition-all duration-300 ${
              block <= wantedLevel 
                ? (isMaxWanted ? 'fill-nether' : 'fill-pumpkin') 
                : 'fill-obsidian stroke-black stroke-[2px]'
            }`}
          >
            {/* Minecraft-style block rendering for 'stars' */}
            <rect x="2" y="2" width="20" height="20" />
          </svg>
        ))}
      </div>
      
      <div className={`font-block text-xl md:text-2xl mt-3 drop-shadow-[2px_2px_0_rgba(0,0,0,1)] ${riskColors[risk] || 'text-white'}`}>
        {getLabel(score)}
      </div>
      <div className="text-[14px] font-pixel text-white uppercase bg-black px-2 py-1 mt-2 border-2 border-cobblestone shadow-block-sm">
        CORRUPTION: {100 - score}%
      </div>
    </div>
  )
}