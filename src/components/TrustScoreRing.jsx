export default function TrustScoreRing({ score, risk, size = 120 }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const gap = circumference - filled

  const riskColors = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#f59e0b',
    LOW: '#22c55e',
    SAFE: '#10b981',
    UNKNOWN: '#64748b',
  }

  const color = riskColors[risk] || '#64748b'

  const getLabel = (s) => {
    if (s >= 80) return 'SAFE'
    if (s >= 60) return 'LOW RISK'
    if (s >= 40) return 'MEDIUM'
    if (s >= 20) return 'HIGH RISK'
    return 'CRITICAL'
  }

  return (
    <>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e2847"
            strokeWidth="8"
          />
          {/* Score ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${filled} ${gap}`}
            strokeLinecap="round"
            className="score-ring"
            style={{
              filter: `drop-shadow(0 0 6px ${color}60)`,
              transition: 'stroke-dasharray 0.8s ease',
            }}
          />
        </svg>
        <div className="text-center z-10">
          <div className="font-bold mono leading-none" style={{ fontSize: size * 0.22, color }}>
            {score}
          </div>
        </div>
      </div>
      <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
        {getLabel(score)}
      </div>
    </>
  )
}
