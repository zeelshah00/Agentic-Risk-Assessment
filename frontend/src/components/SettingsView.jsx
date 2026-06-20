import React, { useRef, useState, useEffect } from 'react';
import { Save, Download, Upload } from './Icons';
import useAppStore from '../store/appStore';
import { tpaSet, tpaGet } from '../utils/tpa';

const SettingsView = () => {
    const fileInputRef = useRef(null);
    const [usageLimits, setUsageLimits] = useState(null);
    const [loadingUsage, setLoadingUsage] = useState(true);
    const [geoInfo, setGeoInfo] = useState(null);
    const [loadingGeo, setLoadingGeo] = useState(true);
    const {
        appId,
        config,
        isSaving,
        setConfig,
        setIsSaving,
        showNotification,
        agents,
        mcpServers,
        setAgents,
        setMcpServers,
        bigidContext,
        availableModels,
        selectedModel,
        isLoadingModels,
        loadAvailableModels,
        setSelectedModel,
    } = useAppStore();

    // Load available models on component mount
    useEffect(() => {
        if (appId) {
            loadAvailableModels();
        }
    }, [appId, loadAvailableModels]);

    // Fetch geo information on component mount
    useEffect(() => {
        const fetchGeoInfo = async () => {
            try {
                const response = await fetch('/api/config');
                if (!response.ok) {
                    throw new Error('Failed to fetch geo information');
                }
                const data = await response.json();
                setGeoInfo({
                    country: data.userCountry || 'Unknown',
                    isEU: data.isEU || false,
                    shouldAutoOptOut: data.shouldAutoOptOut || false
                });
            } catch (error) {
                console.error('Error fetching geo information:', error);
                setGeoInfo({
                    country: 'Unknown',
                    isEU: false,
                    shouldAutoOptOut: false,
                    error: error.message
                });
            } finally {
                setLoadingGeo(false);
            }
        };

        fetchGeoInfo();
    }, []);

    // Fetch usage limits on component mount
    useEffect(() => {
        const fetchUsageLimits = async () => {
            if (!appId || !bigidContext?.bigidBaseUrl || !bigidContext?.bigidToken) {
                setLoadingUsage(false);
                return;
            }

            try {
                // Call the backend API endpoint with credentials for security
                const response = await fetch(
                    `/api/usage-limits?bigidBaseUrl=${encodeURIComponent(bigidContext.bigidBaseUrl)}&bigidToken=${encodeURIComponent(bigidContext.bigidToken)}`
                );
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to fetch usage limits: ${response.status}`);
                }
                
                const usageLimitsData = await response.json();
                setUsageLimits(usageLimitsData);
                
            } catch (error) {
                console.error('Error fetching usage limits:', error);
                // Set default values on error
                setUsageLimits({
                    dailyTokenLimit: 0,
                    currentUsage: 0,
                    environmentName: 'unknown',
                    isLimited: false,
                    remainingTokens: null,
                    error: error.message
                });
            } finally {
                setLoadingUsage(false);
            }
        };

        fetchUsageLimits();
    }, [appId, bigidContext?.bigidBaseUrl, bigidContext?.bigidToken]);

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            handleImport(file);
        }
    };

    const handleConfigChange = (e) => {
        setConfig({ [e.target.name]: e.target.value });
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            if (config.isUsingRole) {
                showNotification('Authentication is handled by an IAM role and cannot be changed here.', 'info');
                setIsSaving(false);
                return;
            }
            if (config.isApiKeySetByEnv) {
                showNotification('API key is set by an environment variable and cannot be changed here.', 'info');
                setIsSaving(false);
                return;
            }
            // The store's setConfig will handle persistence
            setConfig({ geminiApiKey: config.geminiApiKey });
            showNotification('Settings saved to BigID TPA Storage!');
        } catch (error) {
            console.error("Error saving settings:", error);
            showNotification('Failed to save settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        showNotification('Exporting settings...', 'info');
        try {
            const allSettings = {
                config: { geminiApiKey: config.geminiApiKey }, // Only export the key
                agents: agents,
                mcpServers: mcpServers.filter(s => s.id !== 'bigid-mcp-local'), // Don't export the built-in server
            };
            const jsonString = JSON.stringify(allSettings, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gemini-agent-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('Settings exported successfully!', 'success');
        } catch (error) {
            console.error("Error exporting settings:", error);
            showNotification('Failed to export settings.', 'error');
        }
    };

    const handleImport = (file) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedSettings = JSON.parse(event.target.result);
                const { config: importedConfig, agents: importedAgents, mcpServers: importedMcpServers } = importedSettings;

                if (!importedAgents || !importedMcpServers) {
                    throw new Error("Invalid or incomplete settings file. 'agents' and 'mcpServers' are required.");
                }

                if (confirm('Are you sure you want to import these settings? This will overwrite your current configuration.')) {
                    setIsSaving(true);
                    
                    // The store setters will handle both state update and TPA persistence.
                    // No need for Promise.all with direct tpaSet calls.
                    if (importedConfig) {
                        setConfig(importedConfig);
                    }
                    setAgents(importedAgents);
                    // The store now only contains user-configured servers
                    setMcpServers(importedMcpServers);
                    
                    showNotification('Settings imported and saved successfully!', 'success');
                }
            } catch (error) {
                console.error("Error importing settings:", error);
                showNotification(`Failed to import settings: ${error.message}`, 'error');
            } finally {
                setIsSaving(false);
            }
        };
        reader.readAsText(file);
    };

    return (
    <div>
        <h2 className="text-xl font-bold text-slate-700 mb-4">Connection Settings</h2>
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                    <svg className="h-5 w-5 text-blue-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                    <label className="block text-sm font-semibold text-blue-800">Authentication Method</label>
                </div>
                <div className="w-full p-3 rounded-md shadow-sm bg-white border border-blue-200">
                    <span className="font-mono text-blue-900">IAM Role Authentication</span>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                    This application uses Google Cloud IAM authentication with the <code className="bg-blue-100 px-1 rounded">roles/aiplatform.user</code> permission. 
                    No API keys are required or stored.
                </p>
            </div>
            <div>
                <label htmlFor="bigidServerUrl" className="block text-sm font-medium text-slate-600 mb-1">BigID Server URL</label>
                <input type="text" name="bigidServerUrl" id="bigidServerUrl" value={config.bigidServerUrl} readOnly placeholder="Loading from BigID..." className="w-full p-2 border border-slate-300 rounded-md shadow-sm bg-slate-100" />
                <p className="text-xs text-slate-500 mt-1">The base URL of your BigID instance, provided automatically by the SDK.</p>
            </div>
        </div>

        {/* AI Model Selection Section */}
        <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-700 mb-4">AI Model Selection</h2>
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 mb-2">
                        <strong>Model Garden Integration:</strong> When using IAM authentication, you can choose between Google's Gemini models and Anthropic's Claude models through Vertex AI's Model Garden.
                    </p>
                    <p className="text-xs text-blue-700">
                        All models use the same authentication method and are billed through your Google Cloud account.
                    </p>
                </div>
                
                <div>
                    <label htmlFor="selectedModel" className="block text-sm font-medium text-slate-600 mb-2">
                        Selected AI Model
                    </label>
                    {isLoadingModels ? (
                        <div className="w-full p-3 border border-slate-300 rounded-md bg-slate-50 text-slate-500 text-sm">
                            Loading available models...
                        </div>
                    ) : availableModels.length > 0 ? (
                        <select
                            id="selectedModel"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            {availableModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name} ({model.provider}) - {model.description}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="w-full p-3 border border-red-300 rounded-md bg-red-50 text-red-700 text-sm">
                            Failed to load available models. Please check your connection and authentication.
                        </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                        Your selected model will be used for all new chat sessions. Existing sessions will continue using their original model.
                    </p>
                </div>

                {selectedModel && availableModels.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        {(() => {
                            const currentModel = availableModels.find(m => m.id === selectedModel);
                            if (!currentModel) return null;
                            
                            return (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-slate-700">Current Selection</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium text-slate-600">Model:</span>
                                            <div className="text-slate-800">{currentModel.name}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-600">Provider:</span>
                                            <div className="text-slate-800">{currentModel.provider}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-600">Category:</span>
                                            <div className="text-slate-800">{currentModel.category}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-600">Description:</span>
                                        <div className="text-slate-800">{currentModel.description}</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>

        {/* Usage Limits Section */}
        <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-700 mb-4">Token Usage Limits</h2>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                {loadingUsage ? (
                    <div className="text-sm text-slate-600">Loading usage information...</div>
                ) : usageLimits ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-slate-600">Environment:</span>
                                    <span className="text-sm text-slate-800 font-mono bg-slate-200 px-2 py-1 rounded">
                                        {usageLimits.environmentName}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-slate-600">Daily Token Limit:</span>
                                    <span className="text-sm text-slate-800">
                                        {usageLimits.isLimited ? usageLimits.dailyTokenLimit.toLocaleString() : 'Unlimited'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-slate-600">Current Usage:</span>
                                    <span className="text-sm text-slate-800">
                                        {usageLimits.currentUsage.toLocaleString()} tokens
                                    </span>
                                </div>
                                {usageLimits.isLimited && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium text-slate-600">Remaining:</span>
                                            <span className={`text-sm ${usageLimits.remainingTokens <= 0 ? 'text-red-600 font-semibold' : 'text-slate-800'}`}>
                                                {usageLimits.remainingTokens.toLocaleString()} tokens
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-3 mt-2">
                                            <div 
                                                className={`h-3 rounded-full transition-all duration-300 ${
                                                    usageLimits.currentUsage >= usageLimits.dailyTokenLimit 
                                                        ? 'bg-red-500' 
                                                        : usageLimits.currentUsage >= usageLimits.dailyTokenLimit * 0.8 
                                                            ? 'bg-yellow-500' 
                                                            : 'bg-green-500'
                                                }`}
                                                style={{ 
                                                    width: `${Math.min(100, (usageLimits.currentUsage / usageLimits.dailyTokenLimit) * 100)}%` 
                                                }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-slate-500 text-center">
                                            {((usageLimits.currentUsage / usageLimits.dailyTokenLimit) * 100).toFixed(1)}% of daily limit used
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="space-y-2">
                                {usageLimits.isLimited && (
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-slate-600">Resets At:</span>
                                        <span className="text-sm text-slate-800">
                                            {new Date(usageLimits.resetTime).toLocaleTimeString()}
                                        </span>
                                    </div>
                                )}
                                <div className="text-xs text-slate-500 mt-2">
                                    <p className="mb-1">
                                        <strong>Note:</strong> Usage limits are configured per environment and enforced at the server level.
                                    </p>
                                    {usageLimits.isLimited && (
                                        <p>
                                            Usage data is cryptographically signed to prevent tampering and resets daily at midnight.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        {usageLimits.remainingTokens <= 0 && usageLimits.isLimited && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                                <div className="flex items-center">
                                    <div className="text-red-400 mr-3">⚠️</div>
                                    <div>
                                        <h4 className="text-sm font-medium text-red-800">Daily Token Limit Exceeded</h4>
                                        <p className="text-xs text-red-600 mt-1">
                                            You have exceeded your daily token limit. API requests may be blocked until the limit resets.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-slate-600">
                        Unable to load usage limits. Please check your connection.
                    </div>
                )}
            </div>
        </div>
        
        {/* Geo Location & Analytics Section */}
        <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-700 mb-4">Location & Analytics Settings</h2>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                {loadingGeo ? (
                    <div className="text-sm text-slate-600">Loading location information...</div>
                ) : geoInfo ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Detected Country:</span>
                            <span className={`text-sm font-mono px-3 py-1 rounded ${
                                geoInfo.country && geoInfo.country !== 'Unknown' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-slate-200 text-slate-600'
                            }`}>
                                {geoInfo.country || 'Not detected'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">EU Region:</span>
                            <span className={`text-sm px-3 py-1 rounded ${
                                geoInfo.isEU 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-slate-200 text-slate-600'
                            }`}>
                                {geoInfo.isEU ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Auto Opt-Out (GDPR):</span>
                            <span className={`text-sm px-3 py-1 rounded ${
                                geoInfo.shouldAutoOptOut 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-slate-200 text-slate-600'
                            }`}>
                                {geoInfo.shouldAutoOptOut ? 'Enabled' : 'Not Required'}
                            </span>
                        </div>
                        {geoInfo.isEU && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                                <div className="flex items-start">
                                    <div className="text-blue-400 mr-3 mt-0.5">ℹ️</div>
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-800">GDPR Compliance</h4>
                                        <p className="text-xs text-blue-600 mt-1">
                                            As an EU user, analytics logging is automatically disabled by default to comply with GDPR regulations. 
                                            You can opt back in using the checkbox in the footer if you wish to help improve the service.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
                            <p>
                                <strong>Note:</strong> Country detection uses Cloud Run headers (X-Appengine-Country). 
                                In local development, this may show as "Unknown". The header is automatically set in production.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-slate-600">
                        Unable to load location information.
                    </div>
                )}
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-start items-center pt-8 mt-8 border-t border-slate-200">
            {/* Import/Export Buttons */}
            <div className="flex space-x-4">
                <button
                    onClick={handleExport}
                    className="flex items-center space-x-2 bg-slate-500 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors duration-200"
                >
                    <Download className="h-5 w-5" />
                    <span>Export Settings</span>
                </button>
                <button
                    onClick={handleImportClick}
                    className="flex items-center space-x-2 bg-slate-500 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors duration-200"
                >
                    <Upload className="h-5 w-5" />
                    <span>Import Settings</span>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".json"
                />
            </div>
        </div>
    </div>
    );
};

export default SettingsView;
