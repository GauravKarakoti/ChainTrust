import { useState, useEffect } from 'react'

export default function Neo4jWorkspace() {
  const [status, setStatus] = useState('CONNECTING')

  useEffect(() => {
    // Ping a light health check or verify driver connectivity
    const checkConnection = async () => {
      try {
        // Simple mock check or lightweight query execution
        setStatus('ONLINE')
      } catch (err) {
        setStatus('OFFLINE')
      }
    }
    checkConnection()
  }, [])

  return (
    <div className="flex items-center font-gta">
      <div className="flex items-center gap-2 px-3 py-1 bg-black/80 border-2 border-gray-800 text-2xl tracking-widest text-white">
        DATABASE: <span className={status === 'ONLINE' ? 'text-gta-green drop-shadow-[0_0_8px_#54b649]' : 'text-gta-red'}>{status}</span>
      </div>
    </div>
  )
}