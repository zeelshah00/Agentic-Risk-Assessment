const express = require('express');
const path = require('path');
const fs = require('fs');
const { createTpaStorageHelpers } = require('./tpa');
const { TPA_STORAGE_KEYS } = require('./tpaStorageKeys');
const { runAgent } = require('./core');
const ReportGenerator = require('./reportGenerator');
const { checkUsageLimits, trackUsage } = require('./usageTracker');

const router = express.Router();
const reportGenerator = new ReportGenerator();

// COMMENTED OUT - AGENT SCHEDULING FUNCTIONALITY DISABLED
/*
// Helper function to determine if an agent should run based on schedule
function shouldAgentRun(agent) {
    const now = new Date();
    const lastRun = agent.lastRun ? new Date(agent.lastRun) : null;
    
    // If never run before, it should run
    if (!lastRun) {
        return true;
    }
    
    const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);
    
    switch (agent.schedule) {
        case 'hourly':
            return hoursSinceLastRun >= 1;
        case 'daily':
            return hoursSinceLastRun >= 24;
        case 'weekly':
            return hoursSinceLastRun >= 168; // 7 * 24 hours
        case 'monthly':
            return hoursSinceLastRun >= 720; // 30 * 24 hours (approximate)
        case 'remediation':
        case 'manual':
            return false; // These don't run on schedule
        default:
            return false;
    }
}
*/

const botIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 8V4H8"/>
    <rect width="16" height="12" x="4" y="8" rx="2"/>
    <path d="M2 14h2"/>
    <path d="M20 14h2"/>
    <path d="M15 13v2"/>
    <path d="M9 13v2"/>
