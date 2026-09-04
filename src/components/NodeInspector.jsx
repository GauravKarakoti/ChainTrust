import { useState, useEffect } from 'react'
import TrustScoreRing from './TrustScoreRing'

const RISK_BADGE = {
  CRITICAL: 'bg-gta-red text-white border-black font-gta tracking-widest text-lg',
  HIGH: 'bg-orange-600 text-white border-black font-gta tracking-widest text-lg',
  MEDIUM: 'bg-amber-500 text-black border-black font-gta tracking-widest text-lg',
  LOW: 'bg-gray-700 text-white border-black font-gta tracking-widest text-lg',
  SAFE: 'bg-gta-green text-black border-black font-gta tracking-widest text-lg',
  UNKNOWN: 'bg-black text-white border-gray-700 font-gta tracking-widest text-lg',
}

const TAG_COLORS = {
  'known-scam': 'bg-gta-red text-white border border-black',
  'blacklisted': 'bg-black text-gta-red border border-gta-red',
  'sybil-suspected': 'bg-orange-600 text-white border border-black',
  'wash-trader': 'bg-amber-500 text-black border border-black',
  'mixer-linked': 'bg-purple-700 text-white border border-black',
  'tornado-fork': 'bg-gta-red text-white border border-black',
  'verified': 'bg-gta-green text-black border border-black',
  'kyc': 'bg-gta-blue text-white border border-black',
  'exchange': 'bg-cyan-600 text-black border border-black',
  'suspicious': 'bg-yellow-400 text-black border border-black',
}

const RISK_FACTORS = [
  { label: 'Illicit Activity', score: 85, max: 100, color: '#ff2a2a', desc: 'Direct connection to flagged entities' },
  { label: 'Mixer Usage', score: 60, max: 100, color: '#f97316', desc: 'Interactions with coin mixers' },
  { label: 'Sybil Pattern', score: 40, max: 100, color: '#eab308', desc: 'Wash trading or farming behavior' },
  { label: 'Account Age', score: 10, max: 100, color: '#54b649', desc: 'Account maturity score' }
]

