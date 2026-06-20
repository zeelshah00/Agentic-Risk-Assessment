/**
 * Centralized TPA Storage Keys for Frontend
 * Keep in sync with server/tpaStorageKeys.js
 * All TPA storage keys should be imported from this file to ensure consistency
 */

export const TPA_STORAGE_KEYS = {
  // Main application configuration
  CONFIG: 'gemini_task_app_config',
  
  // Agents storage
  AGENTS: 'gemini_agent_app_agents',
  
  // MCP servers configuration
  MCP_SERVERS: 'gemini_task_app_mcp_servers',
  
  // Selected AI model
  SELECTED_MODEL: 'gemini_task_app_selected_model',
  
  // Agent context storage (function to generate key)
  AGENT_CONTEXT: (agentId) => `gemini_agent_context_${agentId}`,
  
  // Individual server tools cache (for BigID built-in server)
  MCP_TOOLS_CACHE: (serverId) => `mcp_tools_cache_${serverId}`,
};