</svg>
`;

router.get('/assets/icon', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(botIconSvg);
});

router.get('/assets/sideBarIcon', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(botIconSvg);
});

router.get('/manifest', (req, res) => {
    res.json({
        "app_name": "MCP Reporting",
        "description": "Connect to MCP servers and execute prompts with external data tools",
        "vendor": "BigID",
        "category": "utility",
        "license_type": "FREE",
        "version": "1.5.0",
        "is_interactive": true,
        "actions": [],
        "global_params": []
    });
});

// COMMENTED OUT - AGENT SCHEDULING FUNCTIONALITY DISABLED
/*
router.post('/execute', async (req, res) => {
    console.log("Received /execute call from BigID scheduler.");

    const { bigidToken, bigidBaseUrl, tpaId, actionName, actionParams } = req.body;

    if (!bigidToken || !bigidBaseUrl || !tpaId) {
        console.error("Missing required parameters from BigID.");
        const message = "Missing required parameters from BigID.";
        return res.status(400).json({
            statusEnum: "ERROR",
            progress: 0,
            message: message
        });
    }

    // Extract objectList from actionParams for object_agentic_rememdiation action
    let objectList = null;
    if (actionName === 'object_agentic_rememdiation' && actionParams) {
        const objectListParam = actionParams.find(param => param.paramName === 'objectList');
        objectList = objectListParam ? objectListParam.paramValue : null;
        
        if (!objectList) {
            console.error("Missing objectList parameter for object remediation action.");
            return res.status(400).json({
                statusEnum: "ERROR",
                progress: 0,
                message: "Missing objectList parameter for object remediation action."
            });
        }
    }

    try {
        const response = await fetch(`${bigidBaseUrl}/api/v1/tpa`, {
            headers: { 'Authorization': bigidToken },
        });

        if (!response.ok) {
            throw new Error(`Invalid BigID credentials. Status: ${response.status}`);
        }

        const { getTpaStorage, setTpaStorage } = createTpaStorageHelpers(bigidBaseUrl, tpaId, bigidToken);

        const config = await getTpaStorage('TPA_STORAGE_KEYS.CONFIG') || {};
        let agents = await getTpaStorage('TPA_STORAGE_KEYS.AGENTS') || [];
        const customMcpServers = await getTpaStorage('TPA_STORAGE_KEYS.MCP_SERVERS') || [];

        const geminiApiKey = process.env.GEMINI_API_KEY || config.geminiApiKey || process.env.HAS_AI_PERMISSION;
        if (!geminiApiKey) {
            throw new Error("Gemini API Key is not configured.");
        }

        let agentsToRun = [];
        
        // Handle different action types
        if (actionName === 'object_agentic_rememdiation') {
            // Filter agents scheduled for remediation
            agentsToRun = agents.filter(agent => agent.schedule === 'remediation');
            console.log(`Found ${agentsToRun.length} remediation agents to execute for action: ${actionName}`);
        } else {
            // Default behavior for scheduled agents (hourly, daily, weekly, monthly)
            agentsToRun = agents.filter(agent => shouldAgentRun(agent));
            console.log(`Found ${agentsToRun.length} scheduled agents ready to execute.`);
        }

        const executionResults = [];
        let successfulRuns = 0;

        for (const agent of agentsToRun) {
            // Prepare agent context with objectList for remediation actions
            const agentContext = { 
                bigidToken, 
                bigidBaseUrl, 
                geminiApiKey, 
                customMcpServers, 
                getTpaStorage, 
                setTpaStorage
            };

            // Add objectList for remediation actions
            if (actionName === 'object_agentic_rememdiation' && objectList) {
                agentContext.objectList = objectList;
            }

            const updatedAgent = await runAgent(agent, agentContext);

            if (updatedAgent.status === 'success') {
                successfulRuns++;
            }
            if (updatedAgent.result) {
                executionResults.push(`Agent '${updatedAgent.name}' (${updatedAgent.status}): ${updatedAgent.result}`);
            }

            const agentIndex = agents.findIndex(a => a.id === updatedAgent.id);
            if (agentIndex !== -1) {
                agents[agentIndex] = updatedAgent;
            }
        }

        await setTpaStorage('TPA_STORAGE_KEYS.AGENTS', agents);
        console.log("All agents processed. Updated results saved to TPA storage.");

        const progress = agentsToRun.length > 0 ? successfulRuns / agentsToRun.length : 1;
        const statusEnum = progress === 1 ? "COMPLETED" : "ERROR";
        
        let message;
        if (executionResults.length > 0) {
            message = executionResults.join('\n');
        } else {
            if (actionName === 'object_agentic_rememdiation') {
                message = 'No remediation agents were scheduled to run.';
            } else {
                message = 'No scheduled agents were ready to run at this time.';
            }
        }

        res.json({
            statusEnum: statusEnum,
            progress: progress,
            message: message
        });

    } catch (error) {
        console.error("Failed to execute scheduled action:", error);
        res.status(500).json({
            statusEnum: "ERROR",
            progress: 0,
            message: error.message
        });
    }
});
*/

// REPLACEMENT ENDPOINT - Scheduling functionality disabled
router.post('/execute', async (req, res) => {
    console.log("Received /execute call from BigID scheduler - Agent functionality disabled.");
    
    res.json({
        statusEnum: "COMPLETED",
        progress: 1,
        message: "Agent functionality has been disabled. No agents will be executed."
    });
});

// COMMENTED OUT - AGENT REMEDIATION FUNCTIONALITY DISABLED
/*
router.post('/object_agentic_rememdiation', async (req, res) => {
    console.log("Received /object_agentic_rememdiation call from BigID.");

    const { bigidToken, bigidBaseUrl, tpaId, objectList } = req.body;

    if (!bigidToken || !bigidBaseUrl || !tpaId || !objectList) {
        console.error("Missing required parameters from BigID for object remediation.");
        const message = "Missing required parameters from BigID for object remediation.";
        return res.status(400).json({
            statusEnum: "ERROR",
            progress: 0,
            message: message
        });
    }

    try {
        const response = await fetch(`${bigidBaseUrl}/api/v1/tpa`, {
            headers: { 'Authorization': bigidToken },
        });

        if (!response.ok) {
            throw new Error(`Invalid BigID credentials. Status: ${response.status}`);
        }

        const { getTpaStorage, setTpaStorage } = createTpaStorageHelpers(bigidBaseUrl, tpaId, bigidToken);

        const config = await getTpaStorage('TPA_STORAGE_KEYS.CONFIG') || {};
        let agents = await getTpaStorage('TPA_STORAGE_KEYS.AGENTS') || [];
        const customMcpServers = await getTpaStorage('TPA_STORAGE_KEYS.MCP_SERVERS') || [];

        const geminiApiKey = process.env.GEMINI_API_KEY || config.geminiApiKey || process.env.HAS_AI_PERMISSION;
        if (!geminiApiKey) {
            throw new Error("Gemini API Key is not configured.");
        }

        // Filter agents scheduled for remediation
        const agentsToRun = agents.filter(agent => agent.schedule === 'remediation');
        console.log(`Found ${agentsToRun.length} remediation agents to execute for ${objectList.length} objects.`);

        if (agentsToRun.length === 0) {
            return res.json({
                statusEnum: "COMPLETED",
                progress: 1,
                message: "No remediation agents are configured to run."
            });
        }

        const executionResults = [];
        let successfulRuns = 0;

        for (const agent of agentsToRun) {
            // Pass the objectList to the agent for processing
            const agentContext = { 
                bigidToken, 
                bigidBaseUrl, 
                geminiApiKey, 
                customMcpServers, 
                getTpaStorage, 
                setTpaStorage,
                objectList // Pass the objects to be remediated
            };
            
            const updatedAgent = await runAgent(agent, agentContext);

            if (updatedAgent.status === 'success') {
                successfulRuns++;
            }
            if (updatedAgent.result) {
                executionResults.push(`Agent '${updatedAgent.name}' (${updatedAgent.status}): ${updatedAgent.result}`);
            }

            const agentIndex = agents.findIndex(a => a.id === updatedAgent.id);
            if (agentIndex !== -1) {
                agents[agentIndex] = updatedAgent;
            }
        }

        await setTpaStorage('TPA_STORAGE_KEYS.AGENTS', agents);
        console.log("All remediation agents processed. Updated results saved to TPA storage.");

        const progress = agentsToRun.length > 0 ? successfulRuns / agentsToRun.length : 1;
        const statusEnum = progress === 1 ? "COMPLETED" : "ERROR";
        const message = executionResults.length > 0 ? 
            executionResults.join('\n') : 
            `Processed ${objectList.length} objects with ${agentsToRun.length} remediation agents.`;

        res.json({
            statusEnum: statusEnum,
            progress: progress,
            message: message
        });

    } catch (error) {
        console.error("Failed to execute object remediation:", error);
        res.status(500).json({
            statusEnum: "ERROR",
            progress: 0,
            message: error.message
        });
    }
});
*/

// REPLACEMENT ENDPOINT - Remediation functionality disabled
router.post('/object_agentic_rememdiation', async (req, res) => {
    console.log("Received /object_agentic_rememdiation call from BigID - Agent functionality disabled.");
    
    res.json({
        statusEnum: "COMPLETED",
        progress: 1,
        message: "Agent functionality has been disabled. No remediation agents will be executed."
    });
});

// COMMENTED OUT - MANUAL AGENT RUN FUNCTIONALITY DISABLED
/*
router.post('/api/run_agent/:agentId', async (req, res) => {
    const { agentId } = req.params;
    const { bigidContext } = req.body;

    const requiredParams = { agentId, bigidContext };
    const missingParams = Object.keys(requiredParams).filter(param => !requiredParams[param]);

    if (missingParams.length > 0) {
        const message = `Missing required parameters for manual agent run: ${missingParams.join(', ')}.`;
        return res.status(400).json({ success: false, message });
    }

    const { bigidToken, bigidBaseUrl, tpaId } = bigidContext;

    if (!tpaId || !bigidToken || !bigidBaseUrl) {
        return res.status(400).json({ success: false, message: "Missing BigID context for manual agent run." });
    }

    console.log(`Received manual run request for agent ${agentId} for app instance ${tpaId}`);

    try {
        const response = await fetch(`${bigidBaseUrl}/api/v1/tpa`, {
            headers: { 'Authorization': bigidToken },
        });

        if (!response.ok) {
            throw new Error(`Invalid BigID credentials. Status: ${response.status}`);
        }
        const { getTpaStorage, setTpaStorage } = createTpaStorageHelpers(bigidBaseUrl, tpaId, bigidToken);

        const config = await getTpaStorage('TPA_STORAGE_KEYS.CONFIG') || {};
        const geminiApiKey = process.env.GEMINI_API_KEY || config.geminiApiKey || process.env.HAS_AI_PERMISSION;
        if (!geminiApiKey) {
            throw new Error("Gemini API Key is not configured.");
        }
        const customMcpServers = await getTpaStorage('TPA_STORAGE_KEYS.MCP_SERVERS') || [];
        let allAgents = await getTpaStorage('TPA_STORAGE_KEYS.AGENTS') || [];
        const agentToRun = allAgents.find(a => a.id === agentId);

        if (!agentToRun) {
            return res.status(404).json({ success: false, message: `Agent with id ${agentId} not found.` });
        }

        const updatedAgent = await runAgent(agentToRun, { bigidToken, bigidBaseUrl, geminiApiKey, customMcpServers, getTpaStorage, setTpaStorage, objectList: undefined });

        const agentIndex = allAgents.findIndex(a => a.id === updatedAgent.id);
        if (agentIndex !== -1) {
            allAgents[agentIndex] = updatedAgent;
        } else {
            allAgents.push(updatedAgent);
        }
        await setTpaStorage('TPA_STORAGE_KEYS.AGENTS', allAgents);

        res.json({ success: true, updatedAgent });

    } catch (error) {
        console.error(`Failed to manually run agent ${agentId}:`, error);
        res.status(500).json({ success: false, message: error.message });
    }
});
*/

// REPLACEMENT ENDPOINT - Manual agent run functionality disabled
router.post('/api/run_agent/:agentId', async (req, res) => {
    console.log("Received manual agent run request - Agent functionality disabled.");
    
    res.status(400).json({ 
        success: false, 
        message: "Agent functionality has been disabled. Manual agent runs are not available." 
    });
});

router.post('/api/test-mcp-connection', async (req, res) => {
    const { serverConfig, bigidBaseUrl, tpaId, bigidToken } = req.body;
    
    if (!serverConfig) {
        return res.status(400).json({ success: false, error: 'Server configuration is required' });
    }
    
    try {
        console.log(`Testing MCP connection to ${serverConfig.transport} server: ${serverConfig.name}`);
        console.log('Server config:', {
            id: serverConfig.id,
            name: serverConfig.name,
            url: serverConfig.url,
            transport: serverConfig.transport,
            authType: serverConfig.authType
        });

        // Import the discoverTools function
        const { discoverTools } = require('./mcp');
        
        // Create TPA storage helpers for the test
        const tpaHelpers = createTpaStorageHelpers(bigidBaseUrl, tpaId, bigidToken);

        // Test the connection by discovering tools using the real server config
        const tools = await discoverTools(serverConfig, tpaHelpers);
        
        if (tools && tools.length >= 0) {
            res.json({ 
                success: true, 
                tools: tools,
                message: `Successfully connected and discovered ${tools.length} tools`
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to discover tools from server',
                tools: []
            });
        }
    } catch (error) {
        console.error('MCP connection test failed:', error);
        
        // Handle OAuth authorization requirement
        if (error.message && error.message.includes('OAuth authorization required')) {
            return res.status(401).json({
                success: false,
                error: 'OAuth authorization required',
                requiresOAuth: true,
                message: 'The server requires OAuth 2.1 authentication following the MCP specification. Please complete the OAuth flow first.',
                serverUrl: serverConfig.url
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Connection test failed',
            tools: []
        });
    }
});

// MCP OAuth 2.1 Flow Implementation
router.post('/api/mcp/oauth/initialize', async (req, res) => {
    try {
        const { serverUrl, serverId, bigidBaseUrl, tpaId, bigidToken } = req.body;
        
        if (!serverUrl) {
            return res.status(400).json({ error: 'Missing serverUrl' });
        }

        if (!serverId) {
            return res.status(400).json({ error: 'Missing serverId' });
        }

        if (!bigidBaseUrl || !tpaId || !bigidToken) {
            return res.status(400).json({ error: 'Missing BigID context (bigidBaseUrl, tpaId, bigidToken)' });
        }

        const { getTpaStorage, setTpaStorage } = createTpaStorageHelpers(bigidBaseUrl, tpaId, bigidToken);
        const { McpOAuthClient } = require('./mcpOAuth');
        
        const oauthClient = new McpOAuthClient(serverUrl, { getTpaStorage, setTpaStorage }, serverId);
        const result = await oauthClient.initializeOAuth();

        res.json({
            success: true,
            authorizationUrl: result.authorizationUrl,
            requiresUserInteraction: result.requiresUserInteraction,
            message: 'OAuth flow initialized. Please complete authorization in your browser.'
        });
    } catch (error) {
        console.error('OAuth initialization error:', error);
        res.status(500).json({ 
            error: 'Failed to initialize OAuth flow', 
            details: error.message 
        });
    }
});

// Handle OAuth callback (GET request with query parameters - standard OAuth flow)
router.get('/api/mcp/oauth/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;
        
        if (error) {
            const errorMessage = error_description || error;
            return res.send(`
                <html>
                    <head>
                        <title>OAuth Authorization Failed</title>
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                text-align: center; 
                                padding: 50px 20px; 
                                background: #fef2f2; 
                                color: #374151;
                            }
                            .error { color: #dc2626; }
                            .error-details { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px; }
                        </style>
                    </head>
                    <body>
                        <h1 class="error">❌ OAuth Authorization Failed</h1>
                        <div class="error-details">
                            <p><strong>Error:</strong> ${error}</p>
                            ${error_description ? `<p><strong>Description:</strong> ${error_description}</p>` : ''}
                        </div>
                        <p>You can close this window and try again.</p>
                        <script>
                            console.error('OAuth authorization failed:', '${error}', '${error_description || ''}');
                            
                            // Send error message to parent window
                            if (window.opener && !window.opener.closed) {
                                window.opener.postMessage({
                                    type: 'oauth-error',
                                    error: '${error}',
                                    error_description: '${error_description || ''}'
                                }, '*');
                            }
                            
                            // Try to close the window after a few seconds
                            setTimeout(() => {
                                window.close();
                            }, 5000);
                        </script>
                    </body>
                </html>
            `);
        }
        
        if (!code || !state) {
            return res.send(`
                <html>
                    <head><title>OAuth Authorization Failed</title></head>
                    <body>
                        <h1>OAuth Authorization Failed</h1>
                        <p><strong>Error:</strong> Missing authorization code or state parameter</p>
                        <p>You can close this window and try again.</p>
                        <script>
                            setTimeout(() => {
                                window.close();
                            }, 3000);
                        </script>
                    </body>
                </html>
            `);
        }

        // We'll retrieve the server URL in the POST callback processing
        // For now, we just pass the authorization data to the frontend
        console.log('OAuth GET callback received with state:', state);

        return res.send(`
            <html>
                <head>
                    <title>OAuth Authorization</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                            text-align: center; 
                            padding: 50px 20px; 
                            background: #f8fafc; 
                            color: #334155;
                        }
                        .success { color: #059669; }
                        .spinner { 
                            border: 3px solid #e2e8f0; 
                            border-top: 3px solid #059669; 
                            border-radius: 50%; 
                            width: 30px; 
                            height: 30px; 
                            animation: spin 1s linear infinite; 
                            margin: 20px auto; 
                        }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                </head>
                <body>
                    <h1 class="success">✅ OAuth Authorization Successful</h1>
                    <div class="spinner"></div>
                    <p>Processing authorization... This window will close automatically.</p>
                    <script>
                        console.log('OAuth callback received, sending to parent window...');
                        
                        // Send the authorization code back to the parent window
                        // The parent will handle the token exchange directly
                        if (window.opener && !window.opener.closed) {
                            window.opener.postMessage({
                                type: 'oauth-callback',
                                code: '${code}',
                                state: '${state}',
                                success: true
                            }, '*');
                            console.log('Message sent to parent window');
                        } else {
                            console.error('Parent window not available');
                        }
                        
                        // Close the popup window
                        setTimeout(() => {
                            window.close();
                        }, 2000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('OAuth callback error:', error);
        return res.send(`
            <html>
                <head><title>OAuth Authorization Failed</title></head>
                <body>
                    <h1>OAuth Authorization Failed</h1>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p>You can close this window and try again.</p>
                    <script>
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    </script>
                </body>
            </html>
        `);
    }
});





