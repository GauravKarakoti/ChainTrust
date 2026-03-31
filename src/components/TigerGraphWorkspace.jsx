import { useState, useEffect } from 'react';
import '../index.css';

const TigerGraphWorkspace = () => {
  // Possible states: 'Active', 'Stopping', 'Stopped', 'Resuming', 'Checking'
  const [workspaceStatus, setWorkspaceStatus] = useState('Checking'); 

  // 1. Check the initial status of the workspace
  const checkStatus = async () => {
    try {
      const response = await fetch(`/tgcloud/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}`, {
        method: 'GET',
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log("Workspace status response:", data);
      
      // Update state based on API response
      setWorkspaceStatus(data.Result?.status || 'Stopped'); 
    } catch (error) {
      console.error("Failed to fetch status:", error);
      setWorkspaceStatus('Stopped'); // Fallback to Stopped so the user has the option to click Resume
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
      await fetch(`/tgcloud/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}/resume`, { 
        method: 'POST', 
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
        }
      });
      
      // Poll every 3 seconds until the workspace is fully running
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/tgcloud/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}`, {
            method: 'GET',
            headers: {
              'x-api-key': import.meta.env.VITE_API_KEY,
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();
          const currentStatus = data.Result?.status;
          
          if (currentStatus === 'Active') {
            setWorkspaceStatus('Active');
            clearInterval(pollInterval);
          } else if (currentStatus) {
            // Keep UI updated if it falls back to Stopped or Stopping
            setWorkspaceStatus(currentStatus);
            if (currentStatus === 'Stopped' || currentStatus === 'Stopping') {
              clearInterval(pollInterval);
            }
          }
        } catch (err) {
          console.error("Polling check failed", err);
        }
      }, 3000);
      
    } catch (error) {
      console.error("Failed to resume workspace:", error);
      setWorkspaceStatus('Stopped');
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

      case 'Stopping':
        return (
          <div className="offline-panel">
            <button disabled className="resume-btn pausing-btn">
              ⏸️ Workspace is Stopping (Please wait)...
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

      case 'Stopped':
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