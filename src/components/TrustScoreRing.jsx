export default function TrustScoreRing({ score, risk, size = 120 }) {
  const wantedLevel = Math.max(0, 5 - Math.floor(score / 20))
  const isMaxWanted = wantedLevel === 5

  const riskColors = {
    CRITICAL: 'text-gta-red',
    HIGH: 'text-hallow-orange', // Halloween accent for danger
    MEDIUM: 'text-amber-500',
    LOW: 'text-slate-400',
    SAFE: 'text-gta-green',
    UNKNOWN: 'text-gray-500',
  }

  const getLabel = (s) => {
    if (s >= 80) return 'CLEAN'
    if (s >= 60) return 'SUSPECT'
    if (s >= 40) return 'WANTED'
    if (s >= 20) return 'HIGH TARGET'
    return 'WASTED'
  }

  return (
    <div className="flex flex-col items-end">
      <div className={`flex gap-1 ${isMaxWanted ? 'wanted-blink' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg 
            key={star}
            width={size / 5} 
            height={size / 5} 
            viewBox="0 0 24 24" 
            className={`transition-all duration-300 ${
              star <= wantedLevel 
                ? (isMaxWanted ? 'fill-hallow-orange' : 'fill-white') 
                : 'fill-transparent stroke-gray-600 stroke-[1.5px]'
            }`}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      
      <div className={`font-gta text-2xl tracking-widest mt-2 ${riskColors[risk] || 'text-white'}`} style={{ WebkitTextStroke: '1px black' }}>
        {getLabel(score)}
      </div>
      <div className="text-[10px] font-hud text-slate-400 uppercase tracking-widest bg-black px-2 py-0.5 rounded-sm mt-1 border border-gray-700">
        RISK INDEX: {100 - score}%
      </div>
    </div>
  )
}