router.get('/api/config', async (req, res) => {
    const isUsingRole = !!process.env.HAS_AI_PERMISSION;
    const isApiKeySetByEnv = !!process.env.GEMINI_API_KEY || isUsingRole;
    const safeHostnames = process.env.STDIO_SAFE_HOSTNAMES ? process.env.STDIO_SAFE_HOSTNAMES.split(',').map(hostname => hostname.trim()) : [];
    
    // Add usage limits to config
    const dailyTokenLimit = parseInt(process.env.DAILY_TOKEN_LIMIT) || 0;
    const environmentName = process.env.ENVIRONMENT_NAME || 'unknown';

    // Check if user is from EU (for GDPR compliance)
    // Cloud Armor (via Load Balancer) provides X-Country-Code header
    // Format: ISO 3166-1 alpha-2 country code (e.g., "US", "FR", "DE")
    const country = req.get('X-Country-Code') || req.get('X-Appengine-Country') || req.get('CF-IPCountry') || '';
    
    // Get client IP for debugging
    const clientIp = req.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
                     req.get('X-Real-IP') || 
                     req.connection.remoteAddress || 
                     'Unknown';
    
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    const isEU = country && euCountries.includes(country.toUpperCase());

    // Log for debugging
    if (country) {
        console.log(`Geo detection: IP=${clientIp}, Country=${country}, isEU=${isEU}`);
    }

    res.json({
        isApiKeySetByEnv: isApiKeySetByEnv,
        isUsingRole: isUsingRole,
        stdioSafeHostnames: safeHostnames,
        usageLimits: {
            dailyTokenLimit: dailyTokenLimit,
            environmentName: environmentName,
            isLimited: dailyTokenLimit > 0,
        },
        userCountry: country || 'Unknown',
        clientIp: clientIp,
        isEU: isEU,
        shouldAutoOptOut: isEU
    });
});

