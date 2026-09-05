import { useState, useEffect } from 'react'
import TrustScoreRing from './TrustScoreRing'

const RISK_BADGE = {
  CRITICAL: 'bg-gta-red text-white border-black font-gta tracking-widest text-lg',
  HIGH: 'bg-gta-orange text-black border-black font-gta tracking-widest text-lg',
  MEDIUM: 'bg-amber-500 text-black border-black font-gta tracking-widest text-lg',
  LOW: 'bg-gray-700 text-white border-black font-gta tracking-widest text-lg',
  SAFE: 'bg-gta-green text-black border-black font-gta tracking-widest text-lg',
  UNKNOWN: 'bg-gta-purple text-white border-black font-gta tracking-widest text-lg',
}

const TAG_COLORS = {
  'known-scam': 'bg-gta-red text-white border border-black',
  'blacklisted': 'bg-black text-gta-red border border-gta-red',
  'sybil-suspected': 'bg-gta-orange text-black border border-black',
  'wash-trader': 'bg-amber-500 text-black border border-black',
  'mixer-linked': 'bg-gta-purple text-white border border-black',
  'tornado-fork': 'bg-gta-red text-white border border-black',
  'verified': 'bg-gta-green text-black border border-black',
  'kyc': 'bg-blue-600 text-white border border-black',
  'exchange': 'bg-cyan-600 text-black border border-black',
  'suspicious': 'bg-yellow-400 text-black border border-black',
}

const RISK_FACTORS = [
  { label: 'Dark Arts Activity', score: 85, max: 100, color: '#8A0303', desc: 'Direct link to demonic entities' },
  { label: 'Cauldron Mixer Usage', score: 60, max: 100, color: '#FF7518', desc: 'Washing souls in mixers' },
  { label: 'Phantom Sybil Pattern', score: 40, max: 100, color: '#eab308', desc: 'Cloned ghost wallets detected' },
  { label: 'Soul Age', score: 10, max: 100, color: '#39FF14', desc: 'Mortal account maturity' }
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
      <div className="w-16 h-16 bg-black border-2 border-gta-purple flex items-center justify-center mb-4 text-3xl shadow-[0_0_15px_rgba(91,33,182,0.6)]">
        🕷️
      </div>
      <p className="text-gta-orange text-lg font-bold uppercase tracking-widest">Select soul on radar</p>
    </div>
  )

  const addrStr = wallet.address || wallet.short || "0x0";
  let seed = 0;
  for (let i = 0; i < addrStr.length; i++) seed += addrStr.charCodeAt(i);
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
      finalScore = f.label === 'Soul Age' ? 80 + variance : Math.max(0, 5 + variance);
      finalColor = '#39FF14';
    } else if (wallet.risk === 'MEDIUM') {
      finalScore = Math.max(10, f.score - 30 + variance);
      finalColor = '#FF7518';
    } else {
      finalScore = Math.min(100, Math.max(0, f.score + variance));
    }
    return { ...f, score: finalScore, color: finalColor };
  });

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-gta-hudBase border-4 border-black font-hud shadow-[0_0_15px_rgba(0,0,0,0.8)]">
      <div className="p-4 border-b-4 border-black bg-black/80 flex items-start justify-between gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 border-2 uppercase ${RISK_BADGE[wallet.risk] || RISK_BADGE.UNKNOWN}`} style={{ WebkitTextStroke: '0.5px black' }}>
              {wallet.risk || 'UNKNOWN'}
            </span>
            <span className="text-[12px] font-bold text-gta-orange uppercase tracking-widest bg-gray-900 px-2 py-1 border border-gta-purple">{wallet.type}</span>
          </div>
          <p className="text-xl font-black text-white uppercase truncate">{wallet.short}</p>
          <p className="text-xs text-gta-green font-bold mt-0.5 truncate">{wallet.address}</p>
        </div>
        
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="w-8 h-8 bg-black hover:bg-gta-red text-gta-orange hover:text-white border-2 border-gta-purple hover:border-gta-red font-black flex items-center justify-center transition-all shadow-md">✕</button>
          
          {localCurrency && localCurrency.code !== 'USD' && (
            <div className="flex items-center bg-black p-1 border-2 border-gta-purple shadow-[inset_0_0_5px_rgba(91,33,182,0.5)]">
              <button 
                onClick={() => setShowLocalCurrency(!showLocalCurrency)}
                className={`text-[10px] font-bold px-3 py-1 uppercase tracking-widest transition-colors ${
                  !showLocalCurrency ? 'bg-gta-orange text-black' : 'text-gray-500 hover:text-gta-orange'
                }`}
              >
                USD
              </button>
              <button 
                onClick={() => setShowLocalCurrency(!showLocalCurrency)}
                className={`text-[10px] font-bold px-3 py-1 uppercase tracking-widest transition-colors ${
                  showLocalCurrency ? 'bg-gta-orange text-black' : 'text-gray-500 hover:text-gta-orange'
                }`}
              >
                {localCurrency.code}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-b-4 border-black bg-black/60 flex flex-col sm:flex-row gap-6 items-center flex-shrink-0">
        <TrustScoreRing score={wallet.trustScore ?? trustScoreMock} risk={wallet.risk} size={100} />
        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          {[
            { label: 'Realm', value: wallet.chain || 'ETH' },
            { label: 'Lifespan', value: wallet.age || ageMock },
            { label: 'Rituals (Txs)', value: liveStats.isLoading ? 'CONJURING' : displayTxCount },
            { label: 'Stash', value: liveStats.isLoading ? 'CONJURING' : `${displayBalance} ETH` },
            { label: activeLabel, value: liveStats.isLoading ? 'CONJURING' : displayFiat },
            { label: 'Demons Linked', value: wallet.flaggedConnections ?? flaggedConnectionsMock },
          ].map(({ label, value }) => (
            <div key={label} className="bg-black/80 border border-gta-purple p-2 shadow-inner">
              <p className="text-[10px] text-gta-purple font-bold uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm font-black text-white truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {wallet.tags && wallet.tags.length > 0 && (
        <div className="p-4 border-b-4 border-black bg-black/80 flex-shrink-0">
          <p className="text-[11px] text-gta-orange font-bold uppercase tracking-widest mb-3">Supernatural Flags</p>
          <div className="flex flex-wrap gap-2">
            {wallet.tags.map(tag => (
              <span key={tag} className={`text-xs px-3 py-1 font-bold uppercase tracking-wider shadow-sm ${TAG_COLORS[tag] || 'bg-black text-gray-400 border border-gray-700'}`}>
                {tag.replace('-', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 flex-1 bg-black/90">
        <p className="text-[12px] text-white font-bold uppercase tracking-widest mb-4">Soul Attributes</p>
        <div className="flex flex-col gap-4">
          {riskFactors.map(({ label, score, color, desc }) => (
            <div key={label}>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{label}</span>
                <span className="text-sm font-black" style={{ color }}>{score}/100</span>
              </div>
              <div className="h-3 bg-gray-900 border-2 border-black flex">
                <div
                  className="h-full transition-all duration-1000 ease-out shadow-[0_0_8px_currentColor]"
                  style={{ width: `${score}%`, backgroundColor: color, color: color }}
                />
              </div>
              <p className="text-[10px] text-gta-purple font-bold uppercase mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}