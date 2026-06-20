// Core agentic loop: sends a user prompt to the AI model and drives tool-call / response turns until the model returns plain text.
const path = require('path');
const { discoverTools, callMcpTool } = require('./mcp');
const { removeExamples, removeInvalidEnums, getGenerativeModel, normalizeResponse, normalizeTextResponse } = require('./utils');
const { getAllServerConfigs, discoverAllTools, processToolCall } = require('./tools');

async function runPrompt(prompt, history, { bigidToken, bigidBaseUrl, geminiApiKey, customMcpServers, getTpaStorage, setTpaStorage, selectedModel = 'gemini-2.5-pro' }) {
    let resultText = '';
    let promptStatus = 'success';

    try {

        // 1. Discover tools and prepare server configs using centralized logic
        const allServerConfigs = await getAllServerConfigs(getTpaStorage, bigidBaseUrl, bigidToken);
        const allTools = await discoverAllTools(allServerConfigs, { getTpaStorage, setTpaStorage });

        // 2. Initialize Gemini with tools

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

        // 3. Start conversation
        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.isUser ? 'user' : 'model',
                parts: [{ text: msg.text }],
            })),
        });

        let result = await chat.sendMessage(prompt);
        let maxTurns = 10;
        let turn = 0;

        while (turn < maxTurns) {
            let calls = normalizeResponse(result.response);
            if (!calls || calls.length === 0) {
                break;
            }



            const toolResponsePromises = calls.map(async (call) => {
                return await processToolCall(call, allTools, allServerConfigs, { getTpaStorage, setTpaStorage });
            });

            const toolResponses = await Promise.all(toolResponsePromises);
            result = await chat.sendMessage(toolResponses);
            turn++;
        }

        if (turn >= maxTurns) {
            throw new Error("Prompt execution exceeded maximum number of tool-calling turns.");
        }

        resultText = normalizeTextResponse(result.response);

    } catch (error) {
        console.error(`Error running prompt:`, error);
        promptStatus = 'failed';
        resultText = error.message;
    }

    return {
        status: promptStatus,
        result: resultText,
    };
}


// COMMENTED OUT - AGENT FUNCTIONALITY DISABLED
/*
async function runAgent(agent, { bigidToken, bigidBaseUrl, geminiApiKey, customMcpServers, getTpaStorage, setTpaStorage, objectList }) {
    let agentResult = '';
    let agentStatus = 'success';

    try {
        console.log(`Running agent.`);

        // 1. Discover tools and prepare server configs using centralized logic
        const allServerConfigs = await getAllServerConfigs(getTpaStorage, bigidBaseUrl, bigidToken);
        const allTools = await discoverAllTools(allServerConfigs, { getTpaStorage, setTpaStorage });

        // 2. Initialize Gemini with tools
        console.log(`Using authentication for Gemini.`);
        
        const model = await getGenerativeModel({
            modelName: "gemini-2.5-pro",
            apiKey: geminiApiKey,
            tools: {
                functionDeclarations: allTools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: removeInvalidEnums(removeExamples(tool.inputSchema)),
                })),
            },
        });

        // 3. Get agent's context
        const agentContextKey = `gemini_agent_context_${agent.id}`;
        let agentContext = await getTpaStorage(agentContextKey) || "No previous context available.";

        // Truncate context to the last 50,000 characters to avoid exceeding token limits
        if (agentContext.length > 50000) {
            console.log(`Truncating agent context.`);
            agentContext = agentContext.slice(-50000);
        }

        // 4. Construct initial prompt and start conversation
        const chat = model.startChat({
            history: [{
                role: "user",
                parts: [{ text: `PREVIOUS CONTEXT:\n${agentContext}` }],
            }],
        });

        const initialPrompt = `
You are an autonomous agent. You have a long-term memory (context) that you can read from and write to.
Your goal is to complete the user's task. You can also control your own execution schedule.
Your current schedule is: ${agent.schedule}. This script is being run on an hourly cron job.
The current date is: ${new Date().toISOString()}.
You MUST use the provided tools to answer questions and perform actions. Do not invent results.
Your final response MUST be a JSON object with the following keys:
- "result": (string) A description of the outcome of your work for this execution cycle.
- "new_context": (string) The information you want to remember for the next time you run. This is your only memory.
- "new_schedule": (optional string) If you want to change your schedule, set this to "hourly" (every hour), "daily" (every 24 hours), "weekly" (every 168 hours), "monthly" (every 720 hours), "remediation" (only when called for object remediation), or "manual" (only when manually triggered). If you don't want to change it, omit this key.
${objectList && objectList.length > 0 ? `\nOBJECTS TO PROCESS:\nYou have been provided with the following list of objects to process:\n${JSON.stringify(objectList, null, 2)}\n` : ''}---
USER TASK:
${agent.prompt}
`;

        let result = await chat.sendMessage(initialPrompt);
        let maxTurns = 10; // Safety break to prevent infinite loops
        let turn = 0;

        while (turn < maxTurns) {
            let calls = normalizeResponse(result.response);
            console.log(calls)
            if (!calls || calls.length === 0) {
                // No tool calls, this should be the final answer
                break;
            }


            const toolResponsePromises = calls.map(async (call) => {
                return await processToolCall(call, allTools, allServerConfigs, { getTpaStorage, setTpaStorage });
            });

            const toolResponses = await Promise.all(toolResponsePromises);

            // Send all tool results back to Gemini in one go
            result = await chat.sendMessage(toolResponses);
            turn++;
        }

        if (turn >= maxTurns) {
            throw new Error("Agent exceeded maximum number of tool-calling turns.");
        }

        // 5. Parse final response and update context/schedule
        const geminiOutput = normalizeTextResponse(result.response);
        try {
            const jsonMatch = geminiOutput.match(/```json\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : geminiOutput;
            const parsedOutput = JSON.parse(jsonString);
            agentResult = parsedOutput.result || "No result provided.";
            
            const newContext = parsedOutput.new_context || "";
            await setTpaStorage(agentContextKey, newContext);
            console.log(`Agent completed successfully.`);

            if (parsedOutput.new_schedule && ['hourly', 'daily', 'manual'].includes(parsedOutput.new_schedule)) {
                agent.schedule = parsedOutput.new_schedule;
                console.log(`Agent updated its schedule.`);
            }
        } catch (e) {
            console.error("Failed to parse Gemini's final JSON response. Storing raw output as result.", e);
            agentResult = geminiOutput;
        }

    } catch (error) {
        console.error(`Error running agent ${agent.id}:`, error);
        agentStatus = 'failed';
        agentResult = error.message;
    }

    // Return the updated agent object
    const updatedAgent = {
        ...agent,
        status: agentStatus,
        result: agentResult,
        lastRun: new Date().toISOString(),
    };
    
    return updatedAgent;
}
*/

// REPLACEMENT FUNCTION - Agent functionality disabled
async function runAgent(agent, { bigidToken, bigidBaseUrl, geminiApiKey, customMcpServers, getTpaStorage, setTpaStorage, objectList }) {
    console.log("runAgent called but agent functionality is disabled");
    
    // Return a disabled agent object
    return {
        ...agent,
        status: 'disabled',
        result: 'Agent functionality has been disabled',
        lastRun: new Date().toISOString(),
    };
}

module.exports = {
    runPrompt,
    runAgent,
};