// Get available models endpoint
router.get('/api/models', async (req, res) => {
    try {
        const { getAvailableModels } = require('./utils');
        const models = await getAvailableModels();
        res.json({ models });
    } catch (error) {
        console.error('Error fetching available models:', error);
        res.status(500).json({ error: 'Failed to fetch available models' });
    }
});

// Usage limits endpoint
router.get('/api/usage-limits', async (req, res) => {
    try {
        // Extract credentials from query parameters
        const { bigidBaseUrl, bigidToken } = req.query;
        
        if (!bigidBaseUrl || !bigidToken) {
            return res.status(400).json({ error: 'BigID credentials (base URL and token) are required' });
        }
        
        // Verify the credentials before returning usage data
        try {
            const response = await fetch(`${bigidBaseUrl}/api/v1/tpa`, {
                headers: { 'Authorization': bigidToken },
            });

            if (!response.ok) {
                return res.status(401).json({ error: 'Invalid BigID credentials' });
            }
        } catch (verifyError) {
            console.error('Error verifying BigID credentials:', verifyError);
            return res.status(401).json({ error: 'Failed to verify BigID credentials' });
        }
        
        // Get usage limits from Firestore (per-tenant tracking)
        const usageCheck = await checkUsageLimits(bigidBaseUrl);
        
        if (usageCheck.error) {
            return res.status(403).json({ 
                error: usageCheck.error,
                allowed: false 
            });
        }
        
        res.json({
            dailyTokenLimit: usageCheck.dailyTokenLimit,
            currentUsage: usageCheck.currentUsage,
            tenantId: usageCheck.tenantId,
            environmentName: usageCheck.environmentName,
            isLimited: usageCheck.dailyTokenLimit > 0,
            remainingTokens: usageCheck.remainingTokens || null,
            resetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
        });
    } catch (error) {
        console.error('Error fetching usage limits:', error);
        res.status(500).json({ error: 'Failed to fetch usage limits' });
    }
});

