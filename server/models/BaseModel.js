/**
 * Base interface for AI model implementations
 * All model implementations should follow this interface
 */
class BaseModel {
    constructor(config) {
        this.config = config;
    }

    /**
     * Start a chat session with optional history
     * @param {Object} options - Chat options including history
     * @returns {BaseChat} Chat instance
     */
    startChat(options = {}) {
        throw new Error('startChat method must be implemented by subclass');
    }
}

/**
 * Base interface for chat sessions
 */
class BaseChat {
    constructor(client, modelName, tools, history = []) {
        this.client = client;
        this.modelName = modelName;
        this.tools = tools || [];
        this.history = [...history]; // Create a copy to avoid mutation
    }

    /**
     * Send a message and get a response
     * @param {string|Array} message - The message to send or tool responses
     * @returns {Object} Normalized response object
     */
    async sendMessage(message) {
        throw new Error('sendMessage method must be implemented by subclass');
    }

    /**
     * Update conversation history with a new message
     * @param {string} role - 'user' or 'model'/'assistant'
     * @param {string} content - Message content
     */
    updateHistory(role, content) {
        this.history.push({
            role: role,
            parts: [{ text: content }]
        });
    }

    /**
     * Convert message to provider-specific format
     * @param {string|Array} message - The message to convert
     * @returns {Object} Provider-specific message format
     */
    formatMessage(message) {
        throw new Error('formatMessage method must be implemented by subclass');
    }

    /**
     * Convert provider response to normalized format
     * @param {Object} response - Provider-specific response
     * @returns {Object} Normalized response format
     */
    normalizeResponse(response) {
        throw new Error('normalizeResponse method must be implemented by subclass');
    }

    /**
     * Extract tool calls from provider response
     * @param {Object} response - Provider-specific response
     * @returns {Array} Array of tool call objects
     */
    extractToolCalls(response) {
        throw new Error('extractToolCalls method must be implemented by subclass');
    }

    /**
     * Get response text from provider response
     * @param {Object} response - Provider-specific response
     * @returns {string} Response text
     */
    getResponseText(response) {
        throw new Error('getResponseText method must be implemented by subclass');
    }
}

module.exports = {
    BaseModel,
    BaseChat
};
