const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { ListToolsResultSchema } = require("@modelcontextprotocol/sdk/types.js");
const { McpOAuthClient } = require("./mcpOAuth.js");
const { TPA_STORAGE_KEYS } = require("./tpaStorageKeys.js");

const discoverToolsSse = async (serverConfig, { getTpaStorage, setTpaStorage }) => {
    const { url, name, headers } = serverConfig;
    if (!url) {
        console.warn(`URL for SSE server '${name}' is not configured. Skipping.`);
        return [];
    }
    
    console.log(`Discovering tools from SSE server.`);
    
    let transport;
    let client;
    
    try {
        // Create SSE transport with proper MCP SDK
        const sseUrl = new URL(url);
        
        const transportOptions = {};
        
        // Handle authentication
        if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled) {
            
            // Check for stored OAuth tokens (stored in the servers array)
            const serverId = serverConfig.id;
            const allServers = await getTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS) || [];
            const storedServer = allServers.find(s => s.id === serverId);
            const storedTokens = storedServer?.oauthTokens;
        
            
            if (storedTokens && storedTokens.access_token) {
                
                // Check if token has expiration info
                if (!storedTokens.expires_in || !storedTokens.issued_at) {
                    // If no expiration info, assume token is valid
                    transportOptions.eventSourceInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                    transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                } else {
                    // Check if token is expired (with 5 minute buffer)
                    const expirationTime = storedTokens.issued_at + (storedTokens.expires_in * 1000);
                    const bufferTime = 5 * 60 * 1000; // 5 minutes
                    const isExpired = Date.now() >= (expirationTime - bufferTime);
                   
                    
                    if (!isExpired) {
                        // Token is still valid
                        transportOptions.eventSourceInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                        transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
         
                    } else if (storedTokens.refresh_token) {
                        // Try to refresh the token
                        try {
                            const oauthClient = new McpOAuthClient(url, { getTpaStorage, setTpaStorage });
                            const refreshedTokens = await oauthClient.refreshAccessToken(storedTokens.refresh_token);
                            
                            // Store refreshed tokens back to the servers array
                            const updatedServer = { 
                                ...storedServer, 
                                oauthTokens: {
                                    ...refreshedTokens,
                                    issued_at: Date.now()
                                }
                            };
                            const updatedServers = allServers.map(s => 
                                s.id === serverId ? updatedServer : s
                            );
                            await setTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS, updatedServers);
                            
                            transportOptions.eventSourceInit = { headers: { 'Authorization': `Bearer ${refreshedTokens.access_token}` } };
                            transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${refreshedTokens.access_token}` } };
                        } catch (error) {
                            console.log(`Token refresh failed for server '${name}':`, error.message);
                            throw new Error('OAuth authorization required. Please complete the OAuth flow again.');
                        }
                    } else {
                        console.log(`OAuth token expired and no refresh token available.`);
                        throw new Error('OAuth authorization required. Please complete the OAuth flow again.');
                    }
                }
            } else {
                console.log(`No OAuth tokens found - OAuth authorization required.`);
                // Be more specific about the OAuth requirement
                if (!serverConfig.id) {
                    throw new Error('OAuth authorization required. Please save the server configuration first, then complete the OAuth flow.');
                } else {
                    throw new Error('OAuth authorization required. Please complete the OAuth flow first.');
                }
            }
        }
        // Add headers if provided (for header-based auth)
        else if (serverConfig.authType === 'headers' && headers && Object.keys(headers).length > 0) {
            transportOptions.eventSourceInit = { headers };
            transportOptions.requestInit = { headers };
        }
        
        transport = new SSEClientTransport(sseUrl, transportOptions);
        
        client = new Client(
            {
                name: "mcp-client",
                version: "1.0.0",
            },
            {
                capabilities: {},
            }
        );

        await client.connect(transport);
        const response = await client.request(
            { method: "tools/list" },
            ListToolsResultSchema
        );
        
        const tools = response.tools;
        console.log(`Successfully discovered tools from SSE server.`);
        return tools;
    } catch (error) {
        console.error(`Error connecting to SSE server '${name}' (${url}): ${error.message}`);
        
        // Re-throw OAuth authorization errors so they can be handled by the caller
        if (error.message.includes('OAuth authorization required')) {
            throw error;
        }
        
        // Check if this is an OAuth-enabled server that returned 401 Unauthorized
        if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled) {
            // For OAuth servers, check if we got a 401 or authentication error
            if (error.message.includes('401') || 
                error.message.includes('Unauthorized') || 
                error.message.includes('authentication') ||
                error.code === 'ECONNREFUSED' || // Server might be rejecting unauthenticated connections
                !error.message.includes('ENOTFOUND')) { // Not a DNS/network error
                
                console.log(`OAuth server '${name}' likely requires authorization`);
                throw new Error('OAuth authorization required. Please complete the OAuth flow first.');
            }
        }
        
        // A failure to connect to one MCP server is not a critical error for the whole agent run.
        return []; // Return empty array so the agent can continue without these tools.
    } finally {
        if (transport) {
            await transport.close();
        }
    }
};

const discoverToolsStdio = async (serverConfig) => {
    const { name, command, args, env } = serverConfig;
    console.log(`Discovering tools from STDIO server '${name}' by running command: ${command} ${args?.join(' ')}`);

    const transport = new StdioClientTransport({
        command,
        args,
        env: { ...env, PATH: process.env.PATH }
    });
    const client = new Client(
        {
            name: "mcp-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        const response = await client.request(
            { method: "tools/list" },
            ListToolsResultSchema
        );
        const tools = response.tools;
        console.log(`Successfully discovered ${tools.length} tools from STDIO server '${name}'`);
        return tools;
    } catch (error) {
        console.error(`Error discovering tools from STDIO server '${name}':`, error);
        return []; // Return empty array on failure
    } finally {
        await transport.close();
    }
};

const discoverToolsStreamableHttp = async (serverConfig, { getTpaStorage, setTpaStorage }) => {
    const { url, name, headers } = serverConfig;
    if (!url) {
        console.warn(`URL for StreamableHTTP server '${name}' is not configured. Skipping.`);
        return [];
    }
    
    console.log(`Discovering tools from StreamableHTTP server '${name}' at ${url}`);
    
    let transport;
    let client;
    
    try {
        // Create StreamableHTTP transport
        const httpUrl = new URL(url);
        
        const transportOptions = {};
        
        // Handle authentication
        if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled) {
            console.log(`OAuth 2.1 authentication configured for StreamableHTTP server '${name}'`);
            
            // Check for stored OAuth tokens (stored in the servers array)
            const serverId = serverConfig.id;
            const allServers = await getTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS) || [];
            const storedServer = allServers.find(s => s.id === serverId);
            const storedTokens = storedServer?.oauthTokens;
        
            
            if (storedTokens && storedTokens.access_token) {
                
                // Check if token has expiration info
                if (!storedTokens.expires_in || !storedTokens.issued_at) {
                    // If no expiration info, assume token is valid
                    transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                } else {
                    // Check if token is expired (with 5 minute buffer)
                    const expirationTime = storedTokens.issued_at + (storedTokens.expires_in * 1000);
                    const bufferTime = 5 * 60 * 1000; // 5 minutes
                    const isExpired = Date.now() >= (expirationTime - bufferTime);
                    
                    if (!isExpired) {
                        // Token is still valid
                        transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                    } else if (storedTokens.refresh_token) {
                        // Try to refresh the token
                        try {
                            const oauthClient = new McpOAuthClient(url, { getTpaStorage, setTpaStorage });
                            const refreshedTokens = await oauthClient.refreshAccessToken(storedTokens.refresh_token);
                            
                            // Store refreshed tokens back to the servers array
                            const updatedServer = { 
                                ...storedServer, 
                                oauthTokens: {
                                    ...refreshedTokens,
                                    issued_at: Date.now()
                                }
                            };
                            const updatedServers = allServers.map(s => 
                                s.id === serverId ? updatedServer : s
                            );
                            await setTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS, updatedServers);
                            
                            transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${refreshedTokens.access_token}` } };
                        } catch (error) {
                            console.log(`Token refresh failed for server '${name}':`, error.message);
                            throw new Error('OAuth authorization required. Please complete the OAuth flow again.');
                        }
                    } else {
                        console.log(`OAuth token expired and no refresh token available.`);
                        throw new Error('OAuth authorization required. Please complete the OAuth flow again.');
                    }
                }
            } else {
                console.log(`No OAuth tokens found - OAuth authorization required`);
                // Be more specific about the OAuth requirement
                if (!serverConfig.id) {
                    throw new Error('OAuth authorization required. Please save the server configuration first, then complete the OAuth flow.');
                } else {
                    throw new Error('OAuth authorization required. Please complete the OAuth flow first.');
                }
            }
        }
        // Add headers if provided (for header-based auth)
        else if (serverConfig.authType === 'headers' && headers && Object.keys(headers).length > 0) {
            console.log(`Using headers for StreamableHTTP connection:`, headers);
            transportOptions.requestInit = { headers };
        }
        
        transport = new StreamableHTTPClientTransport(httpUrl, transportOptions);
        
        client = new Client(
            {
                name: "mcp-client",
                version: "1.0.0",
            },
            {
                capabilities: {},
            }
        );

        await client.connect(transport);
        const response = await client.request(
            { method: "tools/list" },
            ListToolsResultSchema
        );
        
        const tools = response.tools;
        return tools;
    } catch (error) {
        console.error(`Error connecting to StreamableHTTP server '${name}' (${url}): ${error.message}`);
        
        // Re-throw OAuth authorization errors so they can be handled by the caller
        if (error.message.includes('OAuth authorization required')) {
            throw error;
        }
        
        // Check if this is an OAuth-enabled server that returned 401 Unauthorized
        if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled) {
            // For OAuth servers, check if we got a 401 or authentication error
            if (error.message.includes('401') || 
                error.message.includes('Unauthorized') || 
                error.message.includes('authentication') ||
                error.code === 'ECONNREFUSED' || // Server might be rejecting unauthenticated connections
                !error.message.includes('ENOTFOUND')) { // Not a DNS/network error
                
                throw new Error('OAuth authorization required. Please complete the OAuth flow first.');
            }
        }
        
        // A failure to connect to one MCP server is not a critical error for the whole agent run.
        return []; // Return empty array so the agent can continue without these tools.
    } finally {
        if (transport) {
            await transport.close();
        }
    }
};

