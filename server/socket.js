// WebSocket handler: streams AI responses back to the browser in real time and enforces per-tenant token limits before each turn.
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { removeExamples, removeInvalidEnums, getGenerativeModel, verifyBigIDCredentials, normalizeResponse, normalizeTextResponse, getFullResponse } = require('./utils');
const { createTpaStorageHelpers } = require('./tpa');
const { TPA_STORAGE_KEYS } = require('./tpaStorageKeys');
const { getAllServerConfigs, discoverAllTools, processToolCall } = require('./tools');
const { checkUsageLimits, trackUsage, estimateTokenCount, getTenantIdentifier } = require('./usageTracker');
const { logPrompt } = require('./firestoreService');

const chatSessions = new Map();

// Helper functions for initializeChat
function validateBigIDContext(ws, { tpaId, bigidToken, bigidBaseUrl }) {
    if (!tpaId || !bigidToken || !bigidBaseUrl) {
        ws.send(JSON.stringify({ type: 'error', message: 'Missing BigID context. Please configure a BigID instance.' }));
        ws.close();
        return false;
    }
    return true;
}

async function getGeminiApiKey(getTpaStorage) {
    const config = await getTpaStorage(TPA_STORAGE_KEYS.CONFIG) || {};
    const geminiApiKey = process.env.GEMINI_API_KEY || config.geminiApiKey || process.env.HAS_AI_PERMISSION;
    if (!geminiApiKey) {
        throw new Error('Gemini API Key is not configured.');
    }
    return geminiApiKey;
}



async function initializeChat(ws, initialMessage) {
    try {
        const { bigidContext, history, selectedModel = 'gemini-2.5-pro' } = initialMessage;
        if (!validateBigIDContext(ws, bigidContext)) return;

        const { bigidToken, bigidBaseUrl, tpaId } = bigidContext;
        
        // Create placeholder session immediately to handle incoming messages
        chatSessions.set(ws, { 
            isInitializing: true, 
            messageQueue: []
        });
        
        // Send status to client that initialization has started
        ws.send(JSON.stringify({ type: 'init_started', message: 'Initializing chat session and discovering tools...' }));

        await verifyBigIDCredentials(bigidBaseUrl, bigidToken);

        const storageHelpers = createTpaStorageHelpers(bigidBaseUrl, tpaId, bigidToken);
        const geminiApiKey = await getGeminiApiKey(storageHelpers.getTpaStorage);

        const allServerConfigs = await getAllServerConfigs(storageHelpers.getTpaStorage, bigidBaseUrl, bigidToken);
        
        // Send status update about tool discovery
        ws.send(JSON.stringify({ 
            type: 'init_progress', 
            message: `Discovering tools from ${allServerConfigs.length} server(s)...` 
        }));
        
        const allTools = await discoverAllTools(allServerConfigs, storageHelpers, ws);

        // Send final status before completing initialization
        ws.send(JSON.stringify({ 
            type: 'init_progress', 
            message: `Found ${allTools.length} tools. Setting up AI model...` 
        }));

        const model = await getGenerativeModel({
            modelName: selectedModel,
            apiKey: geminiApiKey,
            enableThinking: true,
            tools: {
                functionDeclarations: allTools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: removeInvalidEnums(removeExamples(tool.inputSchema)),
                })),
            },
        });

        const chat = model.startChat({
            history: history || [],
            systemInstruction: {
                parts: [{
                    text: `You are an AI assistant integrated into BigID, a leading data security and privacy platform. You are running inside a user's BigID tenant and have access to their data governance ecosystem through the available tools.

Context:
- You are operating within the user's BigID system at ${bigidBaseUrl}
- When users ask about "my system", "my data", or "our environment", they are referring to their BigID tenant
- The tools you have access to connect to this BigID instance and can query data sources, scan results, classifications, policies, and other data governance information
- Users may ask about data discovery, classification, privacy compliance (GDPR, CCPA, etc.), data mapping, risk assessment, and security postures

Your role:
- Help users understand and manage their data landscape using BigID tools
- Provide insights about data governance, privacy, and security
- Use the available tools to answer questions about their specific data environment
- Be proactive in suggesting relevant tools or actions based on user questions
- Explain data governance concepts clearly when needed

Important:
- Always use the provided tools to access real data from the user's BigID system
- Be specific and accurate when referencing data from tool results
- If a tool fails or returns no data, explain this to the user rather than making assumptions
- Current date: ${new Date().toISOString()}`
                }]
            }
        });
        
        // Get any queued messages
        const currentSession = chatSessions.get(ws);
        const queuedMessages = currentSession?.messageQueue || [];
        
        // Update session with complete initialization
        chatSessions.set(ws, { 
            chat, 
            allTools, 
            allServerConfigs, 
            ...storageHelpers,
            bigidBaseUrl,  // Store for usage tracking per tenant
            isInitializing: false
        });
        
        ws.send(JSON.stringify({ type: 'init_complete' }));
        
        // Process any queued messages
        if (queuedMessages.length > 0) {
            for (const queuedMessage of queuedMessages) {
                try {
                    await handleMessage(ws, queuedMessage);
                } catch (error) {
                    console.error('Error processing queued message:', error);
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: `Error processing queued message: ${error.message}` 
                    }));
                }
            }
        }

    } catch (error) {
        console.error('Error initializing chat:', error);
        // Clean up session on error
        chatSessions.delete(ws);
        ws.send(JSON.stringify({ type: 'error', message: error.message || 'Failed to initialize chat session.' }));
    }
}

// Note: processToolCall is now imported from centralized tools module

