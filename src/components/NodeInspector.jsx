import { useState, useEffect } from 'react'
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
  // --- NEW: State for real Etherscan data ---
  const [liveStats, setLiveStats] = useState({ balance: null, txCount: null, isLoading: false })

  useEffect(() => {
    if (!wallet || !wallet.address) return;

    let isMounted = true;
    setLiveStats({ balance: null, txCount: null, isLoading: true });

    async function fetchRealData() {
      try {
        const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
        const address = wallet.address;

        const balanceRes = await fetch(`/etherscan/v2/api?chainid=1&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`);
        const balanceData = await balanceRes.json();

        // Fetch Real Tx Count (Route through our /etherscan proxy)
        const txCountRes = await fetch(`/etherscan/v2/api?chainid=1&module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${apiKey}`);
        const txCountData = await txCountRes.json();

        if (isMounted) {
          let realBalance = null;
          let realTxCount = null;

          if (balanceData.status === "1" && balanceData.result) {
            realBalance = (Number(balanceData.result) / 1e18).toFixed(4); // Convert Wei to ETH
          }
          if (txCountData.result) {
            realTxCount = parseInt(txCountData.result, 16); // Hex to Int
          }

          setLiveStats({ balance: realBalance, txCount: realTxCount, isLoading: false });
        }
      } catch (error) {
        console.error("Etherscan fetch failed:", error);
        if (isMounted) setLiveStats(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchRealData();

    return () => { isMounted = false };
  }, [wallet]);


  if (!wallet) return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-dark-700 border border-[#1e2847] flex items-center justify-center mb-4 text-2xl">
        🔍
      </div>
      <p className="text-slate-400 text-sm">Select a node in the graph to inspect wallet details</p>
    </div>
  )

  // 1. Generate a robust seed from the whole address for better pseudo-randomness
  const addrStr = wallet.address || wallet.short || "0x0";
  let seed = 0;
  for (let i = 0; i < addrStr.length; i++) {
    seed += addrStr.charCodeAt(i);
  }
  const variance = (seed % 15) - 7; 

  // 2. Deterministic Mock Stats (Used as fallback if API fails)
  const txCountMock = (seed * 17) % 8500 + 12;
  const balanceMock = ((seed * 0.031) % 45).toFixed(3);
  const ageMock = ((seed % 48) + 1) + ' mos';
  
  // --- NEW: Determine Display Values (Live vs Mock) ---
  const displayTxCount = liveStats.txCount !== null ? liveStats.txCount.toLocaleString() : txCountMock.toLocaleString();
  const displayBalance = liveStats.balance !== null ? liveStats.balance : balanceMock;
  const displayUsd = '$' + (Number(displayBalance) * 3200).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  let trustScoreMock = 50;
  let flaggedConnectionsMock = 0;

  if (wallet.risk === 'SAFE' || wallet.risk === 'LOW') {
    trustScoreMock = Math.min(100, 85 + variance);
    flaggedConnectionsMock = 0;
  } else if (wallet.risk === 'MEDIUM') {
    trustScoreMock = 50 + variance;
    flaggedConnectionsMock = (seed % 3) + 1;
  } else {
    trustScoreMock = Math.max(5, 20 + variance);
    flaggedConnectionsMock = (seed % 10) + 3;
  }

  // 3. Process Risk Factor bars
  const riskFactors = RISK_FACTORS.map(f => {
    let finalScore = f.score;
    let finalColor = f.color;

    if (wallet.risk === 'SAFE' || wallet.risk === 'LOW') {
      finalScore = f.label === 'Age & History' ? 80 + variance : Math.max(0, 5 + variance);
      finalColor = '#10b981';
    } else if (wallet.risk === 'MEDIUM') {
      finalScore = Math.max(10, f.score - 30 + variance);
      finalColor = '#eab308';
    } else {
      finalScore = Math.min(100, Math.max(0, f.score + variance));
    }

    return { ...f, score: finalScore, color: finalColor };
  });

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
          <p className="text-sm font-semibold text-white truncate">{wallet.short}</p>
          <p className="text-[10px] mono text-slate-500 mt-0.5 truncate">{wallet.address}</p>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors text-lg mt-0.5 flex-shrink-0">✕</button>
      </div>

      {/* Score + Stats */}
      <div className="p-4 border-b border-[#1e2847] flex gap-4 items-center flex-shrink-0">
        <TrustScoreRing score={wallet.trustScore ?? trustScoreMock} risk={wallet.risk} size={90} />
        <div className="flex-1 grid grid-cols-2 gap-2">
          {[
            { label: 'Chain', value: wallet.chain || 'ETH' },
            { label: 'Age', value: wallet.age || ageMock },
            { label: 'Txs', value: liveStats.isLoading ? '...' : displayTxCount },
            { label: 'Balance', value: liveStats.isLoading ? '...' : `${displayBalance} ETH` },
            { label: 'USD', value: liveStats.isLoading ? '...' : displayUsd },
            { label: '⚠ Links', value: wallet.flaggedConnections ?? flaggedConnectionsMock },
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