const discoverTools = async (serverConfig, { getTpaStorage, setTpaStorage }) => {
    const serverId = serverConfig.id;

    console.log(`Discovering tools for server '${serverConfig.name}' (ID: ${serverId})`);

    // Get the servers array and find this specific server
    const allServers = await getTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS) || [];
    const storedServer = allServers.find(s => s.id === serverId);

        // For OAuth servers, check if we have tokens available now
        let shouldInvalidateCache = false;
        if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled) {
            if (storedServer && storedServer.oauthTokens && storedServer.oauthTokens.access_token) {
                console.log(`OAuth tokens are available for server '${serverConfig.name}'`);
                // Check if we have cached tools but they might be stale (cached before OAuth)
                if (storedServer.tools && storedServer.tools.length === 0) {
                    console.log(`Found empty cached tools for OAuth server '${serverConfig.name}' - invalidating cache to re-discover with auth`);
                    shouldInvalidateCache = true;
                }
            }
        }
    
    // Use cached tools if available and not invalidated
    if (!shouldInvalidateCache && storedServer && storedServer.tools && storedServer.tools.length > 0) {
        // Check if cache is still fresh (cache for 5 minutes)
        const cacheAge = Date.now() - (storedServer.toolsCachedAt || 0);
        const maxCacheAge = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (cacheAge < maxCacheAge) {
            console.log(`Using cached tools for server '${serverConfig.name}': ${storedServer.tools.length} tools (cached ${Math.round(cacheAge / 1000)}s ago)`);
            return storedServer.tools;
        } else {
            console.log(`Cached tools for server '${serverConfig.name}' are stale (${Math.round(cacheAge / 1000)}s old), discovering fresh...`);
        }
    } else {
        console.log(`No cached tools found for server '${serverConfig.name}', discovering fresh...`);
    }

    try {
        let tools;
        if (serverConfig.transport === 'stdio') {
            tools = await discoverToolsStdio(serverConfig);
        } else if (serverConfig.transport === 'streamablehttp') {
            tools = await discoverToolsStreamableHttp(serverConfig, { getTpaStorage, setTpaStorage });
        } else {
            // Default to sse for backward compatibility with old config format
            tools = await discoverToolsSse(serverConfig, { getTpaStorage, setTpaStorage });
        }
        
        // Store tools directly in the server configuration
        if (tools && tools.length > 0) {
            console.log(`Caching ${tools.length} tools for server '${serverConfig.name}' (ID: ${serverId})`);
            const updatedServer = { ...serverConfig, tools, toolsCachedAt: Date.now() };
            // Update the server in the servers array
            const updatedServers = allServers.map(s => 
                s.id === serverId ? updatedServer : s
            );
            await setTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS, updatedServers);
        } else {
            // Still update the server config to store empty tools array to indicate we tried
            const updatedServer = { ...serverConfig, tools: [], toolsCachedAt: Date.now() };
            const updatedServers = allServers.map(s => 
                s.id === serverId ? updatedServer : s
            );
            await setTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS, updatedServers);
        }
        
        return tools || [];
    } catch (error) {
        // Don't cache OAuth authorization errors, let them bubble up
        if (error.message.includes('OAuth authorization required')) {
            throw error;
        }
        
        // For other errors, log and return empty array
        console.error(`Error discovering tools for server '${serverConfig.name}':`, error.message);
        return [];
    }
};

