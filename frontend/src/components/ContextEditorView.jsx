import React, { useState, useEffect } from 'react';
import useAppStore from '../store/appStore';
import { tpaGet, tpaSet } from '../utils/tpa';
import { TPA_STORAGE_KEYS } from '../utils/tpaStorageKeys';

export default function ContextEditorView({ agentId }) {
    const [context, setContext] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { agents, appId, setActiveTab, showNotification } = useAppStore();

    const agent = agents.find(a => a.id === agentId);

    useEffect(() => {
        const fetchContext = async () => {
            if (agentId && appId) {
                setIsLoading(true);
                try {
                    const fetchedContext = await tpaGet(appId, TPA_STORAGE_KEYS.AGENT_CONTEXT(agentId));
                    if (typeof fetchedContext === 'object') {
                        setContext(JSON.stringify(fetchedContext, null, 2));
                    } else {
                        setContext(fetchedContext || '');
                    }
                } catch (error) {
                    showNotification('error', 'Failed to fetch agent context.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchContext();
    }, [agentId, appId]);

    const handleSave = async () => {
        if (agentId && appId) {
            setIsLoading(true);
            try {
                await tpaSet(appId, TPA_STORAGE_KEYS.AGENT_CONTEXT(agentId), context);
                showNotification('success', 'Agent context saved successfully.');
            } catch (error) {
                showNotification('error', 'Failed to save agent context.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleClear = async () => {
        if (agentId && appId) {
            if (confirm('Are you sure you want to clear this agent\'s context memory?')) {
                setIsLoading(true);
                try {
                    await tpaSet(appId, TPA_STORAGE_KEYS.AGENT_CONTEXT(agentId), "");
                    setContext("");
                    showNotification('success', 'Agent context cleared successfully.');
                } catch (error) {
                    showNotification('error', 'Failed to clear agent context.');
                } finally {
                    setIsLoading(false);
                }
            }
        }
    };

    if (!agent) {
        return (
            <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Agent Context Editor</h2>
                <p className="text-slate-600">Please select an agent from the "Agents & Logs" tab to edit its context.</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Edit Context for: <span className="font-bold text-blue-600">{agent.name}</span></h2>
            <p className="text-slate-600 mb-4">
                This context is private to this agent. It can be used for long-term memory, scratchpads, or persistent instructions.
            </p>
            <textarea
                className="w-full h-64 p-2 border border-slate-300 rounded-md"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Enter agent context here..."
                disabled={isLoading}
            />
            <div className="mt-4 flex justify-between items-center">
                <button
                    onClick={handleClear}
                    className="text-sm font-semibold text-red-600 hover:text-red-800"
                    disabled={isLoading}
                >
                    Clear Context
                </button>
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('agents')}
                        className="text-sm font-semibold text-slate-600 hover:text-slate-800"
                        disabled={isLoading}
                    >
                        Back to Agents
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md disabled:bg-slate-400"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save Context'}
                    </button>
                </div>
            </div>
        </div>
    );
}
