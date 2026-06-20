const { AnthropicVertex } = require('@anthropic-ai/vertex-sdk');
const { BaseModel, BaseChat } = require('./BaseModel');

class AnthropicModel extends BaseModel {
    constructor(projectId, location, modelName, tools) {
        super({ projectId, location, modelName, tools });
        this.projectId = projectId;
        this.location = location;
        this.modelName = modelName;
        this.tools = tools || [];
        
        // Initialize Anthropic Vertex client with proper parameters
        this.client = new AnthropicVertex({
            projectId: projectId,
            region: 'global',  // Use a supported region
        });
    }

    startChat({ history = [] } = {}) {
        return new AnthropicChat(this.client, this.modelName, this.tools, history);
    }
}

class AnthropicChat extends BaseChat {
    constructor(client, modelName, tools, history = []) {
        super(client, modelName, tools, history);
    }

    formatMessage(message) {
        if (typeof message === 'string') {
            return {
                role: 'user',
                content: message
            };
        } else if (Array.isArray(message)) {
            // Handle tool responses - extract from functionResponse structure
            const toolResults = message.map(result => {
                // Extract the actual function response data
                const functionResponse = result.functionResponse || result;
                const toolName = functionResponse.name;
                const toolResponse = functionResponse.response;
                
                return `Tool: ${toolName}\nResult: ${JSON.stringify(toolResponse)}`;
            }).join('\n\n');
            return {
                role: 'user',
                content: toolResults
            };
        }
        throw new Error('Unsupported message format');
    }

    async sendMessage(message) {
        // Build conversation history in Claude format
        let messages = [];
        
        // Add conversation history
        for (const msg of this.history) {
            messages.push({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: typeof msg.parts[0].text === 'string' ? msg.parts[0].text : JSON.stringify(msg.parts[0].text)
            });
        }
        
        // Add current message and update history
        const formattedMessage = this.formatMessage(message);
        messages.push(formattedMessage);
        
        // Update history with the user message
        const messageContent = formattedMessage.content;
        this.updateHistory('user', messageContent);

        // Prepare request options
        const requestOptions = {
            model: this.modelName,
            messages: messages,
            max_tokens: 4096,
            temperature: 0.7,
        };

        // Add tools if available
        if (this.tools && this.tools.length > 0) {
            requestOptions.tools = this.tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.parameters
            }));
        }

        const response = await this.client.messages.create(requestOptions);
        
        // Update history with the assistant's response
        // For Claude, we need to handle both text and tool use content
        const responseContent = this.getResponseText(response);
        this.updateHistory('model', responseContent);
        
        return this.normalizeResponse(response);
    }

    getResponseText(response) {
        if (!response.content) return 'No response';
        
        // Combine text parts (Claude can have multiple content blocks)
        const textParts = response.content
            .filter(content => content.type === 'text')
            .map(content => content.text);
        
        return textParts.join('\n') || 'No response';
    }

    extractToolCalls(response) {
        if (!response.content) return [];
        
        // Extract tool_use blocks from response
        const toolCalls = response.content
            .filter(content => content.type === 'tool_use')
            .map(call => ({
                name: call.name,
                args: call.input
            }));
        
        return toolCalls;
    }

    normalizeResponse(response) {
        const assistantMessage = this.getResponseText(response);
        const toolCalls = this.extractToolCalls(response);
        
        // Convert Claude response to match Gemini SDK format
        return {
            response: {
                candidates: [{
                    content: {
                        parts: [{
                            text: assistantMessage
                        }]
                    }
                }],
                // Handle tool calls if present
                functionCalls: () => {
                    return toolCalls;
                }
            }
        };
    }
}

module.exports = {
    AnthropicModel,
    AnthropicChat
};
