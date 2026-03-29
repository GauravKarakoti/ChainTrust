import { useState, useEffect, useRef } from 'react';
import '../index.css';

const TigerGraphWorkspace = () => {
  // Possible states: 'Active', 'Pausing', 'Idle', 'Resuming', 'Checking'
  const [workspaceStatus, setWorkspaceStatus] = useState('Checking'); 
  
  // Keep track of the interval so we can clear it if the component unmounts
  const pollIntervalRef = useRef(null);

  // 1. Check the initial status of the workspace
  const checkStatus = async () => {
    try {
      const response = await fetch(`/tgcloud/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}`, {
        method: 'GET',
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Content-Type': 'application/json'
        },
        cache: 'no-store' // FIX: Prevent browser from caching the initial load
      });
      const data = await response.json();
      console.log("Initial workspace status response:", data);
      
      setWorkspaceStatus(data.Result?.status || 'Idle'); 
    } catch (error) {
      console.error("Failed to fetch status:", error);
      setWorkspaceStatus('Idle'); 
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Cleanup function: stop polling if the user leaves this page
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // 2. Handle the resume action and poll for readiness
  const handleResume = async () => {
    setWorkspaceStatus('Resuming');
    try {
      // Trigger the start command via your backend
      await fetch(`/tgcloud/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}/resume`, { 
        method: 'POST', 
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Content-Type': 'application/json'
        } 
      });
      
      // Clear any existing polling just in case
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      // Poll every 3 seconds until the workspace is fully running
      pollIntervalRef.current = setInterval(async () => {
        try {
          // FIX: Added a cache-busting query parameter AND cache: 'no-store'
          // to guarantee the browser actually asks the server for the latest status.
          const url = `/tgcloud/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}?_t=${Date.now()}`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'x-api-key': import.meta.env.VITE_API_KEY,
              'Content-Type': 'application/json'
            },
            cache: 'no-store' // FIX: Critical for polling
          });
          
          const data = await response.json();
          const currentStatus = data.Result?.status;
          console.log("Polling status:", currentStatus);
          
          if (currentStatus === 'Active') {
            setWorkspaceStatus('Active');
            clearInterval(pollIntervalRef.current);
          } else if (currentStatus) {
            setWorkspaceStatus(currentStatus);
            if (currentStatus === 'Idle' || currentStatus === 'Pausing') {
              clearInterval(pollIntervalRef.current);
            }
          }
        } catch (err) {
          console.error("Polling check failed", err);
        }
      }, 3000); // 3 seconds

    } catch (error) {
      console.error("Failed to resume workspace:", error);
      setWorkspaceStatus('Idle');
    }
  };

  // 3. Render UI based on the exact 5 states
  const renderStatusUI = () => {
    switch (workspaceStatus) {
      case 'Checking':
        return (
          <div className="status-panel loading">
            <p>🔄 Checking TigerGraph workspace status...</p>
          </div>
        );

      case 'Active':
        return (
          <div className="connected-panel">
            <p>✅ Workspace is Active and Ready for Queries.</p>
          </div>
        );

      case 'Pausing':
        return (
          <div className="offline-panel">
            <button disabled className="resume-btn pausing-btn">
              ⏸️ Workspace is Pausing (Please wait)...
            </button>
          </div>
        );

      case 'Resuming':
        return (
          <div className="offline-panel">
            <button disabled className="resume-btn resuming-btn">
              ⏳ Resuming Workspace (Please wait)...
            </button>
          </div>
        );

      case 'Idle':
      default:
        return (
          <div className="offline-panel">
            <button onClick={handleResume} className="resume-btn">
              ▶️ Resume TigerGraph Workspace
            </button>
          </div>
        );
    }
  };

  return (
    <div className="tigergraph-workspace-container">
      {renderStatusUI()}
    </div>
  );
};

export default TigerGraphWorkspace;