const callMcpTool = async (serverConfig, toolCall, { getTpaStorage, setTpaStorage } = {}) => {
    const { name, command, args, env, url, headers } = serverConfig;
    const { toolName, toolArgs } = toolCall;

    if (serverConfig.transport === 'stdio') {
        console.log(`Calling tool '${toolName}' on STDIO server '${name}'`);
        const transport = new StdioClientTransport({
            command,
            args,
            env: { ...env, PATH: process.env.PATH }
        });
        const client = new Client({ name: "mcp-client", version: "1.0.0" });

        try {
            await client.connect(transport);
            const result = await client.callTool({ name: toolName, arguments: toolArgs });
            return result;
        } catch (error) {
            console.error(`Error calling tool '${toolName}' on STDIO server '${name}':`, error);
            return { error: error.message }; // Return an error object
        } finally {
            await transport.close();
        }
    } else if (serverConfig.transport === 'streamablehttp') {
        if (!url) {
            return { error: `URL for StreamableHTTP server '${name}' is not configured.` };
        }
        
        let transport;
        let client;
        
        try {
            // Create StreamableHTTP transport
            const httpUrl = new URL(url);
            
            const transportOptions = {};
            
            // Handle authentication
            if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled && getTpaStorage) {
                console.log(`Using OAuth 2.1 authentication for StreamableHTTP server tool call '${name}'`);
                
                // Check for stored OAuth tokens from the servers array
                const serverId = serverConfig.id;
                const allServers = await getTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS) || [];
                const storedServer = allServers.find(s => s.id === serverId);
                const storedTokens = storedServer?.oauthTokens;
                
                if (storedTokens && storedTokens.access_token) {
                    // Check if token has expiration info
                    if (!storedTokens.expires_in || !storedTokens.issued_at) {
                        // If no expiration info, assume token is valid
                        transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                    } else {
                        // Check if token is expired (with 5 minute buffer)
                        const expirationTime = storedTokens.issued_at + (storedTokens.expires_in * 1000);
                        const bufferTime = 5 * 60 * 1000; // 5 minutes
                        const isExpired = Date.now() >= (expirationTime - bufferTime);
                        
                        if (!isExpired) {
                            // Token is still valid
                            transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                        } else if (storedTokens.refresh_token && setTpaStorage) {
                            // Try to refresh the token
                            try {
                                const oauthClient = new McpOAuthClient(url, { getTpaStorage, setTpaStorage });
                                const refreshedTokens = await oauthClient.refreshAccessToken(storedTokens.refresh_token);
                                
                                // Store refreshed tokens back to the servers array
                                const updatedServer = { 
                                    ...storedServer, 
                                    oauthTokens: {
                                        ...refreshedTokens,
                                        issued_at: Date.now()
                                    }
                                };
                                const updatedServers = allServers.map(s => 
                                    s.id === serverId ? updatedServer : s
                                );
                                await setTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS, updatedServers);
                                
                                transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${refreshedTokens.access_token}` } };
                            } catch (error) {
                                console.log(`Token refresh failed for server '${name}':`, error.message);
                                return { error: 'OAuth authorization required. Please complete the OAuth flow again.' };
                            }
                        } else {
                            console.log(`OAuth token expired and no refresh token available.`);
                            return { error: 'OAuth authorization required. Please complete the OAuth flow again.' };
                        }
                    }
                } else {
                    console.log(`No OAuth tokens found for server '${name}' - OAuth authorization required`);
                    return { error: 'OAuth authorization required. Please complete the OAuth flow first.' };
                }
            }
            // Add headers if provided (for header-based auth)
            else if (serverConfig.authType === 'headers' && headers && Object.keys(headers).length > 0) {
                console.log(`Using headers for StreamableHTTP tool call:`, headers);
                transportOptions.requestInit = { headers };
            }
            
            transport = new StreamableHTTPClientTransport(httpUrl, transportOptions);
            
            client = new Client({
                name: "mcp-client",
                version: "1.0.0"
            });

            await client.connect(transport);
            const result = await client.callTool({ name: toolName, arguments: toolArgs });
            return result;
        } catch (error) {
            console.error(`Error connecting to StreamableHTTP server '${name}' for tool call: ${error.message}`);
            
            // Check if this is an OAuth-enabled server that returned 401 Unauthorized
            if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled) {
                if (error.message.includes('401') || 
                    error.message.includes('Unauthorized') || 
                    error.message.includes('Non-200 status code (401)')) {
                    
                    return { error: 'OAuth authorization required. Please complete the OAuth flow again.' };
                }
            }
            
            return { error: error.message };
        } finally {
            if (transport) {
                await transport.close();
            }
        }
    } else { // Default to SSE
        if (!url) {
            return { error: `URL for SSE server '${name}' is not configured.` };
        }
        
        let transport;
        let client;
        
        try {
                // Create SSE transport with proper MCP SDK
            const sseUrl = new URL(url);
            
            const transportOptions = {};
            
            // Handle authentication
            if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled && getTpaStorage) {
                console.log(`Using OAuth 2.1 authentication for SSE server tool call '${name}'`);
                
                // Check for stored OAuth tokens from the servers array
                const serverId = serverConfig.id;
                const allServers = await getTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS) || [];
                const storedServer = allServers.find(s => s.id === serverId);
                const storedTokens = storedServer?.oauthTokens;
                
                if (storedTokens && storedTokens.access_token) {
                    // Check if token has expiration info
                    if (!storedTokens.expires_in || !storedTokens.issued_at) {
                        // If no expiration info, assume token is valid
                        transportOptions.eventSourceInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                        transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                    } else {
                        // Check if token is expired (with 5 minute buffer)
                        const expirationTime = storedTokens.issued_at + (storedTokens.expires_in * 1000);
                        const bufferTime = 5 * 60 * 1000; // 5 minutes
                        const isExpired = Date.now() >= (expirationTime - bufferTime);
                        
                        if (!isExpired) {
                            // Token is still valid
                            transportOptions.eventSourceInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                            transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${storedTokens.access_token}` } };
                        } else if (storedTokens.refresh_token && setTpaStorage) {
                            // Try to refresh the token
                            try {
                                const oauthClient = new McpOAuthClient(url, { getTpaStorage, setTpaStorage });
                                const refreshedTokens = await oauthClient.refreshAccessToken(storedTokens.refresh_token);
                                
                                // Store refreshed tokens back to the servers array
                                const updatedServer = { 
                                    ...storedServer, 
                                    oauthTokens: {
                                        ...refreshedTokens,
                                        issued_at: Date.now()
                                    }
                                };
                                const updatedServers = allServers.map(s => 
                                    s.id === serverId ? updatedServer : s
                                );
                                await setTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS, updatedServers);
                                
                                transportOptions.eventSourceInit = { headers: { 'Authorization': `Bearer ${refreshedTokens.access_token}` } };
                                transportOptions.requestInit = { headers: { 'Authorization': `Bearer ${refreshedTokens.access_token}` } };
                            } catch (error) {
                                return { error: 'OAuth authorization required. Please complete the OAuth flow again.' };
                            }
                        } else {
                            console.log(`OAuth token expired and no refresh token available for server '${name}'`);
                            return { error: 'OAuth authorization required. Please complete the OAuth flow again.' };
                        }
                    }
                } else {
                    console.log(`No OAuth tokens found for server '${name}' - OAuth authorization required`);
                    return { error: 'OAuth authorization required. Please complete the OAuth flow first.' };
                }
            }
            // Add headers if provided (for header-based auth)
            else if (serverConfig.authType === 'headers' && headers && Object.keys(headers).length > 0) {
                console.log(`Using headers for SSE tool call:`, headers);
                transportOptions.eventSourceInit = { headers };
                transportOptions.requestInit = { headers };
            }
            
            transport = new SSEClientTransport(sseUrl, transportOptions);
            
            client = new Client({
                name: "mcp-client",
                version: "1.0.0"
            });

            await client.connect(transport);
            const result = await client.callTool({ name: toolName, arguments: toolArgs });
            console.log(`Successfully called tool '${toolName}' on server '${name}' with result:`, result);
            return result;
        } catch (error) {
            console.error(`Error connecting to SSE server '${name}' for tool call: ${error.message}`);
            
            // Check if this is an OAuth-enabled server that returned 401 Unauthorized
            if (serverConfig.authType === 'oauth' && serverConfig.oauth && serverConfig.oauth.enabled) {
                if (error.message.includes('401') || 
                    error.message.includes('Unauthorized') || 
                    error.message.includes('Non-200 status code (401)')) {
                    
                    return { error: 'OAuth authorization required. Please complete the OAuth flow again.' };
                }
            }
            
            return { error: error.message };
        } finally {
            if (transport) {
                await transport.close();
            }
        }
    }
};

const clearToolsCache = async (serverConfig, { getTpaStorage, setTpaStorage }) => {
    const serverId = serverConfig.id;
    
    // Get the servers array and find this specific server
    const allServers = await getTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS) || [];
    const storedServer = allServers.find(s => s.id === serverId);
    
    if (storedServer) {
        // Remove tools and cache timestamp
        const updatedServer = { ...storedServer };
        delete updatedServer.tools;
        delete updatedServer.toolsCachedAt;
        
        // Update the server in the servers array
        const updatedServers = allServers.map(s => 
            s.id === serverId ? updatedServer : s
        );
        await setTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS, updatedServers);
        console.log(`Tools cache cleared for server '${serverConfig.name}'`);
    } else {
        console.log(`No stored server found with ID '${serverId}'`);
    }
};

module.exports = {
    discoverTools,
    callMcpTool,
    clearToolsCache,
};
