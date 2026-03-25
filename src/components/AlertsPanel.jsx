import { useState, useEffect } from 'react'
import { fetchLiveAlerts } from '../services/tigergraph'

const SEVERITY_CONFIG = {
  CRITICAL: { bg: 'bg-red-950/50', border: 'border-red-900', text: 'text-red-400', dot: 'bg-red-500', badge: 'bg-red-950 text-red-400 border-red-800' },
  HIGH: { bg: 'bg-orange-950/50', border: 'border-orange-900', text: 'text-orange-400', dot: 'bg-orange-500', badge: 'bg-orange-950 text-orange-400 border-orange-800' },
  MEDIUM: { bg: 'bg-amber-950/30', border: 'border-amber-900', text: 'text-amber-400', dot: 'bg-amber-500', badge: 'bg-amber-950 text-amber-400 border-amber-800' },
  LOW: { bg: 'bg-slate-900/30', border: 'border-slate-800', text: 'text-slate-400', dot: 'bg-slate-500', badge: 'bg-slate-900 text-slate-400 border-slate-700' },
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

  // Poll TigerGraph for Live Alerts
  useEffect(() => {
    // Initial fetch
    fetchLiveAlerts().then(data => setAlerts(data.slice(0, 12)))

    const interval = setInterval(async () => {
      const freshAlerts = await fetchLiveAlerts();
      if (freshAlerts && freshAlerts.length > 0) {
        setAlerts(freshAlerts.slice(0, 12));
        setNewAlertPulse(true);
        setTimeout(() => setNewAlertPulse(false), 2000);
      }
    }, 15000); // 15s polling window
    
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
    <div className="bg-dark-800 border border-[#1e2847] rounded-xl flex flex-col overflow-hidden">
      {/* Header (Always Visible) */}
      <div className="p-4 border-b border-[#1e2847] flex-shrink-0 bg-dark-800 relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${newAlertPulse ? 'bg-red-500 animate-ping' : 'bg-red-600'}`} />
          <h3 className="text-sm font-semibold text-slate-300">Real-time Alerts</h3>
          <span className="text-[10px] mono bg-dark-700 border border-[#1e2847] px-2 py-0.5 rounded text-slate-400">
            LIVE
          </span>
          
          <div className="ml-auto">
            <button 
              onClick={onToggleExpand}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors bg-dark-700 hover:bg-dark-600 px-2.5 py-1 rounded border border-[#1e2847]"
            >
              {isExpanded ? '▼ Collapse' : '▲ Expand'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'CRITICAL', count: counts.CRITICAL, color: 'text-red-400', bg: 'bg-red-950/30' },
            { label: 'HIGH', count: counts.HIGH, color: 'text-orange-400', bg: 'bg-orange-950/30' },
            { label: 'MEDIUM', count: counts.MEDIUM, color: 'text-amber-400', bg: 'bg-amber-950/30' },
          ].map(({ label, count, color, bg }) => (
            <button
              key={label}
              onClick={() => setFilter(filter === label ? 'ALL' : label)}
              className={`rounded-lg p-2 text-center transition-all border ${
                filter === label ? 'border-current' : 'border-transparent'
              } ${bg}`}
            >
              <p className={`text-lg font-bold mono ${color}`}>{count}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Content Area (Smooth Accordion) */}
      <div 
        className={`flex flex-col transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {/* Alert list */}
        <div className="overflow-y-auto p-3 space-y-2 max-h-[400px]">
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-600 text-sm">No alerts {filter !== 'ALL' ? `at ${filter} severity` : ''}</p>
            </div>
          )}
          {filtered.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW
            return (
              <div
                key={alert.id}
                className={`rounded-lg p-3 border transition-all ${config.bg} ${config.border} ${alert.isNew ? 'alert-blink' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0 mt-0.5">{PATTERN_ICONS[alert.pattern] || '⚠'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${config.badge}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-600">{alert.timestamp}</span>
                      {alert.isNew && (
                        <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded ml-auto">NEW</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-200 mb-1">{alert.title}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{alert.description}</p>
                  </div>
                  <button
                    onClick={() => dismiss(alert.id)}
                    className="text-slate-700 hover:text-slate-400 transition-colors text-xs flex-shrink-0"
                    title="Dismiss"
                  >✕</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1e2847] flex-shrink-0 bg-dark-800">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-600">Updates every 15s · TigerGraph stream</p>
            <button
              onClick={() => setDismissed(new Set())}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            >
              Restore all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}