export default function NodeInspector({ wallet, onClose }) {
  const [liveStats, setLiveStats] = useState({ balance: null, txCount: null, isLoading: false })
  const [localCurrency, setLocalCurrency] = useState(null) 
  const [showLocalCurrency, setShowLocalCurrency] = useState(false)

  useEffect(() => {
    let isMounted = true;
    async function fetchLocationAndRate() {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        const currencyCode = ipData.currency; 

        if (currencyCode) {
          const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
          const rateData = await rateRes.json();
          const rate = rateData.rates[currencyCode];

          if (isMounted && rate) {
            setLocalCurrency({ code: currencyCode, rate });
          }
        }
      } catch (error) {
        console.error("Failed to auto-detect currency/rates:", error);
      }
    }
    fetchLocationAndRate();
    return () => { isMounted = false };
  }, []);

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

        const txCountRes = await fetch(`/etherscan/v2/api?chainid=1&module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${apiKey}`);
        const txCountData = await txCountRes.json();

        if (isMounted) {
          let realBalance = null;
          let realTxCount = null;

          if (balanceData.status === "1" && balanceData.result) {
            realBalance = (Number(balanceData.result) / 1e18).toFixed(4);
          }
          if (txCountData.result) {
            realTxCount = parseInt(txCountData.result, 16);
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
    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gta-hudBase border-4 border-black font-hud shadow-[0_0_15px_rgba(0,0,0,0.8)]">
      <div className="w-16 h-16 bg-black border-2 border-gray-600 flex items-center justify-center mb-4 text-3xl shadow-[0_0_10px_rgba(255,255,255,0.2)]">
        🎯
      </div>
      <p className="text-white text-lg font-bold uppercase tracking-widest">Select target on radar</p>
    </div>
  )

  const addrStr = wallet.address || wallet.short || "0x0";
  let seed = 0;
  for (let i = 0; i < addrStr.length; i++) {
    seed += addrStr.charCodeAt(i);
  }
  const variance = (seed % 15) - 7; 

  const txCountMock = (seed * 17) % 8500 + 12;
  const balanceMock = ((seed * 0.031) % 45).toFixed(3);
  const ageMock = ((seed % 48) + 1) + ' mos';
  
  const displayTxCount = liveStats.txCount !== null ? liveStats.txCount.toLocaleString() : txCountMock.toLocaleString();
  const displayBalance = liveStats.balance !== null ? liveStats.balance : balanceMock;
  
  const baseUsdValue = Number(displayBalance) * 3200; 
  
  let activeLabel = 'USD';
  let displayFiat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(baseUsdValue);

  if (showLocalCurrency && localCurrency) {
    activeLabel = localCurrency.code;
    const localValue = baseUsdValue * localCurrency.rate;
    displayFiat = new Intl.NumberFormat(undefined, { style: 'currency', currency: localCurrency.code }).format(localValue);
  }
  
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

  const riskFactors = RISK_FACTORS.map(f => {
    let finalScore = f.score;
    let finalColor = f.color;

    if (wallet.risk === 'SAFE' || wallet.risk === 'LOW') {
      finalScore = f.label === 'Account Age' ? 80 + variance : Math.max(0, 5 + variance);
      finalColor = '#54b649';
    } else if (wallet.risk === 'MEDIUM') {
      finalScore = Math.max(10, f.score - 30 + variance);
      finalColor = '#f97316';
    } else {
      finalScore = Math.min(100, Math.max(0, f.score + variance));
    }

    return { ...f, score: finalScore, color: finalColor };
  });

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-gta-hudBase border-4 border-black font-hud shadow-[0_0_15px_rgba(0,0,0,0.8)]">
      {/* Header */}
      <div className="p-4 border-b-4 border-black bg-black/60 flex items-start justify-between gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 border-2 uppercase ${RISK_BADGE[wallet.risk] || RISK_BADGE.UNKNOWN}`} style={{ WebkitTextStroke: '0.5px black' }}>
              {wallet.risk || 'UNKNOWN'}
            </span>
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest bg-gray-900 px-2 py-1 border border-gray-700">{wallet.type}</span>
          </div>
          <p className="text-xl font-black text-white uppercase truncate">{wallet.short}</p>
          <p className="text-xs text-gta-green font-bold mt-0.5 truncate">{wallet.address}</p>
        </div>
        
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="w-8 h-8 bg-black hover:bg-white text-gray-400 hover:text-black border-2 border-gray-600 hover:border-black font-black flex items-center justify-center transition-all shadow-md">✕</button>
          
          {localCurrency && localCurrency.code !== 'USD' && (
            <div className="flex items-center bg-black p-1 border-2 border-gray-800 shadow-inner">
              <button 
                onClick={() => setShowLocalCurrency(!showLocalCurrency)}
                className={`text-[10px] font-bold px-3 py-1 uppercase tracking-widest transition-colors ${
                  !showLocalCurrency ? 'bg-white text-black' : 'text-gray-500 hover:text-white'
                }`}
              >
                USD
              </button>
              <button 
                onClick={() => setShowLocalCurrency(!showLocalCurrency)}
                className={`text-[10px] font-bold px-3 py-1 uppercase tracking-widest transition-colors ${
                  showLocalCurrency ? 'bg-white text-black' : 'text-gray-500 hover:text-white'
                }`}
              >
                {localCurrency.code}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Score + Stats */}
      <div className="p-4 border-b-4 border-black bg-black/40 flex flex-col sm:flex-row gap-6 items-center flex-shrink-0">
        <TrustScoreRing score={wallet.trustScore ?? trustScoreMock} risk={wallet.risk} size={100} />
        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          {[
            { label: 'Network', value: wallet.chain || 'ETH' },
            { label: 'Active', value: wallet.age || ageMock },
            { label: 'Total Txs', value: liveStats.isLoading ? 'SCANNING' : displayTxCount },
            { label: 'Stash', value: liveStats.isLoading ? 'SCANNING' : `${displayBalance} ETH` },
            { label: activeLabel, value: liveStats.isLoading ? 'SCANNING' : displayFiat },
            { label: 'Hostiles', value: wallet.flaggedConnections ?? flaggedConnectionsMock },
          ].map(({ label, value }) => (
            <div key={label} className="bg-black/60 border border-gray-800 p-2">
              <p className="text-[10px] text-gta-blue font-bold uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm font-black text-white truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {wallet.tags && wallet.tags.length > 0 && (
        <div className="p-4 border-b-4 border-black bg-black/60 flex-shrink-0">
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-3">Intelligence Flags</p>
          <div className="flex flex-wrap gap-2">
            {wallet.tags.map(tag => (
              <span key={tag} className={`text-xs px-3 py-1 font-bold uppercase tracking-wider shadow-sm ${TAG_COLORS[tag] || 'bg-black text-gray-400 border border-gray-700'}`}>
                {tag.replace('-', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors (GTA Stat Bars) */}
      <div className="p-4 flex-1 bg-black/80">
        <p className="text-[12px] text-white font-bold uppercase tracking-widest mb-4">Target Attributes</p>
        <div className="flex flex-col gap-4">
          {riskFactors.map(({ label, score, color, desc }) => (
            <div key={label}>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{label}</span>
                <span className="text-sm font-black" style={{ color }}>{score}/100</span>
              </div>
              <div className="h-3 bg-gray-900 border-2 border-black flex">
                <div
                  className="h-full transition-all duration-1000 ease-out"
                  style={{ width: `${score}%`, backgroundColor: color }}
                />
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hop distance badge */}
      {wallet.hopDistance !== undefined && (
        <div className="p-4 border-t-4 border-black bg-black flex-shrink-0">
          <div className="border-2 border-gray-800 p-3 flex items-center gap-4">
            <div className="w-10 h-10 bg-gta-blue border-2 border-black flex items-center justify-center text-xl font-black text-white drop-shadow-md">
              {wallet.hopDistance}
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest">
                {wallet.hopDistance === 0 ? 'Primary Target' : `Degrees of Separation`}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Graph Distance from Origin</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}