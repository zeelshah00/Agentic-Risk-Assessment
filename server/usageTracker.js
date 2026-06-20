// Per-tenant token usage tracking backed by Firestore. Tenants are keyed by hashed BigID URL so one deployment can serve many instances.
const crypto = require('crypto');
const { getUsageForEnvironment, incrementUsageForEnvironment } = require('./firestoreService');

/**
 * Create a tenant identifier from BigID URL
 * @param {string} bigidBaseUrl - The BigID tenant URL
 * @returns {string} A safe, consistent identifier for the tenant
 */
function getTenantIdentifier(bigidBaseUrl) {
    if (!bigidBaseUrl) {
        return 'unknown';
    }
    
    try {
        // Parse the URL and extract hostname
        const url = new URL(bigidBaseUrl);
        const hostname = url.hostname.toLowerCase();
        
        // Create a hash of the hostname for a consistent, safe identifier
        // This handles long hostnames and special characters
        const hash = crypto.createHash('sha256').update(hostname).digest('hex').substring(0, 16);
        
        // Return a combination of a sanitized hostname prefix and hash for readability
        const sanitized = hostname.replace(/[^a-z0-9-]/g, '-').substring(0, 32);
        return `${sanitized}_${hash}`;
    } catch (error) {
        console.error('Error parsing bigidBaseUrl:', error);
        // Fallback to a hash of the entire URL
        return crypto.createHash('sha256').update(bigidBaseUrl).digest('hex').substring(0, 32);
    }
}

// Check if usage limits allow for AI API calls
async function checkUsageLimits(bigidBaseUrl) {
    const dailyTokenLimit = parseInt(process.env.DAILY_TOKEN_LIMIT) || 0;
    const environmentName = process.env.ENVIRONMENT_NAME || 'unknown';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // SECURITY: All requests must have a valid BigID URL for usage tracking
    if (!bigidBaseUrl || bigidBaseUrl === 'unknown') {
        console.error('Usage tracking failed: Missing or invalid BigID URL');
        return {
            allowed: false,
            currentUsage: 0,
            dailyTokenLimit: dailyTokenLimit || 0,
            remainingTokens: 0,
            tenantId: 'unknown',
            environmentName,
            error: 'Missing BigID tenant URL - usage tracking required for all requests'
        };
    }
    
    const tenantId = getTenantIdentifier(bigidBaseUrl);
    
    // If no limit is set, still track usage but allow the call
    if (dailyTokenLimit === 0) {
        return { allowed: true, currentUsage: 0, dailyTokenLimit: 0, tenantId };
    }
    
    try {
        // Get current usage from Firestore (server-side, secure storage)
        // Now tracked per tenant instead of per deployment environment
        const currentUsage = await getUsageForEnvironment(tenantId, today);
        
        const allowed = currentUsage < dailyTokenLimit;
        const remainingTokens = Math.max(0, dailyTokenLimit - currentUsage);
        
        return {
            allowed,
            currentUsage,
            dailyTokenLimit,
            remainingTokens,
            tenantId,
            environmentName
        };
    } catch (error) {
        console.error('Error checking usage limits from Firestore:', error);
        // On error, deny the request to be safe
        return {
            allowed: false,
            currentUsage: 0,
            dailyTokenLimit,
            remainingTokens: 0,
            tenantId,
            environmentName,
            error: error.message
        };
    }
}

// Track token usage after an AI API call
async function trackUsage(tokenCount, bigidBaseUrl) {
    if (!tokenCount || tokenCount <= 0) {
        return { success: true, message: 'No tokens to track' };
    }
    
    // SECURITY: All requests must have a valid BigID URL for usage tracking
    if (!bigidBaseUrl || bigidBaseUrl === 'unknown') {
        console.error('Usage tracking failed: Missing or invalid BigID URL');
        return {
            success: false,
            currentUsage: 0,
            tenantId: 'unknown',
            message: 'Failed to track token usage: Missing BigID tenant URL',
            error: 'Missing BigID tenant URL - usage tracking required for all requests'
        };
    }
    
    const tenantId = getTenantIdentifier(bigidBaseUrl);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    try {
        // Increment usage in Firestore (server-side, secure storage with atomic transaction)
        // Now tracked per tenant instead of per deployment environment
        // Pass the original bigidBaseUrl as metadata for reference
        const newUsage = await incrementUsageForEnvironment(tenantId, today, tokenCount, bigidBaseUrl);
        
        return {
            success: true,
            currentUsage: newUsage,
            tenantId,
            tenantUrl: bigidBaseUrl,
            message: `Tracked ${tokenCount} tokens. Total usage: ${newUsage}`
        };
    } catch (error) {
        console.error('Error tracking usage in Firestore:', error);
        return {
            success: false,
            currentUsage: 0,
            tenantId,
            message: `Failed to track token usage: ${error.message}`,
            error: error.message
        };
    }
}

// Estimate token count from text (rough approximation)
function estimateTokenCount(text) {
    if (!text) return 0;
    
    // Rough estimation: 1 token ≈ 4 characters for most languages
    // This is a conservative estimate for Gemini models
    return Math.ceil(text.length / 4);
}

module.exports = {
    checkUsageLimits,
    trackUsage,
    estimateTokenCount,
    getTenantIdentifier
};
