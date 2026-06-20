import React from 'react';
import { Server, PlusCircle, Save, Trash2, Settings, Wrench, Eraser, Eye, EyeOff } from './Icons';
import useAppStore from '../store/appStore';
import { tpaSet,tpaGet } from '../utils/tpa';
import { checkOAuthStatus, isOAuthRequired, getOAuthStatusDisplay } from '../utils/oauthStatus';

const McpServerView = () => {
    const {
        appId,
        config,
        mcpServers,
        isSaving,
        mcpToolsCache: toolsCache,
        setMcpServers,
        setMcpToolsCache,
        setIsSaving,
        showNotification,
    } = useAppStore();

    const [editingServerId, setEditingServerId] = React.useState(null);
    const [transport, setTransport] = React.useState('sse'); // 'sse', 'streamablehttp', or 'stdio'
    const [name, setName] = React.useState('');
    // SSE fields
    const [url, setUrl] = React.useState('');
    const [headers, setHeaders] = React.useState(''); // textarea, key: value
    const [authType, setAuthType] = React.useState('none'); // 'none', 'oauth', 'headers'
    // OAuth fields (simplified - let server handle OAuth configuration)
    const [oauthClientId, setOauthClientId] = React.useState('');
    const [oauthClientSecret, setOauthClientSecret] = React.useState('');
    // STDIO fields
    const [command, setCommand] = React.useState('');
    const [args, setArgs] = React.useState(''); // textarea, one arg per line
    const [env, setEnv] = React.useState(''); // textarea, KEY=VALUE
    
    // Connection testing state
    const [isTestingConnection, setIsTestingConnection] = React.useState(false);
    const [connectionTestResult, setConnectionTestResult] = React.useState(null);
    
    // State for controlling textarea visibility in the form
    const [showHeaders, setShowHeaders] = React.useState(false);
    const [showEnvVars, setShowEnvVars] = React.useState(false);

    const isEditing = !!editingServerId;

    // Helper function to check if stdio MCP servers are allowed
    const isStdioAllowed = () => {
        if (!config.bigidServerUrl || !config.stdioSafeHostnames) return false;
        try {
            const url = new URL(config.bigidServerUrl);
            const hostname = url.hostname;
            const safeHostnames = config.stdioSafeHostnames;
            
            return safeHostnames.some(pattern => {
                if (pattern.includes('*')) {
                    // Convert wildcard pattern to regex
                    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
                    const regex = new RegExp(`^${regexPattern}$`, 'i');
                    return regex.test(hostname);
                } else {
                    // Exact match or ends with pattern (for backward compatibility)
                    return hostname === pattern || hostname.endsWith('.' + pattern);
                }
            });
        } catch {
            return false;
        }
    };

    // Filter out stdio servers if they're not allowed
    const allowedMcpServers = mcpServers.filter(server => {
        if (server.transport === 'stdio' && !isStdioAllowed()) {
            return false;
        }
        return true;
    });

    // Reset transport to SSE if stdio is not allowed and currently selected
    React.useEffect(() => {
        if (transport === 'stdio' && !isStdioAllowed() && !isEditing) {
            setTransport('sse');
        }
    }, [transport, isStdioAllowed, isEditing]);

    const populateFormForEdit = (server) => {
        // Check if trying to edit a stdio server when it's not allowed
        if (server.transport === 'stdio' && !isStdioAllowed()) {
            const domain = config.bigidServerUrl ? new URL(config.bigidServerUrl).hostname : 'unknown';
            showNotification(`Cannot edit STDIO MCP server '${server.name}' because BigID hostname '${domain}' is not in the safe hostnames list.`, 'error');
            return;
        }

        setEditingServerId(server.id);
        setName(server.name);
        setTransport(server.transport || 'sse');
        setUrl(server.url || '');
        setHeaders(server.headers ? Object.entries(server.headers).map(([k, v]) => `${k}: ${v}`).join('\n') : '');
        setAuthType(server.authType || 'none');
        setOauthClientId(server.oauth?.clientId || '');
        setOauthClientSecret(server.oauth?.clientSecret || '');
        setCommand(server.command || '');
        setArgs(server.args ? server.args.join('\n') : '');
        setEnv(server.env ? Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n') : '');
    };

    const resetForm = () => {
        setName('');
        setUrl('');
        setHeaders('');
        setAuthType('none');
        setOauthClientId('');
        setOauthClientSecret('');
        setCommand('');
        setArgs('');
        setEnv('');
        setEditingServerId(null);
        setConnectionTestResult(null);
        setShowHeaders(false);
        setShowEnvVars(false);
    };

    const testMcpConnection = async () => {
        if ((transport === 'sse' || transport === 'streamablehttp') && !url) {
            showNotification('Server URL is required to test connection.', 'error');
            return;
        }
        if (transport === 'stdio' && !command) {
            showNotification('Command is required to test connection.', 'error');
            return;
        }

        setIsTestingConnection(true);
        setConnectionTestResult(null);

        try {
            // Build the server config for testing
            const testServerConfig = {
                name: name || 'Test Server',
                transport
            };

            // If testing an existing server, include the id for OAuth token lookup
            if (url) {
                const existingServer = mcpServers.find(s => s.url === url);
                if (existingServer && existingServer.id) {
                    testServerConfig.id = existingServer.id;
                }
            }

            if (transport === 'sse' || transport === 'streamablehttp') {
                testServerConfig.url = url;
                testServerConfig.authType = authType;
                
                if (authType === 'oauth') {
                    testServerConfig.oauth = { enabled: true };
                } else if (authType === 'headers' && headers) {
                    testServerConfig.headers = headers.split('\n').reduce((acc, line) => {
                        const [key, ...valueParts] = line.split(':');
                        if (key && valueParts.length > 0) {
                            acc[key.trim()] = valueParts.join(':').trim();
                        }
                        return acc;
                    }, {});
                }
            } else {
                testServerConfig.command = command;
                if (args) {
                    testServerConfig.args = args.split('\n').filter(a => a.trim() !== '');
                }
                if (env) {
                    testServerConfig.env = env.split('\n').reduce((acc, line) => {
                        const [key, ...valueParts] = line.split('=');
                        if (key && valueParts.length > 0) {
                            acc[key.trim()] = valueParts.join('=').trim();
                        }
                        return acc;
                    }, {});
                }
            }

            // Call backend API to test the connection
            const response = await fetch('/api/test-mcp-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    serverConfig: testServerConfig,
                    bigidBaseUrl: config.bigidServerUrl,
                    tpaId: appId,
                    bigidToken: config.bigidAuthToken
                }),
            });

            const result = await response.json();

            if (response.ok) {
                setConnectionTestResult({
                    success: true,
                    tools: result.tools || [],
                    message: `✅ Successfully connected! Discovered ${result.tools?.length || 0} tools.`
                });
                
                // Note: Tools cache is managed by the backend only
                // Connection test results are shown in the UI but don't update the cache
                
                showNotification(`Connection successful! Found ${result.tools?.length || 0} tools.`, 'success');
            } else if (result.requiresOAuth) {
                // Handle OAuth authorization requirement
                const existingServer = mcpServers.find(s => s.url === url);
                const canStartOAuth = existingServer && existingServer.id;
                
                setConnectionTestResult({
                    success: false,
                    requiresOAuth: true,
                    serverUrl: result.serverUrl,
                    canStartOAuth: canStartOAuth,
                    message: canStartOAuth 
                        ? `🔐 OAuth 2.1 authorization required. Click "Start OAuth Flow" to authenticate.`
                        : `🔐 OAuth 2.1 authorization required. Click "Save & Start OAuth" to save server and begin authentication.`
                });
                
                const notificationMessage = canStartOAuth 
                    ? 'OAuth 2.1 authorization required following MCP specification.'
                    : 'Server must be saved before OAuth flow can be completed.';
                    
                showNotification(notificationMessage, 'warning');
            } else {
                setConnectionTestResult({
                    success: false,
                    error: result.error || 'Connection failed',
                    message: `❌ Connection failed: ${result.error || 'Unknown error'}`
                });
                showNotification(`Connection failed: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error testing MCP connection:', error);
            setConnectionTestResult({
                success: false,
                error: error.message,
                message: `❌ Connection test failed: ${error.message}`
            });
            showNotification(`Connection test failed: ${error.message}`, 'error');
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleOAuthFlow = async () => {
        try {
            const serverUrl = connectionTestResult.serverUrl || url;
            if (!serverUrl) {
                showNotification('Server URL is required for OAuth flow.', 'error');
                return;
            }

            // Find the server config to get the id
            const serverConfig = mcpServers.find(s => s.url === serverUrl);
            if (!serverConfig || !serverConfig.id) {
                showNotification('Server must be saved before OAuth flow can be started.', 'error');
                return;
            }
            
            await performOAuthFlow(serverConfig);
        } catch (error) {
            console.error('OAuth flow error:', error);
            showNotification(`OAuth flow failed: ${error.message}`, 'error');
        }
    };

    const performOAuthFlow = async (serverConfig) => {
        try {
            showNotification('Starting OAuth 2.1 flow following MCP specification...', 'info');

            // Initialize OAuth flow with BigID context
            const response = await fetch('/api/mcp/oauth/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    serverUrl: serverConfig.url,
                    serverId: serverConfig.id,
                    bigidBaseUrl: config.bigidServerUrl,
                    tpaId: appId,
                    bigidToken: config.bigidAuthToken
                }),
            });

            const result = await response.json();

            if (result.success && result.authorizationUrl) {
                showNotification('Opening OAuth authorization in new window...', 'info');
                
                // Open authorization URL in popup window
                const authWindow = window.open(
                    result.authorizationUrl,
                    'mcp-oauth',
                    'width=600,height=700,scrollbars=yes,resizable=yes'
                );

                // Listen for OAuth callback message from popup
                const handleOAuthMessage = async (event) => {
                    if (event.data.type === 'oauth-callback') {
                        window.removeEventListener('message', handleOAuthMessage);
                        
                        try {
                            showNotification('Processing OAuth authorization...', 'info');
                            
                            // Get OAuth configuration directly from TPA storage using the server's id
                            const serverId = serverConfig.id;
                            const serverMetadataKey = `oauth_server_metadata_${serverId}`;
                            const clientInfoKey = `oauth_client_${serverId}`;
                            const pkceKey = `oauth_pkce_${serverId}`;
                            
                            const [serverMetadata, clientInfo, pkce] = await Promise.all([
                                tpaGet(appId, serverMetadataKey),
                                tpaGet(appId, clientInfoKey),
                                tpaGet(appId, pkceKey)
                            ]);
                            
                            if (!serverMetadata || !clientInfo) {
                                throw new Error('Missing OAuth session data. Please try initializing OAuth again.');
                            }
                            
                            // PKCE is optional - some servers don't support it
                            if (!pkce) {
                            }
                            
                            // Create callback URL (same logic as backend)
                            const callbackUrl = `${window.location.origin}/api/mcp/oauth/callback`;
                            
                            // Exchange authorization code for tokens directly
                            const tokenParams = {
                                grant_type: 'authorization_code',
                                client_id: clientInfo.client_id,
                                code: event.data.code,
                                redirect_uri: callbackUrl
                            };
                            
                            // Only include code_verifier if PKCE was used
                            if (pkce && pkce.codeVerifier) {
                                tokenParams.code_verifier = pkce.codeVerifier;
                            }
                            
                            const tokenResponse = await fetch(serverMetadata.token_endpoint, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: new URLSearchParams(tokenParams)
                            });
                            
                            if (!tokenResponse.ok) {
                                const errorText = await tokenResponse.text();
                                throw new Error(`Token exchange failed: ${errorText}`);
                            }
                            
                            const tokens = await tokenResponse.json();
                            
                            // Add issued_at timestamp for expiration tracking
                            const tokensWithTimestamp = {
                                ...tokens,
                                issued_at: Date.now()
                            };
                            
                            
                            // Update the React state with OAuth tokens - let existing state management handle persistence
                            const updatedServers = mcpServers.map(server => 
                                server.id === serverId 
                                    ? { ...server, oauthTokens: tokensWithTimestamp }
                                    : server
                            );
                            setMcpServers(updatedServers);
                            
                            // Clean up temporary OAuth data (only if PKCE was used)
                            if (pkce) {
                                await tpaSet(appId, pkceKey, null);
                            }
                            
                            showNotification('OAuth authorization completed successfully!', 'success');
                            
                            // Test connection again to verify it works with the new tokens
                            setTimeout(() => {
                                testMcpConnection();
                            }, 1000);
                            
                        } catch (error) {
                            console.error('OAuth token exchange error:', error);
                            showNotification(`OAuth authorization failed: ${error.message}`, 'error');
                        }
                    } else if (event.data.type === 'oauth-error') {
                        window.removeEventListener('message', handleOAuthMessage);
                        const errorMsg = event.data.error_description || event.data.error || 'Unknown OAuth error';
                        console.error('OAuth authorization error received:', errorMsg);
                        showNotification(`OAuth authorization failed: ${errorMsg}`, 'error');
                    }
                };

                window.addEventListener('message', handleOAuthMessage);

                // Poll for window closure (user cancelled or completed)
                const pollForCompletion = setInterval(() => {
                    if (authWindow.closed) {
                        clearInterval(pollForCompletion);
                        window.removeEventListener('message', handleOAuthMessage);
                        showNotification('OAuth window closed.', 'info');
                    }
                }, 1000);

            } else {
                throw new Error(result.details || result.error || 'Failed to initialize OAuth flow');
            }

        } catch (error) {
            console.error('OAuth flow error:', error);
            showNotification(`OAuth flow failed: ${error.message}`, 'error');
        }
    };

    const handleOAuthHelp = () => {
        // Show help information about MCP OAuth
        showNotification(
            'MCP OAuth 2.1: This server supports OAuth authentication following the MCP Authorization specification. ' +
            'The server will automatically handle authorization server discovery, dynamic client registration (if supported), ' +
            'and PKCE-secured authorization flow. No manual configuration is needed.',
            'info'
        );
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!name) {
            alert('Server Name is required.');
            return;
        }

        // Check if stdio transport is allowed
        if (transport === 'stdio' && !isStdioAllowed()) {
            const domain = config.bigidServerUrl ? new URL(config.bigidServerUrl).hostname : 'unknown';
            const safeHostnames = config.stdioSafeHostnames || [];
            showNotification(`STDIO MCP servers are not allowed for BigID hostname '${domain}'. Only hostnames in the safe list support STDIO servers: [${safeHostnames.join(', ')}]`, 'error');
            return;
        }

        let serverConfig = { 
            id: editingServerId || `mcp_${Date.now()}`, 
            name, 
            transport
        };

        if (transport === 'sse' || transport === 'streamablehttp') {
            if (!url) {
                alert(`Server URL is required for ${transport.toUpperCase()} transport.`);
                return;
            }
            serverConfig.url = url;
            serverConfig.authType = authType;
            
            if (authType === 'oauth') {
                // OAuth configuration will be handled automatically by MCP client
                // following the MCP authorization specification
                serverConfig.oauth = { enabled: true };
            } else if (authType === 'headers' && headers) {
                serverConfig.headers = headers.split('\n').reduce((acc, line) => {
                    const [key, ...valueParts] = line.split(':');
                    if (key && valueParts.length > 0) {
                        acc[key.trim()] = valueParts.join(':').trim();
                    }
                    return acc;
                }, {});
            }
        } else { // stdio
            if (!command) {
                alert('Command is required for STDIO transport.');
                return;
            }
            serverConfig.command = command;
            if (args) {
                serverConfig.args = args.split('\n').filter(a => a.trim() !== '');
            }
            if (env) {
                serverConfig.env = env.split('\n').reduce((acc, line) => {
                    const [key, ...valueParts] = line.split('=');
                    if (key && valueParts.length > 0) {
                        acc[key.trim()] = valueParts.join('=').trim();
                    }
                    return acc;
                }, {});
            }
        }

        if (isEditing) {
            await updateMcpServer(serverConfig);
        } else {
            await addMcpServer(serverConfig);
        }
        resetForm();
    };

    const addMcpServer = async (server) => {
        const updatedServers = [...mcpServers, server];
        setIsSaving(true);
        try {
            // The store's setMcpServers function handles both state update and TPA persistence
            setMcpServers(updatedServers);
            showNotification('MCP Server added!', 'success');
        } catch (error) {
            console.error("Error adding MCP server:", error);
            showNotification('Failed to add MCP server.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updateMcpServer = async (serverToUpdate) => {
        const updatedServers = mcpServers.map(s => 
            s.id === serverToUpdate.id 
                ? { ...s, ...serverToUpdate } // Merge with existing server to preserve oauthTokens and other properties
                : s
        );
        setIsSaving(true);
        try {
            // The store's setMcpServers function handles both state update and TPA persistence
            setMcpServers(updatedServers);
            // Don't clear tools cache on update - only clear if server config changed significantly
            // Tools cache will be refreshed automatically when needed
            showNotification('MCP Server updated!', 'success');
        } catch (error) {
            console.error("Error updating MCP server:", error);
            showNotification('Failed to update MCP server.', 'error');
        } finally {
            setIsSaving(false);
            setEditingServerId(null);
        }
    };

    const deleteMcpServer = async (serverId) => {
        const updatedServers = mcpServers.filter(s => s.id !== serverId);
        setIsSaving(true);
        try {
            // The store's setMcpServers function handles both state update and TPA persistence
            setMcpServers(updatedServers);
            // Clean up the tools cache for the deleted server
            const newToolsCache = { ...toolsCache };
            delete newToolsCache[serverId];
            setMcpToolsCache(newToolsCache);
            showNotification('MCP Server removed.', 'info');
        } catch (error) {
            console.error("Error deleting MCP server:", error);
            showNotification('Failed to delete MCP server.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const clearServerCache = async (serverId, serverName) => {
        try {
            const newToolsCache = { ...toolsCache };
            delete newToolsCache[serverId];
            setMcpToolsCache(newToolsCache);
            showNotification(`Cache cleared for ${serverName}.`, 'info');
        } catch (error) {
            console.error("Error clearing server cache:", error);
            showNotification('Failed to clear server cache.', 'error');
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-700 mb-4">MCP Tool Servers</h2>
            <p className="text-sm text-slate-600 mb-2">
                Connect to external MCP servers to provide agents with additional tools. Supports remote (SSE) and local (STDIO) servers.
            </p>
            {!isStdioAllowed() && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-6">
                    <p className="text-sm text-amber-800">
                        ⚠️ <strong>Note:</strong> STDIO (local command) servers are restricted for this BigID instance. 
                        Only hostnames in the safe list support STDIO servers for security reasons.
                        {config.stdioSafeHostnames && config.stdioSafeHostnames.length > 0 && (
                            <><br />Safe hostnames: {config.stdioSafeHostnames.join(', ')}</>
                        )}
                    </p>
                </div>
            )}

            {/* Add/Edit Form */}
            <form onSubmit={handleFormSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
                <h3 className="text-lg font-bold text-slate-700 md:col-span-2">{isEditing ? 'Edit MCP Server' : 'Add New MCP Server'}</h3>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Server Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., My Custom Tools" className="w-full p-2 border border-slate-300 rounded-md shadow-sm" required />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Transport Type</label>
                    <select 
                        value={transport} 
                        onChange={(e) => {
                            const newTransport = e.target.value;
                            if (newTransport === 'stdio' && !isStdioAllowed()) {
                                showNotification('STDIO servers are not allowed for this BigID domain.', 'error');
                                return;
                            }
                            setTransport(newTransport);
                        }} 
                        className="w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white"
                    >
                        <option value="sse">SSE (Remote URL)</option>
                        <option value="streamablehttp">StreamableHTTP (Remote URL)</option>
                        <option value="stdio" disabled={!isStdioAllowed()}>
                            STDIO (Local Command) {!isStdioAllowed() ? '- Not allowed for this BigID domain' : ''}
                        </option>
                    </select>
                    {!isStdioAllowed() && (
                        <p className="text-xs text-amber-600 mt-1">
                            ⚠️ STDIO servers are only allowed for BigID hostnames in the safe list
                            {config.stdioSafeHostnames && config.stdioSafeHostnames.length > 0 && (
                                <>: {config.stdioSafeHostnames.join(', ')}</>
                            )}
                        </p>
                    )}
                </div>

                {(transport === 'sse' || transport === 'streamablehttp') && (
                    <>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Server URL</label>
                            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://my-mcp-server.com" className="w-full p-2 border border-slate-300 rounded-md shadow-sm" required />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Authentication Type</label>
                            <select value={authType} onChange={(e) => setAuthType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white">
                                <option value="none">No Authentication</option>
                                <option value="headers">Headers (API Keys, Bearer Tokens)</option>
                                <option value="oauth">OAuth 2.0</option>
                            </select>
                        </div>

                        {authType === 'headers' && (
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-slate-600">Headers (one per line)</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowHeaders(!showHeaders)}
                                        className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        {showHeaders ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        <span>{showHeaders ? 'Hide' : 'Show'}</span>
                                    </button>
                                </div>
                                <textarea 
                                    value={headers} 
                                    onChange={(e) => setHeaders(e.target.value)} 
                                    rows="3" 
                                    placeholder="Authorization: Bearer my-token&#x0a;X-API-Key: abc123" 
                                    className="w-full p-2 border border-slate-300 rounded-md shadow-sm font-mono text-sm"
                                    type={showHeaders ? "text" : "password"}
                                    style={showHeaders ? {} : { 
                                        WebkitTextSecurity: 'disc',
                                        fontFamily: 'monospace',
                                        letterSpacing: '2px'
                                    }}
                                />
                            </div>
                        )}

                        {authType === 'oauth' && (
                            <div className="md:col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800 mb-3">
                                    <strong>OAuth 2.0 Authentication:</strong> This server uses OAuth 2.0 following the 
                                    <a href="https://modelcontextprotocol.io/specification/draft/basic/authorization" target="_blank" rel="noopener noreferrer" className="underline">
                                        MCP Authorization specification
                                    </a>.
                                </p>
                                <p className="text-sm text-slate-600 mb-2">
                                    The MCP client will automatically:
                                </p>
                                <ul className="text-sm text-slate-600 space-y-1 mb-3">
                                    <li>• Discover the server's authorization endpoints</li>
                                    <li>• Register dynamically with the authorization server (if supported)</li>
                                    <li>• Handle the OAuth 2.1 authorization flow with PKCE</li>
                                    <li>• Manage access tokens and refresh as needed</li>
                                </ul>
                                <p className="text-xs text-slate-500">
                                    No manual configuration required. The server will guide you through authorization when you first connect.
                                </p>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-4">
                                <button 
                                    type="button" 
                                    onClick={testMcpConnection}
                                    disabled={isTestingConnection || !url || (authType === 'oauth' && !isEditing && !mcpServers.find(s => s.url === url))}
                                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:bg-slate-400"
                                >
                                    <Settings className={`h-4 w-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
                                    <span>{isTestingConnection ? 'Testing...' : (authType === 'oauth' && !isEditing && !mcpServers.find(s => s.url === url)) ? 'Save Server First' : 'Test Connection'}</span>
                                </button>
                                {connectionTestResult && (
                                    <div className="flex items-center gap-2">
                                        <div className={`text-sm font-medium ${connectionTestResult.success ? 'text-green-600' : connectionTestResult.requiresOAuth ? 'text-orange-600' : 'text-red-600'}`}>
                                            {connectionTestResult.message}
                                        </div>
                                        {connectionTestResult.requiresOAuth && (
                                            <div className="flex gap-2">
                                                {connectionTestResult.canStartOAuth ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleOAuthFlow}
                                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors font-medium"
                                                    >
                                                        Start OAuth Flow
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleFormSubmit}
                                                        className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors font-medium"
                                                    >
                                                        Save Server First
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleOAuthHelp}
                                                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                                                >
                                                    Help
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {connectionTestResult?.success && connectionTestResult.tools && connectionTestResult.tools.length > 0 && (
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm font-medium text-green-800 mb-2">Available Tools:</p>
                                    <div className="text-xs text-green-700 space-y-1 max-h-32 overflow-y-auto">
                                        {connectionTestResult.tools.map((tool, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Wrench className="h-3 w-3 flex-shrink-0" />
                                                <span className="font-mono">{tool.name}</span>
                                                {tool.description && <span className="text-green-600">- {tool.description}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {transport === 'stdio' && (
                     <>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Command</label>
                            <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx" className="w-full p-2 border border-slate-300 rounded-md shadow-sm" required />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-600">Environment Variables (one per line)</label>
                                <button
                                    type="button"
                                    onClick={() => setShowEnvVars(!showEnvVars)}
                                    className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    {showEnvVars ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    <span>{showEnvVars ? 'Hide' : 'Show'}</span>
                                </button>
                            </div>
                            <textarea 
                                value={env} 
                                onChange={(e) => setEnv(e.target.value)} 
                                rows="3" 
                                placeholder="API_KEY=abc-123" 
                                className="w-full p-2 border border-slate-300 rounded-md shadow-sm font-mono text-sm"
                                style={showEnvVars ? {} : { 
                                    WebkitTextSecurity: 'disc',
                                    fontFamily: 'monospace',
                                    letterSpacing: '2px'
                                }}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Arguments (one per line)</label>
                            <textarea value={args} onChange={(e) => setArgs(e.target.value)} rows="4" placeholder="-y&#x0a;@smithery/cli@latest&#x0a;run&#x0a;exa" className="w-full p-2 border border-slate-300 rounded-md shadow-sm font-mono text-sm"></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-4">
                                <button 
                                    type="button" 
                                    onClick={testMcpConnection}
                                    disabled={isTestingConnection || !command}
                                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:bg-slate-400"
                                >
                                    <Settings className={`h-4 w-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
                                    <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
                                </button>
                                {connectionTestResult && (
                                    <div className={`text-sm font-medium ${connectionTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                        {connectionTestResult.message}
                                    </div>
                                )}
                            </div>
                            {connectionTestResult?.success && connectionTestResult.tools && connectionTestResult.tools.length > 0 && (
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm font-medium text-green-800 mb-2">Available Tools:</p>
                                    <div className="text-xs text-green-700 space-y-1 max-h-32 overflow-y-auto">
                                        {connectionTestResult.tools.map((tool, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Wrench className="h-3 w-3 flex-shrink-0" />
                                                <span className="font-mono">{tool.name}</span>
                                                {tool.description && <span className="text-green-600">- {tool.description}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
                
                <div className="md:col-span-2 flex justify-end items-center gap-4">
                    {isEditing && (
                        <button type="button" onClick={resetForm} className="text-sm font-semibold text-slate-600 hover:text-slate-800">
                            Cancel
                        </button>
                    )}
                    <button type="submit" disabled={isSaving} className="flex items-center justify-center space-x-2 bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 disabled:bg-slate-400">
                        {isEditing ? <Save className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
                        <span>{isSaving ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Server' : 'Add Server')}</span>
                    </button>
                </div>
            </form>

            {/* Server List */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-2">Configured Servers</h3>
                
                {/* Built-in BigID Server */}
                <div className="flex items-start justify-between bg-white p-3 rounded-md border border-slate-200">
                    <div className="flex items-start space-x-4">
                        <Server className="h-6 w-6 text-slate-500 mt-1" />
                        <div className="flex-grow">
                            <div className="flex items-center space-x-2">
                                <p className="font-bold text-slate-800">BigID Tools</p>
                                {Array.isArray(toolsCache['bigid-mcp-local']) && toolsCache['bigid-mcp-local'].length > 0 && (
                                    <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                        <Wrench className="h-3 w-3" title={toolsCache['bigid-mcp-local'].map(t => t.name).join(', ')} />
                                        <span>{toolsCache['bigid-mcp-local'].length}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-slate-600 font-mono">local</p>
                            <p className="text-xs text-slate-500 mt-1">Provides tools to access data from your currently logged-in BigID installation.</p>
                        </div>
                    </div>
                </div>

                {allowedMcpServers.map(server => {
                    // OAuth Status Component
                    const OAuthStatusIndicator = () => {
                        const [oauthStatus, setOauthStatus] = React.useState(null);
                        
                        React.useEffect(() => {
                            if (isOAuthRequired(server) && server.id) {
                                // Check OAuth status directly from the server object instead of fetching from storage
                                const tokens = server.oauthTokens;
                                
                                if (!tokens || !tokens.access_token) {
                                    setOauthStatus({
                                        isConfigured: false,
                                        hasValidToken: false,
                                        reason: 'No OAuth tokens found'
                                    });
                                    return;
                                }
                                
                                // Check if token has expiration info
                                if (!tokens.expires_in) {
                                    setOauthStatus({
                                        isConfigured: true,
                                        hasValidToken: true,
                                        reason: 'Token exists (no expiration info available)',
                                        tokens: {
                                            hasAccessToken: true,
                                            hasRefreshToken: !!tokens.refresh_token
                                        }
                                    });
                                    return;
                                }
                                
                                // Calculate expiration time
                                const expirationTime = tokens.issued_at + (tokens.expires_in * 1000);
                                const bufferTime = 5 * 60 * 1000; // 5 minutes
                                const isExpired = Date.now() >= (expirationTime - bufferTime);
                                
                                setOauthStatus({
                                    isConfigured: true,
                                    hasValidToken: !isExpired,
                                    expiresAt: expirationTime,
                                    expiresIn: Math.max(0, expirationTime - Date.now()),
                                    reason: isExpired ? 'Token expired' : 'Token valid',
                                    tokens: {
                                        hasAccessToken: true,
                                        hasRefreshToken: !!tokens.refresh_token,
                                        tokenType: tokens.token_type || 'Bearer'
                                    }
                                });
                            }
                        }, [server.id, server.oauthTokens]);
                        
                        if (!isOAuthRequired(server)) return null;
                        
                        if (!oauthStatus) {
                            return (
                                <div className="text-xs text-slate-500 mt-1">
                                    Checking OAuth status...
                                </div>
                            );
                        }
                        
                        const display = getOAuthStatusDisplay(oauthStatus);
                        
                        return (
                            <div className={`text-xs font-medium px-2 py-1 rounded-md mt-1 ${display.bgColor} ${display.borderColor} ${display.color} border`}>
                                {display.icon} OAuth: {display.text}
                            </div>
                        );
                    };
                    
                    return (
                        <div key={server.id} className="flex items-start justify-between bg-white p-3 rounded-md border border-slate-200">
                            <div className="flex items-start space-x-4">
                                <Server className="h-6 w-6 text-slate-500 mt-1" />
                                <div className="flex-grow">
                                    <div className="flex items-center space-x-2">
                                        <p className="font-bold text-slate-800">{server.name}</p>
                                        {Array.isArray(toolsCache[server.id]) && toolsCache[server.id].length > 0 && (
                                            <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                <Wrench className="h-3 w-3" title={toolsCache[server.id].map(t => t.name).join(', ')} />
                                                <span>{toolsCache[server.id].length}</span>
                                            </div>
                                        )}
                                    </div>
                                    {(server.transport === 'sse' || server.transport === 'streamablehttp') ? (
                                        <>
                                            <p className="text-sm text-slate-600 font-mono">{server.url}</p>
                                            <p className="text-xs text-slate-500 uppercase">{server.transport}</p>
                                            <OAuthStatusIndicator />
                                        </>
                                    ) : (
                                         <>
                                            <p className="text-sm text-slate-600 font-mono">{server.command} {server.args?.join(' ')}</p>
                                            <p className="text-xs text-slate-500 uppercase">stdio</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center flex-shrink-0 ml-4">
                                <button onClick={() => populateFormForEdit(server)} disabled={isSaving} title="Edit Server" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors disabled:text-slate-300 disabled:hover:bg-transparent"><Settings className="h-4 w-4" /></button>
                                {Array.isArray(toolsCache[server.id]) && toolsCache[server.id].length > 0 && (
                                    <button onClick={() => clearServerCache(server.id, server.name)} disabled={isSaving} title="Clear Cache" className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-100 rounded-md transition-colors disabled:text-slate-300 disabled:hover:bg-transparent"><Eraser className="h-4 w-4" /></button>
                                )}
                                <button onClick={() => deleteMcpServer(server.id)} disabled={isSaving} title="Delete Server" className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:text-slate-300 disabled:hover:bg-transparent"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </div>
                    );
                })}
                {allowedMcpServers.length === 0 && mcpServers.length === 0 && <p className="text-center text-slate-500 py-4">No custom MCP servers configured.</p>}
                {allowedMcpServers.length === 0 && mcpServers.length > 0 && (
                    <div className="text-center py-4">
                        <p className="text-slate-500 mb-2">No MCP servers available for display.</p>
                        <p className="text-xs text-amber-600">Some STDIO servers may be hidden because they're not allowed for this BigID hostname.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default McpServerView;
