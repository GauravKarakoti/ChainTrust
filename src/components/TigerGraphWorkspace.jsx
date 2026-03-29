import { useState, useEffect } from 'react';
import '../index.css';

const TigerGraphWorkspace = () => {
  // Possible states: 'Active', 'Pausing', 'Idle', 'Resuming', 'Checking'
  const [workspaceStatus, setWorkspaceStatus] = useState('Checking'); 

  // 1. Check the initial status of the workspace
  const checkStatus = async () => {
    try {
      const response = await fetch(`https://api.tgcloud.io/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}`, {
        method: 'GET',
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log("Workspace status response:", data);
      setWorkspaceStatus(data.Result.status); 
    } catch (error) {
      console.error("Failed to fetch status:", error);
      setWorkspaceStatus('Checking'); // Fallback state
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // 2. Handle the resume action and poll for readiness
  const handleResume = async () => {
    setWorkspaceStatus('Resuming');
    try {
      // Trigger the start command via your backend
      await fetch(`https://api.tgcloud.io/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}/resume`, { method: 'POST', headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Content-Type': 'application/json'
        } });
      
      // Poll every 10 seconds until the workspace is fully running
      const pollInterval = setInterval(async () => {
        const response = await fetch(`https://api.tgcloud.io/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}`, {
          method: 'GET',
          headers: {
            'x-api-key': import.meta.env.VITE_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        
        if (data.Result.status === 'Active') {
          setWorkspaceStatus('Active');
          clearInterval(pollInterval);
        }
      }, 10000);
      
    } catch (error) {
      console.error("Failed to resume workspace:", error);
      setWorkspaceStatus('Idle');
    }
  };

  // UI State A: Loading
  if (workspaceStatus === 'Checking') {
    return <div className="status-panel loading">Checking TigerGraph workspace status...</div>;
  }

  // UI State B: Running (The Connected Section)
  if (workspaceStatus === 'Active') {
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
        disabled={workspaceStatus === 'Resuming'}
        className="resume-btn"
      >
        {workspaceStatus === 'Resuming' ? 'Resuming Workspace (Please wait)...' : 'Resume TigerGraph Workspace'}
      </button>
    </div>
  );
};

export default TigerGraphWorkspace;