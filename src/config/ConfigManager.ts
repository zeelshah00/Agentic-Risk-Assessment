import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { Config, ConfigSchema, ENV_VARS, BigIDConfig, MCPConfig } from './types';

// Load environment variables from .env file only as fallback
const loadEnvFileAsFallback = () => {
  try {
    const dotenv = require('dotenv');
    const envPath = path.resolve(process.cwd(), '.env');
    
    // Check if required environment variables are already set
    const requiredVars = [ENV_VARS.BIGID_DOMAIN, ENV_VARS.BIGID_USER_TOKEN];
    const hasRequiredVars = requiredVars.some(varName => process.env[varName]);
    
    // Only load .env if required variables are missing
    if (!hasRequiredVars && fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        console.warn('Error loading .env file:', result.error.message);
      }
    }
  } catch (error) {
    console.warn('dotenv not available, skipping .env file loading:', error);
  }
};

// Load .env file as fallback before any other operations
loadEnvFileAsFallback();

export class ConfigManager {
  private config: Config;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from multiple sources in order of priority:
   * 1. System environment variables (highest priority)
   * 2. Configuration file
   * 3. Default values
   */
  private loadConfig(): Config {
    // Start with default configuration
    const defaultConfig: Config = {
      bigid: {
        domain: process.env[ENV_VARS.BIGID_DOMAIN] || '',
        auth: {
          type: 'session',
        },
        timeout: 30000,
        retry_attempts: 3,
      },
      mcp: {
        port: 3000,
        host: '0.0.0.0',
        log_level: 'info',
        local: {
          enabled: true,
          environment_vars: true,
        },
      },
    };

    // Load from configuration file if specified
    const configFromFile = this.loadConfigFromFile();
    if (configFromFile) {
      Object.assign(defaultConfig, configFromFile);
    }

    // Override with environment variables (highest priority)
    const configFromEnv = this.loadConfigFromEnv();
    Object.assign(defaultConfig, configFromEnv);

    // Validate configuration
    try {
      return ConfigSchema.parse(defaultConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Configuration validation failed:', error.errors);
        throw new Error('Invalid configuration');
      }
      throw error;
    }
  }

  /**
   * Load configuration from file
   */
  private loadConfigFromFile(): Partial<Config> | null {
    const configFile = process.env[ENV_VARS.MCP_CONFIG_FILE] || 'config.json';
    
    try {
      if (fs.existsSync(configFile)) {
        const configData = fs.readFileSync(configFile, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn(`Failed to load config file ${configFile}:`, error);
    }
    
    return null;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfigFromEnv(): Partial<Config> {
    const config: Partial<Config> = {};


    // BigID configuration from environment
    if (process.env[ENV_VARS.BIGID_DOMAIN]) {
      config.bigid = {
        domain: process.env[ENV_VARS.BIGID_DOMAIN]!,
        auth: { type: 'session' },
        timeout: 30000,
        retry_attempts: 3,
      };
    }

    // Helper function to ensure bigid config exists without overriding domain
    const ensureBigidConfig = () => {
      if (!config.bigid) {
        config.bigid = {
          domain: process.env[ENV_VARS.BIGID_DOMAIN] || '',
          auth: { type: 'session' },
          timeout: 30000,
          retry_attempts: 3,
        };
      }
    };

    if (process.env[ENV_VARS.BIGID_AUTH_TYPE]) {
      ensureBigidConfig();
      config.bigid!.auth.type = process.env[ENV_VARS.BIGID_AUTH_TYPE] as 'session' | 'user_token';
    }

    if (process.env[ENV_VARS.BIGID_USERNAME]) {
      ensureBigidConfig();
      config.bigid!.auth.username = process.env[ENV_VARS.BIGID_USERNAME];
    }

    if (process.env[ENV_VARS.BIGID_PASSWORD]) {
      ensureBigidConfig();
      config.bigid!.auth.password = process.env[ENV_VARS.BIGID_PASSWORD];
    }

    if (process.env[ENV_VARS.BIGID_USER_TOKEN]) {
      ensureBigidConfig();
      config.bigid!.auth.type = 'user_token';
      config.bigid!.auth.user_token = process.env[ENV_VARS.BIGID_USER_TOKEN];
    }

    if (process.env[ENV_VARS.BIGID_TIMEOUT]) {
      ensureBigidConfig();
      config.bigid!.timeout = parseInt(process.env[ENV_VARS.BIGID_TIMEOUT]!, 10);
    }

    if (process.env[ENV_VARS.BIGID_RETRY_ATTEMPTS]) {
      ensureBigidConfig();
      config.bigid!.retry_attempts = parseInt(process.env[ENV_VARS.BIGID_RETRY_ATTEMPTS]!, 10);
    }

    // MCP configuration from environment
    if (process.env[ENV_VARS.MCP_PORT]) {
      config.mcp = {
        port: parseInt(process.env[ENV_VARS.MCP_PORT]!, 10),
        host: '0.0.0.0',
        log_level: 'info',
        local: { enabled: true, environment_vars: true },
      };
    }

    if (process.env[ENV_VARS.MCP_HOST]) {
      if (!config.mcp) {
        config.mcp = {
          port: 3000,
          host: '0.0.0.0',
          log_level: 'info',
          local: { enabled: true, environment_vars: true },
        };
      }
      config.mcp.host = process.env[ENV_VARS.MCP_HOST]!;
    }

    if (process.env[ENV_VARS.MCP_LOG_LEVEL]) {
      if (!config.mcp) {
        config.mcp = {
          port: 3000,
          host: '0.0.0.0',
          log_level: 'info',
          local: { enabled: true, environment_vars: true },
        };
      }
      config.mcp.log_level = process.env[ENV_VARS.MCP_LOG_LEVEL]!;
    }

    return config;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Get BigID configuration
   */
  getBigIDConfig(): BigIDConfig {
    return this.config.bigid;
  }

  /**
   * Get MCP configuration
   */
  getMCPConfig(): MCPConfig {
    return this.config.mcp;
  }

  /**
   * Get BigID base URL
   */
  getBigIDBaseUrl(): string {
    return `https://${this.config.bigid.domain}/api/v1`;
  }

  /**
   * Validate authentication configuration
   */
  validateAuthConfig(): boolean {
    const auth = this.config.bigid.auth;
    
    if (auth.type === 'session') {
      return !!(auth.username && auth.password);
    } else if (auth.type === 'user_token') {
      return !!auth.user_token;
    }
    
    return false;
  }

  /**
   * Create example configuration file
   */
  static createExampleConfig(): void {
    const exampleConfig = {
      bigid: {
        domain: 'your-bigid-domain.com',
        auth: {
          type: 'session',
          username: 'your_username',
          password: 'your_password',
          // user_token: 'your_user_token', // Uncomment for user token auth
        },
        timeout: 30000,
        retry_attempts: 3,
      },
      mcp: {
        port: 3000,
        host: 'localhost',
        log_level: 'info',
        local: {
          enabled: true,
          config_file: 'config.json',
          environment_vars: true,
        },
      },
    };

    const configPath = path.join(process.cwd(), 'config', 'config.example.json');
    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
            // Note: Using console.error to avoid stdout interference with MCP protocol
        console.error(`Example configuration created at: ${configPath}`);
  }
} 