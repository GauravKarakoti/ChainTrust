import { useState, useEffect } from 'react';
import '../index.css';

const TigerGraphWorkspace = () => {
  // Possible states: 'checking', 'running', 'stopped', 'resuming'
  const [workspaceStatus, setWorkspaceStatus] = useState('checking'); 

  // 1. Check the initial status of the workspace
  const checkStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_TG_URL}/api/tg/status`);
      const data = await response.json();
      setWorkspaceStatus(data.status); 
    } catch (error) {
      console.error("Failed to fetch status:", error);
      setWorkspaceStatus('stopped'); // Fallback state
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // 2. Handle the resume action and poll for readiness
  const handleResume = async () => {
    setWorkspaceStatus('resuming');
    try {
      // Trigger the start command via your backend
      await fetch(`${import.meta.env.VITE_TG_URL}/api/tg/resume`, { method: 'POST' });
      
      // Poll every 10 seconds until the workspace is fully running
      const pollInterval = setInterval(async () => {
        const response = await fetch(`${import.meta.env.VITE_TG_URL}/api/tg/status`);
        const data = await response.json();
        
        if (data.status === 'running') {
          setWorkspaceStatus('running');
          clearInterval(pollInterval);
        }
      }, 10000);
      
    } catch (error) {
      console.error("Failed to resume workspace:", error);
      setWorkspaceStatus('stopped');
    }
  };

  // UI State A: Loading
  if (workspaceStatus === 'checking') {
    return <div className="status-panel loading">Checking TigerGraph workspace status...</div>;
  }

  // UI State B: Running (The Connected Section)
  if (workspaceStatus === 'running') {
    return (
      <div className="connected-panel">
        <h3>✅ Current TigerGraph Connected Section</h3>
        <p>Your workspace is active and ready for queries.</p>
        {/* Render your active graph tools, metrics, or schema here */}
      </div>
    );
  }

  // UI State C: Stopped or Resuming (The Resume Button)
  return (
    <div className="offline-panel">
      <button 
        onClick={handleResume} 
        disabled={workspaceStatus === 'resuming'}
        className="resume-btn"
      >
        {workspaceStatus === 'resuming' ? 'Resuming Workspace (Please wait)...' : 'Resume TigerGraph Workspace'}
      </button>
    </div>
  );
};

export default TigerGraphWorkspace;