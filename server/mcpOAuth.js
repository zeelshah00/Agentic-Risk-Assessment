/**
 * MCP OAuth 2.1 Implementation following the MCP Authorization Specification
 * https://modelcontextprotocol.io/specification/draft/basic/authorization
 */

const crypto = require('crypto');

class McpOAuthClient {
    constructor(mcpServerUrl, storage, serverId = null) {
        this.mcpServerUrl = mcpServerUrl;
        this.storage = storage;
        this.canonicalUri = this.normalizeServerUri(mcpServerUrl);
        // Use provided serverId or generate one from URL as fallback
        this.serverId = serverId || this.createSafeServerId(mcpServerUrl);
    }

    /**
     * Create a safe server identifier for TPA storage keys
     * TPA storage doesn't support special characters like :, /, etc.
     * This is a fallback method for when serverId is not provided
     */
    createSafeServerId(url) {
        // Use base64 encoding and remove special characters to create a safe key
        return Buffer.from(url).toString('base64').replace(/[+/=]/g, '');
    }

    /**
     * Get the OAuth callback URL from environment variable
     */
    getCallbackUrl() {
        const baseUrl = process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3000';
        return `${baseUrl}/api/mcp/oauth/callback`;
    }

    /**
     * Normalize MCP server URI following RFC 8707 Section 2
     */
    normalizeServerUri(url) {
        try {
            const uri = new URL(url);
            // Convert to lowercase scheme and host
            uri.protocol = uri.protocol.toLowerCase();
            uri.hostname = uri.hostname.toLowerCase();
            // Remove trailing slash unless semantically significant
            if (uri.pathname.endsWith('/') && uri.pathname !== '/') {
                uri.pathname = uri.pathname.slice(0, -1);
            }
            // Remove fragment
            uri.hash = '';
            return uri.toString();
        } catch (error) {
            throw new Error(`Invalid MCP server URL: ${url}`);
        }
    }