async function handleMessage(ws, message) {
    const session = chatSessions.get(ws);
    if (!session) {
        ws.send(JSON.stringify({ type: 'error', message: 'Chat session not initialized.' }));
        return;
    }

    const { chat, allTools, allServerConfigs, getTpaStorage, setTpaStorage, bigidBaseUrl } = session;
    const { prompt } = message;

    try {
        // Check usage limits before making any AI API calls (now tracked per tenant)
        const usageCheck = await checkUsageLimits(bigidBaseUrl);
        if (!usageCheck.allowed) {
            const errorMessage = `Daily token limit exceeded. You have used ${usageCheck.currentUsage.toLocaleString()} of your ${usageCheck.dailyTokenLimit.toLocaleString()} daily tokens for this tenant. Please try again tomorrow when the limit resets.`;
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: errorMessage,
                usageLimitExceeded: true,
                usageInfo: usageCheck
            }));
            return;
        }

        // If limits are enabled, warn user when they're close to the limit
        if (usageCheck.dailyTokenLimit > 0 && usageCheck.remainingTokens < 1000) {
            ws.send(JSON.stringify({ 
                type: 'usage_warning', 
                message: `You have ${usageCheck.remainingTokens.toLocaleString()} tokens remaining in your daily limit.` 
            }));
        }

        // Log prompt for analytics (if user hasn't opted out via analyticsOptOut message field)
        try {
            const analyticsOptOut = message.analyticsOptOut || false;
            if (!analyticsOptOut) {
                const tenantId = getTenantIdentifier(bigidBaseUrl);
                const modelName = message.selectedModel || 'gemini-2.5-pro';
                await logPrompt(bigidBaseUrl, tenantId, prompt, modelName);
            }
        } catch (logError) {
            // Don't fail the request if logging fails
            console.error('Error logging prompt:', logError);
        }

        // Estimate initial token usage for the prompt
        const promptTokens = estimateTokenCount(prompt);

        let result = await chat.sendMessage(prompt);
        
        // Validate result before processing
        if (!result || (!result.response && !result.candidates)) {
            throw new Error('Invalid response from AI model');
        }
        
        // Track initial usage - normalize handles both response types
        const responseTokens = estimateTokenCount(normalizeTextResponse(result));
        const initialTokenUsage = promptTokens + responseTokens;
        
        await trackUsage(initialTokenUsage, bigidBaseUrl);

        let maxTurns = 30;
        let turn = 0;

        while (turn < maxTurns) {
            const calls = normalizeResponse(result);
            if (!calls || calls.length === 0) {
                break;
            }

            // Check usage limits before each additional AI call in the tool loop (now tracked per tenant)
            const loopUsageCheck = await checkUsageLimits(bigidBaseUrl);
            if (!loopUsageCheck.allowed) {
                // Send partial response and warn about limit
                ws.send(JSON.stringify({ 
                    type: 'response', 
                    message: normalizeTextResponse(result) + "\n\n⚠️ **Daily token limit reached during tool execution.** The response above is partial. Please try again tomorrow when the limit resets.",
                    partial: true
                }));
                return;
            }

            const toolResponsePromises = calls.map(call => {
                ws.send(JSON.stringify({ type: 'status', message: `Calling tool ${call.name}...` }));
                return processToolCall(call, allTools, allServerConfigs, { getTpaStorage, setTpaStorage }, ws);
            });

            const toolResponses = await Promise.all(toolResponsePromises);
            
            // Estimate tokens for tool responses
            const toolResponseText = toolResponses.map(r => JSON.stringify(r)).join(' ');
            const toolTokens = estimateTokenCount(toolResponseText);
            
            result = await chat.sendMessage(toolResponses);
            
            // Validate result before processing
            if (!result || (!result.response && !result.candidates)) {
                throw new Error('Invalid response from AI model during tool execution');
            }
            
            // Track tool call usage - normalize handles both response types
            const toolResultTokens = estimateTokenCount(normalizeTextResponse(result));
            const toolTurnUsage = toolTokens + toolResultTokens;
            
            await trackUsage(toolTurnUsage, bigidBaseUrl);
            
            turn++;
        }

        if (turn >= maxTurns) {
            throw new Error("Prompt execution exceeded maximum number of tool-calling turns.");
        }

        // Get full response including thinking content
        const fullResponse = getFullResponse(result);
        ws.send(JSON.stringify({ 
            type: 'response', 
            message: fullResponse.response,
            thinking: fullResponse.thinking // Include thinking content if present
        }));

        // Send usage update if limits are enabled
        if (usageCheck.dailyTokenLimit > 0) {
            const finalUsageCheck = await checkUsageLimits(bigidBaseUrl);
            ws.send(JSON.stringify({ 
                type: 'usage_update', 
                usageInfo: finalUsageCheck
            }));
        }

    } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
}

module.exports = (server) => {
    const wss = new WebSocket.Server({ server });

    function heartbeat() {
        this.isAlive = true;
    }

    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.on('pong', heartbeat);

        ws.on('message', (message) => {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.type === 'init') {
                initializeChat(ws, parsedMessage);
            } else if (chatSessions.has(ws)) {
                const session = chatSessions.get(ws);
                if (session.isInitializing) {
                    // Queue messages during initialization
                    session.messageQueue = session.messageQueue || [];
                    session.messageQueue.push(parsedMessage);
                } else {
                    handleMessage(ws, parsedMessage);
                }
            }
        });

        ws.on('close', () => {
            const session = chatSessions.get(ws);
            chatSessions.delete(ws);
        });
    });

    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 10000);

    wss.on('close', function close() {
        clearInterval(interval);
    });
};
