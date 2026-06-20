const { GoogleGenAI } = require('@google/genai');
const { BaseModel, BaseChat } = require('./BaseModel');

class GoogleVertexModel extends BaseModel {
    constructor(projectId, location, modelName, tools, config = {}) {
        super({ projectId, location, modelName, tools, ...config });
        this.projectId = projectId;
        this.location = location;
        this.modelName = modelName;
        this.tools = tools || [];
        this.config = config;
        
        // Initialize Google Gen AI client with Vertex AI
        this.ai = new GoogleGenAI({
            vertexai: true,
            project: projectId,
            location: location
        });
    }

    startChat({ history = [], systemInstruction = null } = {}) {
        return new GoogleVertexChat(this.ai, this.modelName, this.tools, this.config, history, systemInstruction);
    }
}

class GoogleVertexChat extends BaseChat {
    constructor(ai, modelName, tools, config, history = [], systemInstruction = null) {
        super(null, modelName, tools, history);
        this.ai = ai;
        this.config = config;
        this.systemInstruction = systemInstruction;
        
        // Convert tools to the new SDK format
        this.toolsConfig = this.prepareTools(tools);
    }

    prepareTools(tools) {
        if (!tools || tools.length === 0) {
            return null;
        }
        
        // Convert tools to new SDK format
        const functionDeclarations = tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters // Already in JSON schema format
        }));
        
        return {
            tools: [{
                functionDeclarations: functionDeclarations
            }]
        };
    }

    formatMessage(message) {
        // The new SDK uses the same format - no conversion needed
        return message;
    }

    async sendMessage(message) {
        // Prepare the request config
        const requestConfig = {
            model: this.modelName,
            contents: [...this.history]
        };
        
        // Add system instruction if provided
        if (this.systemInstruction) {
            requestConfig.systemInstruction = this.systemInstruction;
        }
        
        // Add config (including tools and thinking config)
        if (this.config || this.toolsConfig) {
            requestConfig.config = {
                ...this.config,
                ...(this.toolsConfig || {})
            };
        }
        
        // Add the new message to contents
        if (typeof message === 'string') {
            requestConfig.contents.push({
                role: 'user',
                parts: [{ text: message }]
            });
        } else if (Array.isArray(message)) {
            // Handle tool responses (FunctionResponse objects)
            const parts = message.map(result => ({
                functionResponse: {
                    name: result.name,
                    response: result.response
                }
            }));
            requestConfig.contents.push({
                role: 'user',
                parts: parts
            });
        }
        
        // Call the API
        const result = await this.ai.models.generateContent(requestConfig);
        
        // Update history with user message
        if (typeof message === 'string') {
            this.updateHistory('user', message);
        } else if (Array.isArray(message)) {
            this.history.push({
                role: 'user',
                parts: message.map(result => ({
                    functionResponse: {
                        name: result.name,
                        response: result.response
                    }
                }))
            });
        }
        
        // Update history with model response
        const candidate = result.candidates?.[0];
        if (candidate?.content?.parts) {
            this.history.push({
                role: 'model',
                parts: candidate.content.parts
            });
        }
        
        return this.normalizeResponse(result);
    }

    getResponseText(response) {
        return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    extractToolCalls(response) {
        const parts = response.candidates?.[0]?.content?.parts || [];
        return parts.filter(part => part.functionCall).map(part => part.functionCall);
    }

    normalizeResponse(response) {
        // The new SDK returns the response in the same format as before
        return response;
    }
}

module.exports = {
    GoogleVertexModel,
    GoogleVertexChat
};
