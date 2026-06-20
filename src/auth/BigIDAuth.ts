import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDConfig } from '../config/types';

export interface AuthResponse {
  success?: boolean;
  message?: string;
  auth_token?: string;
  username?: string;
  firstName?: string;
  permissions?: string[];
  license?: any;
  systemToken?: string;
  token?: string;
}

export interface RefreshResponse {
  success: boolean;
  systemToken: string;
}

interface JWTPayload {
  user_name?: string;
  type?: string;
  roleIds?: string[];
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export class BigIDAuth {
  private client: AxiosInstance;
  private config: BigIDConfig;
  private currentToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private systemToken: string | null = null;
  private systemTokenExpiry: Date | null = null;

  constructor(config: BigIDConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `https://${config.domain}/api/v1`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Normalize BigID API responses that may arrive as JSON strings with an
   * incorrect content type.
   */
  private normalizeResponseData<T>(data: unknown): T | unknown {
    if (typeof data !== 'string') {
      return data;
    }

    const trimmed = data.trim();
    if (!trimmed) {
      return data;
    }

    const looksLikeJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'));

    if (!looksLikeJson) {
      return data;
    }

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return data;
    }
  }

  /**
   * BigID sometimes serves the web app shell instead of API JSON when the
   * configured host is not the correct API endpoint or traffic is being
   * redirected through the UI layer.
   */
  private isHtmlResponse(data: unknown): data is string {
    if (typeof data !== 'string') {
      return false;
    }

    const trimmed = data.trim().toLowerCase();
    return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
  }

  /**
   * Extract a useful message from BigID responses, including JSON that may
   * have been returned with an unexpected content type.
   */
  private extractResponseMessage(data: unknown): string | null {
    const normalized = this.normalizeResponseData<{ message?: string; error?: string }>(data);

    if (normalized && typeof normalized === 'object') {
      const message = 'message' in normalized ? normalized.message : undefined;
      const error = 'error' in normalized ? normalized.error : undefined;

      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }

      if (typeof error === 'string' && error.trim()) {
        return error.trim();
      }
    }

    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed ? trimmed : null;
    }

