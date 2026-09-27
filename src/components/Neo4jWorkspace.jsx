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
    <div className="flex items-center font-block">
      <div className="flex items-center gap-2 px-3 py-2 bg-obsidian border-4 border-black text-lg text-white shadow-block">
        SERVER: 
        <span className={status === 'ONLINE' ? 'text-creeper' : (status === 'OFFLINE' ? 'text-pumpkin' : 'text-yellow-500')}>
          {status === 'ONLINE' ? 'SPAWNED' : status}
        </span>
        
        {status === 'OFFLINE' && !isResuming && (
          <button 
            onClick={handleResume}
            className="ml-3 px-3 py-1 text-[12px] font-pixel bg-white text-black hover:bg-cobblestone border-2 border-black transition-all shadow-block-sm uppercase"
          >
            IGNITE
          </button>
        )}
      </div>
    </div>
  )
}