/**
 * Centralized TPA Storage Keys
 * All TPA storage keys should be defined here to ensure consistency across the application
 */

const TPA_STORAGE_KEYS = {
    // Main application configuration
    CONFIG: 'gemini_task_app_config',
    
    // Agents storage
    AGENTS: 'gemini_agent_app_agents',
    
    // MCP servers configuration
    MCP_SERVERS: 'gemini_task_app_mcp_servers',
    
    // Agent context storage (function to generate key)
    AGENT_CONTEXT: (agentId) => `gemini_agent_context_${agentId}`,
    
    // Individual server tools cache (for BigID built-in server)
    MCP_TOOLS_CACHE: (serverId) => `mcp_tools_cache_${serverId}`,
    
    // Analytics opt-out preference
    ANALYTICS_OPT_OUT: 'gemini_task_app_analytics_opt_out',
    
    // OAuth tokens are stored within the MCP server objects in MCP_SERVERS
    // No separate storage keys needed for OAuth tokens
};

module.exports = {
    TPA_STORAGE_KEYS
};