    return null;
  }

  /**
   * Turn low-level axios failures into actionable BigID connectivity errors.
   */
  private formatAxiosError(error: unknown, endpoint: string, fallbackMessage: string): Error {
    if (!axios.isAxiosError(error)) {
      return error instanceof Error ? error : new Error(fallbackMessage);
    }

    const requestUrl = `https://${this.config.domain}/api/v1${endpoint}`;
    const responseMessage = this.extractResponseMessage(error.response?.data);

    if (this.isHtmlResponse(error.response?.data)) {
      return new Error(
        `BigID returned HTML instead of API JSON from ${endpoint}. ` +
        `Check BIGID_DOMAIN (${this.config.domain}) and verify it is the correct API-capable host for this tenant.`
      );
    }

    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return new Error(
        `Timed out connecting to BigID at ${requestUrl}. ` +
        `Verify BIGID_DOMAIN, VPN/network access, and that this tenant is reachable from this machine.`
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return new Error(
        `Could not resolve BigID host ${this.config.domain}. ` +
        `Verify BIGID_DOMAIN and local DNS/VPN access.`
      );
    }

    if (error.code === 'ECONNREFUSED') {
      return new Error(
        `Connection to BigID was refused at ${requestUrl}. ` +
        `Verify the host is reachable and accepting API traffic.`
      );
    }

    if (responseMessage) {
      return new Error(responseMessage);
    }

    return new Error(fallbackMessage || error.message);
  }

  /**
   * Decode JWT token to get payload
   */
  private decodeJWT(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine token type from JWT payload
   */
  private getTokenType(token: string): 'access-token' | 'refresh-token' | 'unknown' {
    const payload = this.decodeJWT(token);
    if (!payload || !payload.type) {
      return 'unknown';
    }
    
    return payload.type as 'access-token' | 'refresh-token';
  }

  /**
   * Authenticate using session token (username/password)
   */
  async authenticateWithSession(username: string, password: string): Promise<string> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.client.post('/sessions', {
        username,
        password,
      });

      if (response.data.auth_token) {
        this.currentToken = response.data.auth_token;
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        return this.currentToken;
      }

      throw new Error('No auth_token received from BigID API');
    } catch (error) {
      throw this.formatAxiosError(error, '/sessions', 'Authentication failed while creating a BigID session.');
    }
  }

  /**
   * Authenticate using user token - handles both access tokens and refresh tokens
   */
  async authenticateWithUserToken(userToken: string): Promise<string> {
    const tokenType = this.getTokenType(userToken);
    console.error(`Token type detected: ${tokenType}`);

    if (tokenType === 'access-token') {
      // Access tokens can be used directly
      console.error('Using access token directly');
      this.currentToken = userToken;
      // Set expiry based on JWT exp claim
      const payload = this.decodeJWT(userToken);
      if (payload && payload.exp) {
        this.tokenExpiry = new Date(payload.exp * 1000);
      } else {
        // Default to 1 hour if no exp claim
        this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
      }
      return userToken;
    } else if (tokenType === 'refresh-token') {
      // Refresh tokens need to be exchanged for system tokens
      console.error('Exchanging refresh token for system token');
      try {
        const response: AxiosResponse<any> = await this.client.get('/refresh-access-token', {
          headers: {
            'Authorization': userToken, // No Bearer prefix
          },
        });

        const responseData = this.normalizeResponseData<RefreshResponse>(response.data) as RefreshResponse | any;

        // Debug: Log the response (without sensitive data)
        console.error('Refresh API Response:', {
          status: response.status,
          success: responseData?.success,
          hasSystemToken: !!responseData?.systemToken,
          responseKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : []
        });

        if (this.isHtmlResponse(response.data)) {
          throw new Error(
            `BigID returned HTML instead of API JSON from /refresh-access-token. ` +
            `Check BIGID_DOMAIN (${this.config.domain}) and verify it is the correct API-capable host for this tenant.`
          );
        }

        const structuredMessage = this.extractResponseMessage(responseData);
        if (responseData?.success === false && structuredMessage) {
          throw new Error(structuredMessage);
        }

        if (responseData?.success && responseData?.systemToken && typeof responseData.systemToken === 'string') {
          this.systemToken = responseData.systemToken as string;
          // System tokens typically have a shorter lifespan, set to 1 hour
          this.systemTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
          return this.systemToken;
        }

        throw new Error(
          'Unexpected response from BigID refresh API. ' +
          'Expected a successful payload with systemToken.'
        );
      } catch (error) {
        const formattedError = this.formatAxiosError(
          error,
          '/refresh-access-token',
          'User token authentication failed while exchanging the refresh token.'
        );
        throw new Error(`User token authentication failed: ${formattedError.message}`);
      }
    } else {
      // Unknown token type - try to use it directly as a fallback
      console.error('Unknown token type, trying to use directly');
      this.currentToken = userToken;
      this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour default
      return userToken;
    }
  }

  /**
   * Get current authentication token, refreshing if necessary
   */
  async getToken(): Promise<string> {
    const auth = this.config.auth;
    
    if (auth.type === 'user_token') {
      // Check if we have a valid cached token (either system token or access token)
      if (this.systemToken && this.systemTokenExpiry && this.systemTokenExpiry > new Date()) {
        return this.systemToken;
      }
      
      if (this.currentToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.currentToken;
      }

      // If no valid cached token, authenticate with user token
      if (!auth.user_token) {
        throw new Error('User token is required for user token authentication');
      }
      
      return await this.authenticateWithUserToken(auth.user_token);
    } else if (auth.type === 'session') {
      // For session authentication, check if we have a valid cached token
      if (this.currentToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.currentToken;
      }

      if (!auth.username || !auth.password) {
        throw new Error('Username and password are required for session authentication');
      }
      return await this.authenticateWithSession(auth.username, auth.password);
    } else {
      throw new Error('Invalid authentication type');
    }
  }

  /**
   * Validate if the current token is still valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      await this.client.get('/metadata-search/health-check', {
        headers: {
          'Authorization': token,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear the current token (useful for testing or re-authentication)
   */
  clearToken(): void {
    this.currentToken = null;
    this.tokenExpiry = null;
    this.systemToken = null;
    this.systemTokenExpiry = null;
  }

  /**
   * Get the authorization header for API requests
   */
  async getAuthHeader(): Promise<string> {
    const token = await this.getToken();
    
    // Both session tokens and system tokens are used directly without Bearer prefix
    return token;
  }

  /**
   * Check if authentication is configured properly
   */
  isConfigured(): boolean {
    const auth = this.config.auth;
    
    if (auth.type === 'session') {
      return !!(auth.username && auth.password);
    } else if (auth.type === 'user_token') {
      return !!auth.user_token;
    }
    
    return false;
  }
} 
