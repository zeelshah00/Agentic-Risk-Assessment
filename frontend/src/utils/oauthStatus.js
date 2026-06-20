/**
 * OAuth Status Utilities
 * Check OAuth token status directly from TPA storage
 */

import { tpaGet } from './tpa';
import { TPA_STORAGE_KEYS } from './tpaStorageKeys';

/**
 * Check if OAuth is successfully configured for a server
 * @param {string} appId - TPA app ID
 * @param {string} serverId - Server ID
 * @returns {Promise<Object>} OAuth status information
 */
export const checkOAuthStatus = async (appId, serverId) => {
    try {
        const allServers = await tpaGet(appId, TPA_STORAGE_KEYS.MCP_SERVERS) || [];
        const server = allServers.find(s => s.id === serverId);
        const tokens = server?.oauthTokens;
        
        // Debug logging
        console.log('OAuth Status Check Debug:', {
            appId,
            serverId,
            allServersCount: allServers.length,
            serverFound: !!server,
            serverIds: allServers.map(s => s.id),
            hasTokens: !!tokens,
            hasAccessToken: !!tokens?.access_token,
            server: server
        });
        
        if (!tokens || !tokens.access_token) {
            return {
                isConfigured: false,
                hasValidToken: false,
                reason: 'No OAuth tokens found'
            };
        }
        
        // Debug token information (can be removed in production)
        console.log('OAuth Token Debug:', {
            expires_in: tokens.expires_in,
            issued_at: tokens.issued_at,
            current_time: Date.now(),
            token_keys: Object.keys(tokens)
        });
        
        // Check if token has expiration info
        if (!tokens.expires_in) {
            // If no expires_in, assume token is valid (some OAuth servers don't provide this)
            return {
                isConfigured: true,
                hasValidToken: true,
                reason: 'Token exists (no expiration info available)',
                tokens: {
                    hasAccessToken: true,
                    hasRefreshToken: !!tokens.refresh_token
                }
            };
        }
        
        // Calculate expiration time
        let expirationTime;
        if (tokens.issued_at) {
            // Use issued_at if available
            expirationTime = tokens.issued_at + (tokens.expires_in * 1000);
        } else {
            // Fallback: assume token was issued now (this might indicate a bug in token storage)
            console.warn('Token missing issued_at timestamp, using current time as fallback');
            expirationTime = Date.now() + (tokens.expires_in * 1000);
        }
        
        // Check if token is expired (with 5 minute buffer)
        const bufferTime = 5 * 60 * 1000; // 5 minutes
        const isExpired = Date.now() >= (expirationTime - bufferTime);
        
        console.log('Token Expiration Check:', {
            expirationTime: new Date(expirationTime).toISOString(),
            currentTime: new Date().toISOString(),
            timeUntilExpiry: expirationTime - Date.now(),
            isExpired
        });
        
        return {
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
        };
        
    } catch (error) {
        console.error('Error checking OAuth status:', error);
        return {
            isConfigured: false,
            hasValidToken: false,
            reason: `Error: ${error.message}`,
            error: error.message
        };
    }
};

/**
 * Check if OAuth is needed for a server configuration
 * @param {Object} serverConfig - Server configuration
 * @returns {boolean} True if OAuth is required
 */
export const isOAuthRequired = (serverConfig) => {
    return (serverConfig.transport === 'sse' || serverConfig.transport === 'streamablehttp') && 
           serverConfig.authType === 'oauth' && 
           serverConfig.oauth?.enabled;
};

/**
 * Get OAuth status display information
 * @param {Object} status - Status from checkOAuthStatus
 * @returns {Object} Display information
 */
export const getOAuthStatusDisplay = (status) => {
    if (!status.isConfigured) {
        return {
            icon: '❌',
            text: 'Not configured',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
        };
    }
    
    if (!status.hasValidToken) {
        return {
            icon: '⚠️',
            text: status.reason,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200'
        };
    }
    
    const hoursLeft = Math.floor(status.expiresIn / (1000 * 60 * 60));
    const minutesLeft = Math.floor((status.expiresIn % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
        icon: '✅',
        text: `Valid (expires in ${hoursLeft}h ${minutesLeft}m)`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
    };
};
