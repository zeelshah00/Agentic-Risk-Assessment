const { ProjectsClient } = require('@google-cloud/resource-manager').v3;
const { GoogleAuth } = require('google-auth-library');
const gcpMetadata = require('gcp-metadata');
const { AnthropicModel } = require('./models/AnthropicModel');
const { GoogleVertexModel } = require('./models/GoogleModel');

// Recursively removes the 'examples' key from a JSON schema object.
const removeExamples = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeExamples(item));
    }

    const newObj = {};
    for (const key in obj) {
        if (key === 'examples') {
            continue; // Skip the 'examples' key
        }
        newObj[key] = removeExamples(obj[key]);
    }
    return newObj;
};

// Recursively removes unsupported JSON schema properties for Vertex AI
const removeInvalidEnums = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeInvalidEnums(item));
    }

    const newObj = { ...obj };

    // Remove properties not supported by Vertex AI
    const unsupportedProperties = [
        '$schema',
        'additionalProperties',
        'exclusiveMinimum',
        'exclusiveMaximum'
    ];

    unsupportedProperties.forEach(prop => {
        if (newObj.hasOwnProperty(prop)) {
            delete newObj[prop];
        }
    });

    // Handle anyOf - VertexAI requires anyOf to be the only property when used
    if (newObj.hasOwnProperty('anyOf')) {
        // If anyOf is present, remove all other properties except anyOf
        const anyOfValue = newObj.anyOf;
        // Recursively process the anyOf items
        const processedAnyOf = anyOfValue.map(item => removeInvalidEnums(item));
        return { anyOf: processedAnyOf };
    }

    // Check if 'enum' exists and 'type' is not 'string' at the current level
    if (newObj.hasOwnProperty('enum') && newObj.type !== 'string') {
        delete newObj.enum;
    }

    // Recurse through the object's properties
    for (const key in newObj) {
        if (!unsupportedProperties.includes(key) && key !== 'enum') {
            newObj[key] = removeInvalidEnums(newObj[key]);
        }
    }

    return newObj;
};

const hasPermission = async (projectId, permission) => {
    try {
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = new ProjectsClient({ auth });
        const request = {
            resource: `projects/${projectId}`,
            permissions: [permission],
        };
        const [response] = await client.testIamPermissions(request);
        return response.permissions && response.permissions.includes(permission);
    } catch (error) {
        console.warn(`Failed to check IAM permissions:`, error.message);
        return false;
    }
};

const setGoogleCloudProject = async () => {
    try {
        const isAvailable = await gcpMetadata.isAvailable();
        if (isAvailable) {
            const projectId = await gcpMetadata.project('project-id');
            process.env.GOOGLE_CLOUD_PROJECT = projectId;

            const hasPerm = await hasPermission(projectId, 'aiplatform.endpoints.predict');
            if (!hasPerm) {
                console.warn("Application is missing the 'aiplatform.endpoints.predict' permission. Vertex AI features may not work correctly.");
            }
        }
    } catch (error) {
        console.warn('Could not verify Google Cloud environment.', error.message);
    }
};

const getAvailableModels = async () => {
    // All models use IAM authentication via Vertex AI Model Garden
    return [
        {
            id: 'claude-sonnet-4-5@20250929', // DO NOT CHANGE THIS ID
            name: 'Claude 3.5 Sonnet v2',
            description: 'Anthropic\'s most intelligent model with best-in-class reasoning',
            provider: 'Anthropic',
            category: 'Foundation'
        },
        {
            id: 'claude-haiku-4-5@20251001', // DO NOT CHANGE THIS ID
            name: 'Claude 3.5 Haiku',
            description: 'Fast and efficient model for everyday tasks',
            provider: 'Anthropic',
            category: 'Foundation'
        },
        {
            id: 'gemini-2.5-pro', // DO NOT CHANGE THIS ID
            name: 'Gemini 2.5 Pro',
            description: 'Google\'s most capable model for complex reasoning tasks',
            provider: 'Google',
            category: 'Foundation'
        },
        {
            id: 'gemini-3-pro-preview', // DO NOT CHANGE THIS ID
            name: 'Gemini 3 Pro Preview',
            description: 'Google\'s next-generation model with advanced reasoning capabilities',
            provider: 'Google',
            category: 'Foundation'
        },
    ];
};


