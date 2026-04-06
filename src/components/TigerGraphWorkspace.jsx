import { useState, useEffect } from 'react';

const TigerGraphWorkspace = () => {
  const [workspaceStatus, setWorkspaceStatus] = useState('Checking'); 

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
      setWorkspaceStatus(data.Result?.status || 'Stopped'); 
    } catch (error) {
      setWorkspaceStatus('Stopped');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleResume = async (e) => {
    e.stopPropagation(); // Prevent event bubbling
    setWorkspaceStatus('Resuming');
    try {
      await fetch(`/tgcloud/controller/v4/v2/workgroups/${import.meta.env.VITE_WORKGROUP_ID}/workspaces/${import.meta.env.VITE_WORKSPACE_ID}/resume`, { 
        method: 'POST', 
        headers: { 'x-api-key': import.meta.env.VITE_API_KEY }
      });
      
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
          } else if (currentStatus === 'Stopped' || currentStatus === 'Stopping') {
            setWorkspaceStatus(currentStatus);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error("Polling failed", err);
        }
      }, 3000);
    } catch (error) {
      setWorkspaceStatus('Stopped');
    }
  };

  // Compact UI for Header
  const getStatusConfig = () => {
    switch (workspaceStatus) {
      case 'Active': return { color: 'bg-emerald-500', label: 'TG Active', action: null };
      case 'Resuming': return { color: 'bg-amber-500 animate-pulse', label: 'Starting...', action: null };
      case 'Stopping': return { color: 'bg-red-400', label: 'Stopping', action: null };
      case 'Checking': return { color: 'bg-slate-500 animate-pulse', label: 'Checking...', action: null };
      default: return { color: 'bg-slate-600', label: 'TG Offline', action: handleResume };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center">
      {config.action ? (
        <button 
          onClick={config.action}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-900/30 border border-blue-700/50 hover:bg-blue-800/40 transition-colors"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Resume TG</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-dark-700/50 border border-[#1e2847]">
          <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{config.label}</span>
        </div>
      )}
    </div>
  );
};

export default TigerGraphWorkspace;