    /**
     * Discover OAuth authorization server using multiple methods
     * Falls back to alternative discovery methods if oauth-protected-resource is not available
     */
    async discoverAuthorizationServer() {
        // Method 1: Try OAuth 2.0 Protected Resource Metadata (RFC 9728)
        try {
            const protectedResourceUrl = new URL('/.well-known/oauth-protected-resource', this.mcpServerUrl);
            
            const response = await fetch(protectedResourceUrl.toString());
            if (response.ok) {
                const metadata = await response.json();
                
                if (metadata.authorization_servers && metadata.authorization_servers.length > 0) {
                    const authServerUrl = metadata.authorization_servers[0];
                    return authServerUrl;
                }
            }
        } catch (error) {
            // Metadata not available, proceed to next method
        }

        // Method 2: Try standard OAuth Authorization Server Metadata endpoints
        const serverUrl = new URL(this.mcpServerUrl);
        const baseUrl = `${serverUrl.protocol}//${serverUrl.host}`;
        
        // Common OAuth authorization server discovery endpoints
        const discoveryEndpoints = [
            // Standard OAuth Authorization Server Metadata
            `${baseUrl}/.well-known/oauth-authorization-server`,
            // OpenID Connect Discovery  
            `${baseUrl}/.well-known/openid-configuration`,
            // Server URL itself might be the authorization server
            this.mcpServerUrl
        ];

        for (const endpoint of discoveryEndpoints) {
            try {
                const response = await fetch(endpoint);
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const metadata = await response.json();
                        
                        // Check if this looks like OAuth server metadata
                        if (metadata.authorization_endpoint && metadata.token_endpoint) {
                            // Return the issuer if available, otherwise use the endpoint URL
                            return metadata.issuer || endpoint;
                        }
                    }
                }
            } catch (error) {
                // Failed to fetch from this endpoint, try the next one
                continue;
            }
        }

        // Method 3: Fallback - assume the MCP server URL is also the OAuth server
        return this.mcpServerUrl;
    }

    /**
     * Discover authorization server metadata using multiple well-known endpoints
     * More flexible approach that handles servers without PKCE support
     */
    async discoverServerMetadata(authServerUrl) {
        const issuerUrl = new URL(authServerUrl);
        const wellKnownEndpoints = [];
        
        // For issuer URLs with path components
        if (issuerUrl.pathname && issuerUrl.pathname !== '/') {
            const pathComponent = issuerUrl.pathname;
            wellKnownEndpoints.push(
                new URL(`/.well-known/oauth-authorization-server${pathComponent}`, `${issuerUrl.protocol}//${issuerUrl.host}`).toString(),
                new URL(`/.well-known/openid-configuration${pathComponent}`, `${issuerUrl.protocol}//${issuerUrl.host}`).toString(),
                new URL(`${pathComponent}/.well-known/openid-configuration`, `${issuerUrl.protocol}//${issuerUrl.host}`).toString()
            );
        }
        
        // Standard endpoints
        wellKnownEndpoints.push(
            new URL('/.well-known/oauth-authorization-server', issuerUrl).toString(),
            new URL('/.well-known/openid-configuration', issuerUrl).toString()
        );
        
        let bestMetadata = null;
        let hasValidPKCE = false;
        
        for (const endpoint of wellKnownEndpoints) {
            try {
                const response = await fetch(endpoint);
                if (response.ok) {
                    const metadata = await response.json();
                    
                    // Validate required endpoints
                    if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
                        continue;
                    }
                    
                    bestMetadata = metadata;
                    
                    // Check PKCE support (preferred but not strictly required)
                    if (metadata.code_challenge_methods_supported && 
                        metadata.code_challenge_methods_supported.includes('S256')) {
                        hasValidPKCE = true;
                        return metadata; // Return immediately if PKCE is supported
                    } else {
                        // Proceed without PKCE
                    }
                }
            } catch (error) {
                // Failed to fetch metadata from this endpoint, try the next one
                continue;
            }
        }
        
        if (bestMetadata) {
            if (!hasValidPKCE) {
                console.warn('WARNING: Authorization server does not support PKCE. This is less secure but proceeding anyway.');
            }
            return bestMetadata;
        }
        
        throw new Error('Failed to discover authorization server metadata');
    }

    /**
     * Attempt Dynamic Client Registration (RFC 7591)
     */
    async registerClient(serverMetadata) {
        if (!serverMetadata.registration_endpoint) {
            return null;
        }

        const registrationRequest = {
            client_name: 'MCP Client',
            redirect_uris: [this.getCallbackUrl()],
            grant_types: ['authorization_code'],
            response_types: ['code'],
            token_endpoint_auth_method: 'none', // Public client
            application_type: 'native'
        };

        try {
            const response = await fetch(serverMetadata.registration_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(registrationRequest)
            });

            if (!response.ok) {
                throw new Error(`Client registration failed: ${response.status}`);
            }

            const clientInfo = await response.json();
            
            // Store client info
            await this.storage.setTpaStorage(`oauth_client_${this.serverId}`, clientInfo);
            
            return clientInfo;
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate PKCE challenge and verifier (if supported by the server)
     */
    generatePkceChallenge(serverMetadata) {
        // Only generate PKCE if the server supports it
        if (serverMetadata.code_challenge_methods_supported && 
            serverMetadata.code_challenge_methods_supported.includes('S256')) {
            const verifier = crypto.randomBytes(32).toString('base64url');
            const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
            
            return {
                codeVerifier: verifier,
                codeChallenge: challenge,
                codeChallengeMethod: 'S256'
            };
        }
        
        // Return null if PKCE is not supported
        return null;
    }

    /**
     * Build authorization URL
     */
    buildAuthorizationUrl(serverMetadata, clientInfo, pkce = null) {
        const state = crypto.randomBytes(16).toString('hex');
        
        const authUrl = new URL(serverMetadata.authorization_endpoint);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', clientInfo.client_id);
        authUrl.searchParams.append('redirect_uri', this.getCallbackUrl());
        
        // Determine appropriate scope based on server capabilities
        // Many OAuth 2.0 servers work without any scope, so we'll be conservative
        let scope = null;
        
        if (serverMetadata.scopes_supported && serverMetadata.scopes_supported.length > 0) {
            // If server explicitly lists supported scopes, use them
            if (serverMetadata.scopes_supported.includes('read')) {
                scope = 'read';
            } else if (serverMetadata.scopes_supported.includes('api')) {
                scope = 'api';
            } else if (serverMetadata.scopes_supported.includes('openid')) {
                scope = 'openid';
            } else {
                // Use the first supported scope
                scope = serverMetadata.scopes_supported[0];
            }
        }
        // For servers without explicit scope support, omit scope parameter
        // This is the most compatible approach for OAuth 2.0 servers
        
        // Only add scope if we determined one
        if (scope) {
            authUrl.searchParams.append('scope', scope);
        }
        
        authUrl.searchParams.append('state', state);
        
        // Only add PKCE parameters if supported
        if (pkce) {
            authUrl.searchParams.append('code_challenge', pkce.codeChallenge);
            authUrl.searchParams.append('code_challenge_method', pkce.codeChallengeMethod);
        }
        
        // Include resource parameter (RFC 8707)
        authUrl.searchParams.append('resource', this.canonicalUri);
        
        return { url: authUrl.toString(), state, serverUrl: this.mcpServerUrl };
    }

    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForTokens(serverMetadata, clientInfo, code, codeVerifier = null) {
        const tokenRequest = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.getCallbackUrl(),
            client_id: clientInfo.client_id,
            resource: this.canonicalUri // Include resource parameter
        };

        // Only include code_verifier if PKCE was used
        if (codeVerifier) {
            tokenRequest.code_verifier = codeVerifier;
        }

        try {
            const response = await fetch(serverMetadata.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams(tokenRequest)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Token exchange failed: ${response.status} - ${errorData}`);
            }

            const tokens = await response.json();
            
            // Add issued_at timestamp for frontend
            return {
                ...tokens,
                issued_at: Date.now()
            };
        } catch (error) {
            console.error('Token exchange failed:', error);
            throw error;
        }
    }

    /**
     * Get stored access token, refresh if needed
     */
    async getAccessToken() {
        const storedTokens = await this.storage.getTpaStorage(`oauth_tokens_${this.serverId}`);
        
        if (!storedTokens) {
            return null;
        }

        // Check if token is expired (with 5 minute buffer)
        const expirationTime = storedTokens.issued_at + (storedTokens.expires_in * 1000) - (5 * 60 * 1000);
        
        if (Date.now() > expirationTime && storedTokens.refresh_token) {
            try {
                const refreshedTokens = await this.refreshAccessToken(storedTokens.refresh_token);
                return refreshedTokens.access_token;
            } catch (error) {
                console.error('Token refresh failed:', error);
                return null;
            }
        }

        return storedTokens.access_token;
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        const serverMetadata = await this.getServerMetadata();
        const clientInfo = await this.storage.getTpaStorage(`oauth_client_${this.serverId}`);
        
        if (!serverMetadata || !clientInfo) {
            throw new Error('Missing OAuth configuration for token refresh');
        }

        const refreshRequest = {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientInfo.client_id,
            resource: this.canonicalUri
        };

        const response = await fetch(serverMetadata.token_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams(refreshRequest)
        });

        if (!response.ok) {
            throw new Error(`Token refresh failed: ${response.status}`);
        }

        const tokens = await response.json();
        
        // Return tokens with timestamp - caller is responsible for storage
        return {
            ...tokens,
            issued_at: Date.now()
        };
    }

    /**
     * Get stored server metadata
     */
    async getServerMetadata() {
        return await this.storage.getTpaStorage(`oauth_server_metadata_${this.serverId}`);
    }

    /**
     * Full OAuth flow initialization
     */
    async initializeOAuth() {
        try {
            // Step 1: Discover authorization server
            const authServerUrl = await this.discoverAuthorizationServer();
            
            // Step 2: Get server metadata
            const serverMetadata = await this.discoverServerMetadata(authServerUrl);
            await this.storage.setTpaStorage(`oauth_server_metadata_${this.serverId}`, serverMetadata);
            
            // Step 3: Try Dynamic Client Registration
            let clientInfo = await this.registerClient(serverMetadata);
            
            if (!clientInfo) {
                // If dynamic registration failed, we need manual client configuration
                throw new Error('Dynamic Client Registration not supported and no manual client configuration provided');
            }
            
            // Step 4: Generate PKCE challenge (if supported)
            const pkce = this.generatePkceChallenge(serverMetadata);
            if (pkce) {
                await this.storage.setTpaStorage(`oauth_pkce_${this.serverId}`, pkce);
            }
            
            // Step 5: Build authorization URL
            const authData = this.buildAuthorizationUrl(serverMetadata, clientInfo, pkce);
            
            return {
                authorizationUrl: authData.url,
                requiresUserInteraction: true
            };
            
        } catch (error) {
            console.error('OAuth initialization failed:', error);
            throw error;
        }
    }
}

module.exports = { McpOAuthClient };
