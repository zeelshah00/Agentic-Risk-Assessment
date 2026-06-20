import React, { useState } from 'react';
import { Bot, Settings, ListTodo, Server, AlertCircle, Loader2, Home, FileText } from './components/Icons';
import TabButton from './components/TabButton';
import AgentManagementView from './components/AgentManagementView';
import McpServerView from './components/McpServerView';
import SettingsView from './components/SettingsView';
import HomeView from './components/HomeView';
import ContextEditorView from './components/ContextEditorView';
import Notification from './components/Notification';
import { useAppManager } from './hooks/useAppManager';
import useAppStore from './store/appStore';

export default function App() {
    useAppManager();
    const [editingAgentContextId, setEditingAgentContextId] = useState(null);
    const [analyticsOptOut, setAnalyticsOptOut] = useState(false);

    const {
        isInBigIdInstance,
        activeTab,
        setActiveTab,
        config,
        isLoading,
        notification,
    } = useAppStore();

    // Load analytics opt-out preference from cookie on mount and check EU status
    React.useEffect(() => {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('analytics_opt_out='))
            ?.split('=')[1];
        
        // Check if already opted out via cookie
        if (cookieValue === 'true') {
            setAnalyticsOptOut(true);
        } else {
            // Check if user is from EU and should auto opt-out
            fetch('/api/config')
                .then(res => res.json())
                .then(config => {
                    if (config.shouldAutoOptOut && cookieValue !== 'false') {
                        // Auto opt-out EU users (unless they explicitly opted back in)
                        setAnalyticsOptOut(true);
                        const expires = new Date();
                        expires.setFullYear(expires.getFullYear() + 1);
                        document.cookie = `analytics_opt_out=true; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
                        console.log('Auto opted-out due to EU location (GDPR compliance)');
                    } else {
                        setAnalyticsOptOut(false);
                    }
                })
                .catch(err => {
                    console.error('Failed to check EU status:', err);
                    // Default to opted out on error for safety
                    setAnalyticsOptOut(cookieValue === 'true');
                });
        }
    }, []);

    // Handle analytics opt-out toggle
    const handleAnalyticsOptOutChange = (e) => {
        const optOut = e.target.checked;
        setAnalyticsOptOut(optOut);
        
        // Set cookie with 1 year expiration
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = `analytics_opt_out=${optOut}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    };

    const isApiKeyMissing = !isLoading && !config.geminiApiKey && !config.isApiKeySetByEnv;

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-12 w-12 text-blue-500" /></div>;
        }

        if (isApiKeyMissing) {
            return <SettingsView />;
        }

        switch (activeTab) {
            case 'home':
                return <HomeView />;
            case 'agents':
                return <AgentManagementView setEditingAgentContextId={setEditingAgentContextId} />;
            case 'tools':
                return <McpServerView />;
            case 'context':
                return <ContextEditorView agentId={editingAgentContextId} />;
            case 'settings':
                return <SettingsView />;
            default:
                return null;
        }
    };

    if (!isInBigIdInstance) {
        return (
            <div className="font-sans min-h-screen flex items-center justify-center bg-slate-100">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
                    <p className="text-slate-600">
                        This application is designed to run exclusively within a BigID instance. Please access it through the BigID UI.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="font-sans min-h-screen" style={{ backgroundColor: '#fcfcfc' }}>
            {notification && <Notification type={notification.type} message={notification.message} />}
            <div className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Bot className="h-10 w-10 text-blue-600" />
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">MCP Reporting</h1>
                            </div>
                        </div>
                    </div>
                </header>

                <main>
                    <div className="border-b border-slate-200 mb-6">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <TabButton id="home" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Home />} label="Home" disabled={isApiKeyMissing} />
                            <TabButton id="tools" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Server />} label="Tools" disabled={isApiKeyMissing} />
                            <TabButton id="settings" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Settings />} label="Settings" />
                        </nav>
                    </div>
                    {isApiKeyMissing && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-800">
                                        A Gemini API Key is required. Please add your key in the Settings tab to enable all features.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100">
                        {renderContent()}
                    </div>
                </main>
                
                <footer className="mt-8 text-center text-sm text-slate-500 space-y-2">
                    <div className="flex items-center justify-center space-x-4">
                        <a 
                            href="https://bigid.com/privacy-notice" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <span>•</span>
                        <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-700 transition-colors">
                            <input
                                type="checkbox"
                                checked={analyticsOptOut}
                                onChange={handleAnalyticsOptOutChange}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Opt out of analytics</span>
                        </label>
                    </div>
                    {analyticsOptOut && (
                        <p className="text-xs text-slate-400">
                            Your prompts will not be logged for analytics purposes
                        </p>
                    )}
                </footer>
            </div>
        </div>
    );
}
