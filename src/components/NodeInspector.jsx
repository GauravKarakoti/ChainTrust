import { useState, useEffect } from 'react'
import TrustScoreRing from './TrustScoreRing'

const RISK_BADGE = {
  CRITICAL: 'bg-pumpkin text-black border-black font-block',
  HIGH: 'bg-yellow-500 text-black border-black font-block',
  MEDIUM: 'bg-creeper text-black border-black font-block',
  LOW: 'bg-cobblestone text-white border-black font-block',
  SAFE: 'bg-white text-black border-black font-block',
  UNKNOWN: 'bg-nether text-white border-black font-block',
}

const TAG_COLORS = {
  'known-scam': 'bg-pumpkin text-black border-2 border-black',
  'blacklisted': 'bg-obsidian text-pumpkin border-2 border-pumpkin',
  'sybil-suspected': 'bg-yellow-500 text-black border-2 border-black',
  'wash-trader': 'bg-cobblestone text-black border-2 border-black',
  'mixer-linked': 'bg-nether text-white border-2 border-black',
  'tornado-fork': 'bg-pumpkin text-white border-2 border-black',
  'verified': 'bg-creeper text-black border-2 border-black',
  'exchange': 'bg-cyan-600 text-black border-2 border-black',
}

const RISK_FACTORS = [
  { label: 'Dark Arts Activity', score: 85, max: 100, color: '#FF7518', desc: 'Direct link to demonic entities' },
  { label: 'Cauldron Mixer', score: 60, max: 100, color: '#7A28CB', desc: 'Washing souls in mixers' },
  { label: 'Phantom Pattern', score: 40, max: 100, color: '#eab308', desc: 'Cloned ghost wallets detected' },
  { label: 'Soul Age', score: 10, max: 100, color: '#39C040', desc: 'Mortal account maturity' }
]

export default function NodeInspector({ wallet, onClose }) {
  const [liveStats, setLiveStats] = useState({ balance: null, txCount: null, isLoading: false })
  const [localCurrency, setLocalCurrency] = useState(null) 
  const [showLocalCurrency, setShowLocalCurrency] = useState(false)

  // Auto-detect currency
  useEffect(() => {
    const controller = new AbortController();
    
    async function fetchLocationAndRate() {
      try {
        const ipRes = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        const ipData = await ipRes.json();
        
        if (ipData.currency) {
          const rateRes = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
          const rateData = await rateRes.json();
          const rate = rateData.rates[ipData.currency];
          
          if (rate) setLocalCurrency({ code: ipData.currency, rate });
        }
      } catch (error) {
        if (error.name !== 'AbortError') console.error("Failed to auto-detect currency/rates:", error);
      }
    }
    fetchLocationAndRate();
    
    return () => controller.abort();
  }, []);

  // Fetch Etherscan Data
  useEffect(() => {
    if (!wallet?.address) return;
    
    const controller = new AbortController();
    setLiveStats({ balance: null, txCount: null, isLoading: true });

    async function fetchRealData() {
      try {
        const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY; // Note: Exposing this on the client can be a security risk in production.
        const address = wallet.address;

        const [balanceRes, txCountRes] = await Promise.all([
          fetch(`/etherscan/v2/api?chainid=1&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`, { signal: controller.signal }),
          fetch(`/etherscan/v2/api?chainid=1&module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${apiKey}`, { signal: controller.signal })
        ]);

        const balanceData = await balanceRes.json();
        const txCountData = await txCountRes.json();

        let realBalance = balanceData.status === "1" && balanceData.result ? (Number(balanceData.result) / 1e18).toFixed(4) : null;
        let realTxCount = txCountData.result ? parseInt(txCountData.result, 16) : null;

        setLiveStats({ balance: realBalance, txCount: realTxCount, isLoading: false });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Etherscan fetch failed:", error);
          setLiveStats(prev => ({ ...prev, isLoading: false }));
        }
      }
    }
    fetchRealData();
    
    return () => controller.abort();
  }, [wallet]);

  if (!wallet) return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-obsidian border-4 border-black font-pixel shadow-block">
      <div className="w-16 h-16 bg-black border-4 border-cobblestone flex items-center justify-center mb-4 text-3xl shadow-block">
        🕸️
      </div>
      <p className="text-pumpkin text-xl uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Select Entity on Map</p>
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
  let displayFiat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(baseUsdValue);

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-obsidian border-4 border-black font-pixel">
      <div className="p-4 border-b-4 border-black bg-[#2b1c0e] flex items-start justify-between gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 border-2 text-[12px] uppercase ${RISK_BADGE[wallet.risk] || RISK_BADGE.UNKNOWN}`}>
              {wallet.risk || 'UNKNOWN'}
            </span>
            <span className="text-[14px] text-black uppercase bg-creeper px-2 py-1 border-2 border-black shadow-block-sm">{wallet.type}</span>
          </div>
          <p className="text-2xl text-white uppercase truncate drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">{wallet.short}</p>
          <p className="text-sm text-cobblestone mt-0.5 truncate">{wallet.address}</p>
        </div>
        
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="w-10 h-10 bg-black hover:bg-pumpkin text-cobblestone hover:text-black border-4 border-black flex items-center justify-center transition-all shadow-block-sm text-xl">✕</button>
        </div>
      </div>

      <div className="p-4 border-b-4 border-black bg-obsidian flex flex-col sm:flex-row gap-6 items-center flex-shrink-0">
        <TrustScoreRing score={50} risk={wallet.risk} size={100} />
        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          {[
            { label: 'Dimension', value: wallet.chain || 'ETH' },
            { label: 'Lifespan', value: wallet.age || ageMock },
            { label: 'Crafts (Txs)', value: liveStats.isLoading ? 'MINING' : displayTxCount },
            { label: 'Inventory', value: liveStats.isLoading ? 'MINING' : `${displayBalance} ETH` },
            { label: 'Loot Value', value: liveStats.isLoading ? 'MINING' : displayFiat },
            { label: 'Mobs Linked', value: '4' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-black border-4 border-cobblestone p-2 shadow-block-sm">
              <p className="text-[14px] text-pumpkin uppercase mb-1">{label}</p>
              <p className="text-lg text-white truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {wallet.tags && wallet.tags.length > 0 && (
        <div className="p-4 border-b-4 border-black bg-[#2b1c0e] flex-shrink-0">
          <p className="text-[16px] text-creeper uppercase mb-3 drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">Supernatural Flags</p>
          <div className="flex flex-wrap gap-2">
            {wallet.tags.map(tag => (
              <span key={tag} className={`text-[14px] px-3 py-1 uppercase shadow-block-sm ${TAG_COLORS[tag] || 'bg-black text-cobblestone border-2 border-black'}`}>
                {tag.replace('-', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 flex-1 bg-obsidian">
        <p className="text-[18px] text-white uppercase mb-4 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Soul Attributes</p>
        <div className="flex flex-col gap-4">
          {RISK_FACTORS.map(({ label, score, color, desc }) => (
            <div key={label}>
              <div className="flex justify-between items-end mb-1">
                <span className="text-[16px] text-cobblestone uppercase">{label}</span>
                <span className="text-[18px]" style={{ color }}>{score}/100</span>
              </div>
              <div className="h-4 bg-black border-2 border-cobblestone flex">
                <div
                  className="h-full shadow-block-sm"
                  style={{ width: `${score}%`, backgroundColor: color }}
                />
              </div>
              <p className="text-[14px] text-gray-400 uppercase mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}