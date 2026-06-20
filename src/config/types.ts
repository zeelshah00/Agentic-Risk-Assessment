import { z } from 'zod';

// Configuration schema for BigID settings
export const BigIDConfigSchema = z.object({
  domain: z.string(),
  auth: z.object({
    type: z.enum(['session', 'user_token']),
    username: z.string().optional(),
    password: z.string().optional(),
    user_token: z.string().optional(),
  }),
  timeout: z.number().default(30000),
  retry_attempts: z.number().default(3),
});

// Configuration schema for MCP server settings
export const MCPConfigSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default('0.0.0.0'),
  log_level: z.string().default('info'),
  local: z.object({
    enabled: z.boolean().default(true),
    config_file: z.string().optional(),
    environment_vars: z.boolean().default(true),
  }),
});

// Combined configuration schema
export const ConfigSchema = z.object({
  bigid: BigIDConfigSchema,
  mcp: MCPConfigSchema,
});

// Type definitions
export type BigIDConfig = z.infer<typeof BigIDConfigSchema>;
export type MCPConfig = z.infer<typeof MCPConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Environment variable names
export const ENV_VARS = {
  BIGID_DOMAIN: 'BIGID_DOMAIN',
  BIGID_AUTH_TYPE: 'BIGID_AUTH_TYPE',
  BIGID_USERNAME: 'BIGID_USERNAME',
  BIGID_PASSWORD: 'BIGID_PASSWORD',
  BIGID_USER_TOKEN: 'BIGID_USER_TOKEN',
  BIGID_TIMEOUT: 'BIGID_TIMEOUT',
  BIGID_RETRY_ATTEMPTS: 'BIGID_RETRY_ATTEMPTS',
  MCP_PORT: 'MCP_PORT',
  MCP_HOST: 'MCP_HOST',
  MCP_LOG_LEVEL: 'MCP_LOG_LEVEL',
  MCP_CONFIG_FILE: 'MCP_CONFIG_FILE',
} as const; 