// Track token usage endpoint
router.post('/api/track-usage', async (req, res) => {
    try {
        const { tokenCount, bigidContext } = req.body;
        
        if (!tokenCount || tokenCount <= 0) {
            return res.status(400).json({ error: 'Valid tokenCount is required' });
        }
        
        if (!bigidContext || !bigidContext.bigidBaseUrl) {
            return res.status(400).json({ error: 'BigID context with base URL is required for usage tracking' });
        }
        
        const { bigidBaseUrl } = bigidContext;
        
        // Track usage per tenant (uses Firestore with per-tenant tracking)
        const result = await trackUsage(tokenCount, bigidBaseUrl);
        
        if (!result.success) {
            return res.status(500).json({ 
                error: result.message || 'Failed to track usage',
                success: false
            });
        }
        
        const newUsage = result.currentUsage;
        
        // Check if limit is exceeded
        const dailyTokenLimit = parseInt(process.env.DAILY_TOKEN_LIMIT) || 0;
        const isLimitExceeded = dailyTokenLimit > 0 && newUsage > dailyTokenLimit;
        
        res.json({
            success: true,
            currentUsage: newUsage,
            tenantId: result.tenantId,
            tenantUrl: result.tenantUrl,
            dailyTokenLimit: dailyTokenLimit,
            isLimitExceeded: isLimitExceeded,
            remainingTokens: dailyTokenLimit > 0 ? Math.max(0, dailyTokenLimit - newUsage) : null
        });
        
    } catch (error) {
        console.error('Error tracking usage:', error);
        res.status(500).json({ error: 'Failed to track usage' });
    }
});

module.exports = router;