const getGenerativeModel = async (config) => {
    let { modelName, tools, enableThinking } = config;
    
    // Check if this is a Claude model
    const isClaudeModel = modelName.toLowerCase().includes('claude') || modelName.toLowerCase().includes('anthropic');
    
    // Check if this is Gemini 3
    const isGemini3 = modelName.toLowerCase().includes('gemini-3');

    // Configuration for thinking mode
    // Gemini 3 uses the new thinking_level parameter (HIGH for dynamic thinking)
    // Older models use includeThoughts
    const thinkingConfig = enableThinking ? {
        generationConfig: {
            response_mime_type: "text/plain",
            temperature: 0.7,
            candidateCount: 1,
        },
        thinkingConfig: isGemini3 ? {
            thinking_level: 'HIGH'  // Gemini 3: HIGH for dynamic reasoning (default)
        } : {
            includeThoughts: true   // Legacy models: Enable thought summaries
        }
    } : {};

    // All models now use IAM authentication via Vertex AI
    let projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
        try {
            const isAvailable = await gcpMetadata.isAvailable();
            if (isAvailable) {
                projectId = await gcpMetadata.project('project-id');
                process.env.GOOGLE_CLOUD_PROJECT = projectId;
            } else {
                throw new Error("Not in a GCP environment and GOOGLE_CLOUD_PROJECT not set.");
            }
        } catch (error) {
            throw new Error(`Could not determine GCP project ID: ${error.message}`);
        }
    }
    
    // Gemini 3 Pro Preview requires 'global' location per documentation
    let location;
    if (isGemini3) {
        location = 'global';
    } else {
        location = process.env.GOOGLE_CLOUD_LOCATION;
        if (!location) {
            try {
                const isAvailable = await gcpMetadata.isAvailable();
                if (isAvailable) {
                    const instance = await gcpMetadata.instance();
                    if (instance && instance.zone) {
                        location = instance.zone.split('/')[3].slice(0, -2);
                        process.env.GOOGLE_CLOUD_LOCATION = location;
                    } else {
                        location = 'us-central1';
                    }
                } else {
                    location = 'us-central1';
                }
            } catch (error) {
                location = 'us-central1';
            }
        }
    }

    if (isClaudeModel) {
        // Use Anthropic Vertex SDK for Claude models
        const declarations = (tools && tools.functionDeclarations ? tools.functionDeclarations : tools || []).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: removeInvalidEnums(removeExamples(tool.inputSchema || tool.parameters)),
        }));

        // Model name is already in the correct format for Anthropic Vertex SDK
        return new AnthropicModel(projectId, location, modelName, declarations);
    } else {
        // Use Vertex AI SDK for Gemini models
        const declarations = (tools && tools.functionDeclarations ? tools.functionDeclarations : tools || []).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: removeInvalidEnums(removeExamples(tool.inputSchema || tool.parameters)),
        }));

        return new GoogleVertexModel(projectId, location, modelName, declarations, thinkingConfig);
    }
};

const verifyBigIDCredentials = async (bigidBaseUrl, bigidToken) => {
    const response = await fetch(`${bigidBaseUrl}/api/v1/tpa`, {
        headers: { 'Authorization': bigidToken },
    });
    if (!response.ok) {
        throw new Error(`Invalid BigID credentials. Status: ${response.status}`);
    }
};

/**
 * Select the best candidate from an array of candidates based on quality metrics
 * @param {Array} candidates - Array of candidate responses
 * @returns {Object|null} The best candidate or null if none found
 */
