import TrustScoreRing from './TrustScoreRing'

const RISK_BADGE = {
  CRITICAL: 'bg-red-950 text-red-400 border-red-800',
  HIGH: 'bg-orange-950 text-orange-400 border-orange-800',
  MEDIUM: 'bg-amber-950 text-amber-400 border-amber-800',
  LOW: 'bg-green-950 text-green-400 border-green-800',
  SAFE: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  UNKNOWN: 'bg-slate-900 text-slate-400 border-slate-700',
}

const TAG_COLORS = {
  'known-scam': 'bg-red-950 text-red-400',
  'blacklisted': 'bg-red-900 text-red-300',
  'sybil-suspected': 'bg-orange-950 text-orange-400',
  'wash-trader': 'bg-orange-950 text-orange-400',
  'mixer-linked': 'bg-purple-950 text-purple-400',
  'sybil-farm': 'bg-orange-950 text-orange-400',
  'sybil-funder': 'bg-orange-900 text-orange-300',
  'tornado-fork': 'bg-red-950 text-red-400',
  'verified': 'bg-green-950 text-green-400',
  'audited': 'bg-emerald-950 text-emerald-400',
  'kyc': 'bg-blue-950 text-blue-400',
  'exchange': 'bg-cyan-950 text-cyan-400',
  'suspicious': 'bg-amber-950 text-amber-400',
}

const RISK_FACTORS = [
  { label: 'Illicit Activity', score: 85, max: 100, color: '#ef4444', desc: 'Direct connection to flagged entities' },
  { label: 'Mixer Usage', score: 60, max: 100, color: '#f97316', desc: 'Interactions with coin mixers' },
  { label: 'Sybil Pattern', score: 40, max: 100, color: '#eab308', desc: 'Wash trading or farming behavior' },
  { label: 'Age & History', score: 10, max: 100, color: '#22c55e', desc: 'Account maturity score' }
]

export default function NodeInspector({ wallet, onClose }) {
  if (!wallet) return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-dark-700 border border-[#1e2847] flex items-center justify-center mb-4 text-2xl">
        🔍
      </div>
      <p className="text-slate-400 text-sm">Select a node in the graph to inspect wallet details</p>
    </div>
  )

  const riskFactors = wallet.risk === 'HIGH' || wallet.risk === 'CRITICAL' ? RISK_FACTORS : RISK_FACTORS.map(f => ({
    ...f,
    score: wallet.risk === 'SAFE' ? 80 + Math.floor(Math.random() * 20) : f.score,
    color: wallet.risk === 'SAFE' ? '#10b981' : f.color,
  }))

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-[#1e2847] flex items-start justify-between gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${RISK_BADGE[wallet.risk] || RISK_BADGE.UNKNOWN}`}>
              {wallet.risk || 'UNKNOWN'}
            </span>
            <span className="text-[10px] text-slate-500 capitalize">{wallet.type}</span>
          </div>
          <p className="text-sm font-semibold text-white truncate">{wallet.label || wallet.short}</p>
          <p className="text-[10px] mono text-slate-500 mt-0.5 truncate">{wallet.short || wallet.address}</p>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors text-lg mt-0.5 flex-shrink-0">✕</button>
      </div>

      {/* Score + Stats */}
      <div className="p-4 border-b border-[#1e2847] flex gap-4 items-center flex-shrink-0">
        <TrustScoreRing score={wallet.trustScore || 50} risk={wallet.risk} size={90} />
        <div className="flex-1 grid grid-cols-2 gap-2">
          {[
            { label: 'Chain', value: wallet.chain || 'ETH' },
            { label: 'Age', value: wallet.age || '—' },
            { label: 'Txs', value: wallet.txCount?.toLocaleString() || '—' },
            { label: 'Balance', value: wallet.balance || '—' },
            { label: 'USD', value: wallet.usdValue || '—' },
            { label: '⚠ Links', value: wallet.flaggedConnections ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">{label}</p>
              <p className="text-xs font-semibold text-slate-200 mono truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {wallet.tags && wallet.tags.length > 0 && (
        <div className="p-4 border-b border-[#1e2847] flex-shrink-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Flags</p>
          <div className="flex flex-wrap gap-1.5">
            {wallet.tags.map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] || 'bg-slate-900 text-slate-400'}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      <div className="p-4 flex-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Risk Factor Breakdown</p>
        <div className="flex flex-col gap-3">
          {riskFactors.map(({ label, score, max, color, desc }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-slate-300">{label}</span>
                <span className="text-[11px] mono font-semibold" style={{ color }}>{score}</span>
              </div>
              <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hop distance badge */}
      {wallet.hopDistance !== undefined && (
        <div className="p-4 border-t border-[#1e2847] flex-shrink-0">
          <div className="bg-dark-700 rounded-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-dark-600 border border-[#1e2847] flex items-center justify-center text-sm mono font-bold text-blue-400">
              {wallet.hopDistance}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                {wallet.hopDistance === 0 ? 'Target Wallet' : `${wallet.hopDistance} hop${wallet.hopDistance > 1 ? 's' : ''} from target`}
              </p>
              <p className="text-[10px] text-slate-500">Graph distance in transaction network</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
