// COMMENTED OUT - AGENT FUNCTIONALITY DISABLED
/*
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Play, Eraser, Settings, Trash2, FileText } from './Icons';
import useAppStore from '../store/appStore';
import { tpaSet, tpaGet } from '../utils/tpa';
import { sdk } from '@bigid/app-fw-ui-sdk';
import { TPA_STORAGE_KEYS } from '../utils/tpaStorageKeys';

const AgentManagementView = ({ setEditingAgentContextId }) => {
    const {
        appId,
        agents,
        isSaving,
        setAgents,
        setIsSaving,
        showNotification,
        setActiveTab,
    } = useAppStore();

    const [newAgent, setNewAgent] = React.useState({ name: '', prompt: '', schedule: 'hourly' });
    const [editingAgentId, setEditingAgentId] = React.useState(null);
    const [runningAgentId, setRunningAgentId] = React.useState(null);

    const refreshAgents = async () => {
        if (!appId) return;
        showNotification('Refreshing agent data...', 'info');
        try {
            const storedAgents = await tpaGet(appId, TPA_STORAGE_KEYS.AGENTS);
            setAgents(storedAgents || []);
            showNotification('Agent data refreshed!', 'success');
        } catch (error) {
            console.error("Error refreshing agents:", error);
            showNotification('Failed to refresh agent data.', 'error');
        }
    };

    useEffect(() => {
        refreshAgents();
    }, []);

    const isEditing = !!editingAgentId;

    const populateAgentFormForEdit = (agent) => {
        setEditingAgentId(agent.id);
        setNewAgent({ ...agent });
    };

    const resetAgentForm = () => {
        setEditingAgentId(null);
        setNewAgent({ name: '', prompt: '', schedule: 'hourly' });
    };

    const handleNewAgentChange = (e) => {
        setNewAgent({ ...newAgent, [e.target.name]: e.target.value });
    };

    const handleAgentFormSubmit = async (e) => {
        e.preventDefault();
        if (!newAgent.name || !newAgent.prompt) {
            showNotification('Agent Name and Prompt are required.', 'error');
            return;
        }
        setIsSaving(true);

        try {
            let updatedAgents;
            if (editingAgentId) {
                // Update existing agent
                updatedAgents = agents.map(a => a.id === editingAgentId ? { ...newAgent, id: editingAgentId } : a);
                showNotification('Agent updated successfully!');
            } else {
                // Add new agent
                const newAgentWithId = { ...newAgent, id: `agent_${Date.now()}` };
                updatedAgents = [...agents, newAgentWithId];
                showNotification('Agent added successfully!');
            }
            // The store's setAgents function handles both state update and TPA persistence
            setAgents(updatedAgents);
            setNewAgent({ name: '', prompt: '', schedule: 'hourly' });
            setEditingAgentId(null);
        } catch (error) {
            console.error("Error saving agent:", error);
            showNotification('Failed to save agent.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteAgent = async (agentId) => {
        if (confirm('Are you sure you want to delete this agent? This will also clear its context memory.')) {
            try {
                const updatedAgents = agents.filter(t => t.id !== agentId);
                // The store's setAgents function handles both state update and TPA persistence
                setAgents(updatedAgents);
                await tpaSet(appId, TPA_STORAGE_KEYS.AGENT_CONTEXT(agentId), null); // Clear context
                showNotification('Agent deleted.');
            } catch (error) {
                console.error("Error deleting agent:", error);
                showNotification('Failed to delete agent.', 'error');
            }
        }
    };

    const runAgentNow = async (agentId) => {
        setRunningAgentId(agentId);
        showNotification(`Triggering a manual run for agent...`, 'info');
        try {
            const [apiUrl, token] = await Promise.all([sdk.getApiUrl(), sdk.getToken()]);
            const bigidContext = { bigidBaseUrl: apiUrl, bigidToken: token, tpaId: appId };

            const payload = {
                bigidContext
            };

            const response = await fetch(`/api/run_agent/${agentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to run agent.');
            }
            
            showNotification(`Agent '${data.updatedAgent.name}' finished running.`, 'success');
            refreshAgents(); // Reload agents from the backend
        } catch (error) {
            console.error("Error running agent manually:", error);
            const errorMessage = (error instanceof TypeError && error.message === 'Failed to fetch')
                ? 'Network error: Could not connect to the backend. Please ensure it is running.'
                : error.message;
            showNotification(errorMessage, 'error');
        } finally {
            setRunningAgentId(null);
        }
    };

    const clearAgentContext = async (agentId) => {
        if (confirm('Are you sure you want to clear this agent\'s context memory?')) {
            try {
                await tpaSet(appId, TPA_STORAGE_KEYS.AGENT_CONTEXT(agentId), ""); // Set context to empty string
                showNotification('Agent context cleared.');
            } catch (error) {
                console.error("Error clearing agent context:", error);
                showNotification('Failed to clear agent context.', 'error');
            }
        }
    };

    const handleEditContext = (agentId) => {
        setEditingAgentContextId(agentId);
        setActiveTab('context');
    };

    return (
    <div>
        <h2 className="text-xl font-bold text-slate-700 mb-4">{isEditing ? 'Edit Agent' : 'Create New Agent'}</h2>
        <form onSubmit={handleAgentFormSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-1">Agent Name</label>
                <input type="text" name="name" id="name" value={newAgent.name} onChange={handleNewAgentChange} placeholder="e.g., Unencrypted PII Monitor" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
                <label htmlFor="prompt" className="block text-sm font-medium text-slate-600 mb-1">Core Prompt / Goal</label>
                <textarea name="prompt" id="prompt" value={newAgent.prompt} onChange={handleNewAgentChange} rows="4" placeholder="e.g., Continuously monitor scan results for objects containing 'Credit Card Number' that are not tagged as 'encrypted'. Maintain a list of these objects in your context." className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>
            <div>
                <label htmlFor="schedule" className="block text-sm font-medium text-slate-600 mb-1">Schedule</label>
                <select name="schedule" id="schedule" value={newAgent.schedule} onChange={handleNewAgentChange} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="remediation">Remediation (Object Actions)</option>
                    <option value="manual">Manual Only</option>
                    <option value="agent-controlled">Agent Controlled</option>
                </select>
            </div>
            <div className="md:col-span-2 flex justify-end items-center gap-4">
                 {isEditing && (
                    <button type="button" onClick={resetAgentForm} className="text-sm font-semibold text-slate-600 hover:text-slate-800">
                        Cancel
                    </button>
                )}
                <button type="submit" disabled={isSaving} className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-slate-400 transition-colors duration-200">
                    {isSaving ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Agent' : 'Add Agent')}
                </button>
            </div>
        </form>

        <h2 className="text-xl font-bold text-slate-700 mb-4">Agent Logs & Status</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Schedule</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Run Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Run Time</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {agents.length > 0 ? agents.map(agent => <AgentRow key={agent.id} agent={agent} onDeleteAgent={deleteAgent} onEditAgent={populateAgentFormForEdit} onRunAgent={runAgentNow} onEditContext={handleEditContext} runningAgentId={runningAgentId} />) : <tr><td colSpan="5" className="text-center py-8 text-slate-500">No agents created yet.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
    );
}

const AgentRow = ({ agent, onDeleteAgent, onEditAgent, onRunAgent, onEditContext, runningAgentId }) => {
    const isRunning = runningAgentId === agent.id;
    const getStatusIndicator = (status) => {
        switch (status) {
            case 'success': return <span className="flex items-center space-x-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-green-700">Success</span></span>;
            case 'failed': return <span className="flex items-center space-x-1.5"><AlertCircle className="h-4 w-4 text-red-500" /><span className="text-red-700">Failed</span></span>;
            default: return <span className="text-slate-500">Pending</span>;
        }
    };

    return (
        <tr className="hover:bg-slate-50 transition-colors duration-150">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-slate-900">{agent.name}</div>
                <p className="text-xs text-slate-500 truncate max-w-xs" title={agent.prompt}>{agent.prompt}</p>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {agent.schedule === 'agent-controlled' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Agent Controlled
                    </span>
                ) : (
                    agent.schedule
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusIndicator(agent.status)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{agent.lastRun ? new Date(agent.lastRun).toLocaleString() : 'N/A'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => onRunAgent(agent.id)} disabled={isRunning} title="Run Agent Now" className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:text-slate-300 disabled:hover:bg-transparent">
                        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button onClick={() => onEditContext(agent.id)} title="Edit Context" className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-100 rounded-md transition-colors"><FileText className="h-4 w-4" /></button>
                    <button onClick={() => onEditAgent(agent)} title="Edit Agent" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"><Settings className="h-4 w-4" /></button>
                    <button onClick={() => onDeleteAgent(agent.id)} title="Delete" className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
            </td>
        </tr>
    );
};

export default AgentManagementView;
*/

// REPLACEMENT COMPONENT - Agent functionality has been disabled
const AgentManagementView = ({ setEditingAgentContextId }) => {
    return (
        <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-700 mb-4">Agent Management</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                    ⚠️ Agent functionality has been disabled. This includes automated scheduling and agent storage capabilities.
                </p>
            </div>
            <p className="text-slate-600">
                Agent management features are currently unavailable. You can use the other tabs for MCP server management and manual prompt execution.
            </p>
        </div>
    );
};

export default AgentManagementView;