const selectBestCandidate = (candidates) => {
    if (!candidates || candidates.length === 0) {
        return null;
    }
    
    // Filter out candidates with poor finish reasons
    const validCandidates = candidates.filter(candidate => {
        const finishReason = candidate.finishReason;
        // Prefer STOP (normal completion) over other finish reasons
        // Reject SAFETY (blocked by safety filters) and RECITATION (blocked for copyright)
        return finishReason !== 'SAFETY' && finishReason !== 'RECITATION';
    });
    
    if (validCandidates.length === 0) {
        // If all candidates were filtered out, return the first one anyway
        return candidates[0];
    }
    
    if (validCandidates.length === 1) {
        return validCandidates[0];
    }
    
    // Select candidate with highest avgLogprobs (less negative = more confident)
    // avgLogprobs is the average log probability of tokens - higher is better
    return validCandidates.reduce((best, current) => {
        const bestProb = best.avgLogprobs ?? -Infinity;
        const currentProb = current.avgLogprobs ?? -Infinity;
        return currentProb > bestProb ? current : best;
    });
};

const normalizeResponse = (response) => {
    // Handle Claude model responses (which have a functionCalls method)
    if (response.response && typeof response.response.functionCalls === 'function') {
        return response.response.functionCalls();
    }
    
    // Handle Vertex AI responses
    if (response.candidates) {
        const bestCandidate = selectBestCandidate(response.candidates);
        const parts = bestCandidate?.content?.parts || [];
        return parts.filter(part => part.functionCall).map(part => part.functionCall);
    }
    
    return [];
};

/**
 * Extract thinking content and user-facing response from parts
 * Following Google's official Gemini API documentation:
 * - Parts with part.thought === true contain thinking/reasoning summaries
 * - Parts with part.thought === false or undefined contain user-facing responses
 * @param {Array} parts - Array of response parts
 * @returns {Object} Object with thinking and response properties
 */
const extractThinkingAndResponse = (parts) => {
    if (!parts || parts.length === 0) {
        return { thinking: null, response: '' };
    }
    
    let thinking = null;
    const responseParts = [];
    
    for (const part of parts) {
        const text = part.text || '';
        
        // Use the official part.thought boolean to identify thinking content
        if (part.thought === true) {
            // This is a thought summary
            thinking = text;
        } else {
            // This is user-facing response content
            responseParts.push(text);
        }
    }
    
    return {
        thinking,
        response: responseParts.join('')
    };
};

const normalizeTextResponse = (response) => {
    let parts = [];
    
    // Handle Claude model responses
    if (response.response && response.response.candidates) {
        const bestCandidate = selectBestCandidate(response.response.candidates);
        parts = bestCandidate?.content?.parts || [];
    }
    // Handle Vertex AI responses
    else if (response.candidates) {
        const bestCandidate = selectBestCandidate(response.candidates);
        parts = bestCandidate?.content?.parts || [];
    }
    
    const { thinking, response: responseText } = extractThinkingAndResponse(parts);
    
    // For backward compatibility, return just the response text
    // The thinking content can be accessed separately via extractThinkingAndResponse
    return responseText;
}

/**
 * Get full response including thinking content
 * @param {Object} response - The AI model response
 * @returns {Object} Object with thinking and response properties
 */
const getFullResponse = (response) => {
    let parts = [];
    
    // Handle Claude model responses
    if (response.response && response.response.candidates) {
        const bestCandidate = selectBestCandidate(response.response.candidates);
        parts = bestCandidate?.content?.parts || [];
    }
    // Handle Vertex AI responses
    else if (response.candidates) {
        const bestCandidate = selectBestCandidate(response.candidates);
        parts = bestCandidate?.content?.parts || [];
    }
    
    return extractThinkingAndResponse(parts);
}

module.exports = {
    removeExamples,
    removeInvalidEnums,
    hasPermission,
    setGoogleCloudProject,
    getAvailableModels,
    getGenerativeModel,
    verifyBigIDCredentials,
    normalizeResponse,
    normalizeTextResponse,
    getFullResponse,
};
