import { useState, useEffect } from 'react'
import { fetchLiveAlerts } from '../services/neo4j'

const SEVERITY_CONFIG = {
  CRITICAL: { bg: 'bg-gta-red/20', border: 'border-gta-red', text: 'text-gta-red', badge: 'bg-gta-red text-white border-black border-2 font-gta text-lg tracking-wider' },
  HIGH: { bg: 'bg-orange-950/80', border: 'border-orange-600', text: 'text-orange-400', badge: 'bg-orange-600 text-white border-black border font-hud font-bold uppercase' },
  MEDIUM: { bg: 'bg-amber-950/80', border: 'border-amber-600', text: 'text-amber-400', badge: 'bg-amber-600 text-black border-black border font-hud font-bold uppercase' },
  LOW: { bg: 'bg-black/80', border: 'border-slate-600', text: 'text-slate-400', badge: 'bg-slate-700 text-white border-black border font-hud font-bold uppercase' },
}

const PATTERN_ICONS = {
  WASH_TRADE: '🔄',
  SYBIL: '👥',
  SCAM_PROXIMITY: '☠',
  MIXER: '🌀',
  BURST: '⚡',
}

export default function AlertsPanel({ isExpanded, onToggleExpand }) {
  const [alerts, setAlerts] = useState([])
  const [newAlertPulse, setNewAlertPulse] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [dismissed, setDismissed] = useState(new Set())

  useEffect(() => {
    fetchLiveAlerts().then(data => setAlerts(data.slice(0, 12)))

    const interval = setInterval(async () => {
      const freshAlerts = await fetchLiveAlerts();
      if (freshAlerts && freshAlerts.length > 0) {
        setAlerts(freshAlerts.slice(0, 12));
        setNewAlertPulse(true);
        setTimeout(() => setNewAlertPulse(false), 2000);
      }
    }, 15000);
    
    return () => clearInterval(interval);
  }, [])

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]))

  const filtered = alerts.filter(a =>
    !dismissed.has(a.id) &&
    (filter === 'ALL' || a.severity === filter)
  )

  const counts = {
    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL' && !dismissed.has(a.id)).length,
    HIGH: alerts.filter(a => a.severity === 'HIGH' && !dismissed.has(a.id)).length,
    MEDIUM: alerts.filter(a => a.severity === 'MEDIUM' && !dismissed.has(a.id)).length,
  }

  return (
    <div className="bg-gta-hudBase border-2 border-black rounded-lg flex flex-col overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm font-hud">
      <div className="p-4 border-b-2 border-black flex-shrink-0 relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full border border-black ${newAlertPulse ? 'bg-gta-red animate-ping' : 'bg-gta-red'}`} />
          <h3 className="text-xl font-gta text-white tracking-widest" style={{ WebkitTextStroke: '1px black' }}>LCPD DISPATCH</h3>
          <button 
            onClick={onToggleExpand}
            className="ml-auto text-xs font-bold text-white bg-black/50 px-3 py-1 rounded-sm border border-slate-700 hover:bg-white hover:text-black transition-colors uppercase"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {[
            { label: 'CRITICAL', count: counts.CRITICAL, color: 'text-gta-red', bg: 'bg-gta-red/10 border-gta-red/50' },
            { label: 'HIGH', count: counts.HIGH, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/50' },
            { label: 'MEDIUM', count: counts.MEDIUM, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/50' },
          ].map(({ label, count, color, bg }) => (
            <button
              key={label}
              onClick={() => setFilter(filter === label ? 'ALL' : label)}
              className={`p-2 text-center transition-all border-b-2 bg-black/40 ${
                filter === label ? `border-current ${bg}` : 'border-transparent hover:bg-black/60'
              } ${label === 'MEDIUM' ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <p className={`text-2xl font-gta ${color}`} style={{ WebkitTextStroke: '1px black' }}>{count}</p>
              <p className="text-[10px] text-white uppercase tracking-widest font-bold">{label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className={`flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="overflow-y-auto p-2 space-y-1 max-h-[400px]">
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm font-bold uppercase">All quiet on the streets</p>
            </div>
          )}
          {filtered.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW
            const isCritical = alert.severity === 'CRITICAL'
            return (
              <div
                key={alert.id}
                className={`p-3 border-l-4 border-b border-r border-t border-y-black border-r-black bg-black/60 transition-all ${config.border} ${alert.isNew ? 'animate-pulse' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 drop-shadow-md">{PATTERN_ICONS[alert.pattern] || '⚠'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 ${config.badge}`}>
                        {isCritical ? 'WASTED' : alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{alert.timestamp}</span>
                    </div>
                    <p className={`text-sm font-bold uppercase ${isCritical ? 'text-gta-red' : 'text-white'}`}>{alert.title}</p>
                    <p className="text-xs text-slate-300 leading-tight mt-1">{alert.description}</p>
                  </div>
                  <button
                    onClick={() => dismiss(alert.id)}
                    className="text-slate-500 hover:text-white transition-colors text-lg font-bold flex-shrink-0 drop-shadow-md"
                  >✕</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-2 border-t-2 border-black flex-shrink-0 bg-black/80">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gta-green font-bold uppercase tracking-widest">Scanning network...</p>
            <button
              onClick={() => setDismissed(new Set())}
              className="text-[10px] text-slate-400 hover:text-white transition-colors font-bold uppercase"
            >
              Reset Log
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}