import { useState, useEffect } from 'react'
import { checkConnection, resumeAuraInstance } from '../services/neo4j'

export default function Neo4jWorkspace() {
  const [status, setStatus] = useState('CONNECTING')
  const [isResuming, setIsResuming] = useState(false)

  const verifyConnection = async () => {
    setStatus('CONNECTING')
    const isOnline = await checkConnection();
    setStatus(isOnline ? 'ONLINE' : 'OFFLINE')
  }

  useEffect(() => {
    verifyConnection()
  }, [])

  const handleResume = async () => {
    setIsResuming(true)
    setStatus('WAKING UP...')
    
    const success = await resumeAuraInstance()
    
    if (success) {
      // Aura takes a minute to resume; poll the database every 5 seconds
      const poll = setInterval(async () => {
        const isOnline = await checkConnection()
        if (isOnline) {
          setStatus('ONLINE')
          setIsResuming(false)
          clearInterval(poll)
        }
      }, 5000)
    } else {
      setStatus('OFFLINE')
      setIsResuming(false)
      alert("Failed to awaken database. Check API credentials in console.")
    }
  }

  return (
    <div className="flex items-center font-gta">
      <div className="flex items-center gap-2 px-3 py-1 bg-black border-2 border-gray-800 text-2xl tracking-widest text-white shadow-inner">
        DATABASE: 
        <span className={status === 'ONLINE' ? 'text-gta-green drop-shadow-[0_0_8px_#54b649]' : (status === 'OFFLINE' ? 'text-gta-red' : 'text-hallow-orange')}>
          {status}
        </span>
        
        {status === 'OFFLINE' && !isResuming && (
          <button 
            onClick={handleResume}
            className="ml-3 px-3 py-1 text-sm font-hud bg-white text-black hover:bg-gray-300 font-bold uppercase tracking-widest border border-white transition-all shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          >
            RESUME
          </button>
        )}
      </div>
    </div>
  )
}