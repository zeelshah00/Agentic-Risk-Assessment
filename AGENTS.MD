# AGENTS.MD - BigID MCP App

This file provides AI agents with essential context about the BigID MCP (Model Context Protocol) App project to enable efficient assistance with development, debugging, and feature implementation.

## Project Overview

**Name:** BigID MCP App  
**Type:** Full-stack web application  
**Purpose:** Agentic automation platform that connects BigID instances to AI models (Google Gemini/Anthropic Claude) via MCP servers for data governance tasks  
**Stack:** Node.js, Express, WebSocket, React (Vite), Firestore, Google Cloud Platform

### Key Features
- Interactive chat interface with AI models
- MCP server integration for external tools/data
- OAuth 2.1 authentication for MCP servers
- Per-tenant token usage tracking with Firestore
- BigID TPA (Third-Party App) integration
- Real-time WebSocket communication
- Terraform-based infrastructure as code

## Project Structure

```
mcpapp/
├── server/                      # Backend Node.js server
│   ├── models/                  # AI model adapters (Anthropic, Google)
│   ├── core.js                  # Core agent execution logic
│   ├── mcp.js                   # MCP server client implementation
│   ├── mcpOAuth.js             # OAuth 2.1 flow for MCP
│   ├── routes.js               # Express API routes
│   ├── socket.js               # WebSocket handler for chat
│   ├── usageTracker.js         # Token usage tracking (per-tenant)
│   ├── firestoreService.js     # Firestore database operations
│   ├── tpa.js                  # BigID TPA storage helpers
│   └── tools.js                # MCP tool discovery & execution
├── frontend/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # State management (Zustand)
│   │   └── utils/              # Frontend utilities
│   └── index.html
├── bigid-mcp-server/           # BigID-specific MCP server
│   └── src/                    # TypeScript implementation
├── terraform/                   # Infrastructure as Code
│   ├── dev/                    # Development environment
│   └── production/             # Production environment
├── docs/                        # Documentation
│   └── SECURITY_TOKEN_STORAGE.md
├── server.js                    # Main server entry point
└── package.json                # Node.js dependencies
```

## Architecture

### High-Level Flow
```
User <-> React Frontend <-> WebSocket <-> Express Server <-> MCP Servers
                                              |
                                              v
                                         AI Models (Gemini/Claude)
                                              |
                                              v
                                         Firestore (Usage Tracking)
                                              |
                                              v
                                         BigID API (via TPA)
```

### Key Components

1. **Frontend (React + Vite)**
   - Interactive chat UI
   - MCP server configuration
   - Settings management
   - Real-time usage tracking display

2. **Backend (Express + WebSocket)**
   - RESTful API endpoints
   - WebSocket for real-time chat
   - MCP server orchestration
   - AI model integration
   - Token usage enforcement

3. **Firestore Database**
   - Per-tenant token usage tracking
   - Server-side only (no client access)
   - Atomic transaction support
   - Document ID: `{tenantId}_{date}`

4. **BigID Integration**
   - TPA storage for user data
   - OAuth token management
   - API access for data operations

## Critical Files & Their Purposes

### Backend Core Files

**`server.js`**
- Main entry point
- Initializes Express app and WebSocket server
- Serves React frontend in production

**`server/socket.js`** ⚠️ CRITICAL
- WebSocket connection handler
- Chat session management
- AI model streaming responses
- Token usage tracking integration
- **Key State:** Stores `bigidBaseUrl` per session for tenant tracking

**`server/usageTracker.js`** 🔒 SECURITY
- Per-tenant token usage tracking
- `checkUsageLimits(bigidBaseUrl)` - Validates usage before AI calls
- `trackUsage(tokenCount, bigidBaseUrl)` - Records token consumption
- `getTenantIdentifier(bigidBaseUrl)` - Creates safe tenant IDs
- **Security:** ALL requests MUST include valid `bigidBaseUrl`

**`server/firestoreService.js`** 🔒 SECURITY
- Firestore database operations
- Atomic transaction support
- `getUsageForEnvironment(tenantId, date)` - Read usage
- `incrementUsageForEnvironment(tenantId, date, tokenCount, tenantUrl)` - Atomic increment
- `getUsageByUrl(tenantUrl, date)` - Lookup by URL

**`server/mcp.js`**
- MCP client implementation
- Server discovery and connection
- Tool invocation
- Supports STDIO and SSE transports

**`server/mcpOAuth.js`**
- OAuth 2.1 flow implementation
- PKCE support
- Token management
- Stores tokens in TPA storage

**`server/routes.js`**
- REST API endpoints
- `/api/usage-limits` - Get current usage (requires `bigidBaseUrl` param)
- `/api/track-usage` - Track token usage (requires `bigidContext.bigidBaseUrl`)
- `/api/mcp/oauth/*` - OAuth flow endpoints

### Frontend Core Files

**`frontend/src/App.jsx`**
- Main app component
- BigID context management
- Tab navigation

**`frontend/src/components/HomeView.jsx`**
- Chat interface
- WebSocket communication
- Message handling

**`frontend/src/components/McpServerView.jsx`**
- MCP server configuration UI
- Server testing
- OAuth flow initiation

**`frontend/src/store/appStore.js`**
- Zustand state management
- Application state

## Environment Variables

### Required
```bash
# GCP Project (auto-detected in Cloud Run)
# GOOGLE_CLOUD_PROJECT=your-project-id

# Usage Limits
DAILY_TOKEN_LIMIT=10000              # Tokens per tenant per day (0 = unlimited)
ENVIRONMENT_NAME=development         # dev/production

# Firestore (set by Terraform)
FIRESTORE_DATABASE=bigid-agentic-app-usage-dev

# MCP Server Security
STDIO_SAFE_HOSTNAMES=*.aws.env.fyi,localhost

# OAuth
OAUTH_CALLBACK_BASE_URL=http://localhost:3000

# Server
PORT=3000
HAS_AI_PERMISSION=true              # Enables AI model access
```

## Token Usage Tracking (Per-Tenant)

### Architecture Decision
Token usage is tracked **per BigID tenant** (not per environment). This means:
- Multiple tenants can use the same deployment
- Each tenant has independent usage limits
- Usage is isolated between tenants

### Tenant Identification
```javascript
// Input: https://customer1.bigid.cloud
// Output: customer1-bigid-cloud_a1b2c3d4e5f6

getTenantIdentifier(bigidBaseUrl) {
  1. Extract hostname from URL
  2. Sanitize (replace special chars with dashes)
  3. Create hash for uniqueness
  4. Combine: `${sanitized}_${hash}`
}
```

### Firestore Document Structure
```javascript
{
  usage: 5000,                        // Total tokens used
  tenantId: "customer1-bigid-cloud_a1b2c3d4e5f6",
  tenantUrl: "https://customer1.bigid.cloud",
  date: "2025-12-12",
  lastUpdated: Timestamp,
  createdAt: Timestamp
}
```

### Security Enforcement
- ⚠️ **ALL requests MUST include `bigidBaseUrl`**
- Requests without URL are rejected (treated as limit exceeded)
- No client-side manipulation possible
- Server-side only, atomic transactions

## Common Development Tasks

### Adding a New API Endpoint
1. Add route in `server/routes.js`
2. If usage tracking needed, extract `bigidBaseUrl` from request
3. Call `checkUsageLimits(bigidBaseUrl)` before AI operations
4. Call `trackUsage(tokenCount, bigidBaseUrl)` after completion

### Adding a New MCP Server Integration
1. Create server configuration in frontend
2. Add to `server/mcp.js` transport handlers if needed
3. Test with `/api/test-mcp-connection` endpoint
4. Handle OAuth if required

### Modifying Token Usage Logic
1. **Never** remove `bigidBaseUrl` requirement
2. Update `server/usageTracker.js` for logic changes
3. Update `server/firestoreService.js` for storage changes
4. Test with multiple tenants to ensure isolation

### Adding New Firestore Queries
1. Add function to `server/firestoreService.js`
2. Use transactions for writes
3. Use indexes for complex queries
4. Export function in module.exports

## Testing

### Local Development Setup
```bash
# Install dependencies
npm install

# Set up GCP credentials
gcloud auth application-default login

# Set environment variables
export DAILY_TOKEN_LIMIT=10000
export ENVIRONMENT_NAME=development
export FIRESTORE_DATABASE=(default)

# Run development server
npm run dev
```

### Testing Token Usage
```bash
# Should reject without URL
curl -X POST http://localhost:3000/api/track-usage \
  -H "Content-Type: application/json" \
  -d '{"tokenCount": 100}'

# Should succeed with URL
curl -X POST http://localhost:3000/api/track-usage \
  -H "Content-Type: application/json" \
  -d '{
    "tokenCount": 100,
    "bigidContext": {
      "bigidBaseUrl": "https://test.bigid.cloud"
    }
  }'
```

## Deployment

### Terraform Deployment
```bash
# Development
cd terraform/dev
terraform init
terraform plan
terraform apply

# Production
cd terraform/production
terraform init
terraform plan
terraform apply
```

### Manual Deployment
```bash
# Build frontend
npm run build-frontend

# Push Docker image
npm run push-docker

# Deploy to Cloud Run (automatic via Terraform)
```

## Key Patterns & Conventions

### Error Handling
- Always log errors with context
- Return user-friendly error messages
- Include error details in development

### Security
- Validate all inputs
- Never expose internal errors to clients
- Always require `bigidBaseUrl` for usage tracking
- Use HTTPS in production

### Code Style
- Use async/await (not callbacks)
- Descriptive variable names
- Comments for complex logic
- JSDoc for public functions

## Known Issues & Gotchas

### 1. BigID URL Validation
- **Issue:** Missing `bigidBaseUrl` causes usage tracking failure
- **Solution:** Always validate presence before AI operations
- **Detection:** Check logs for "Missing BigID tenant URL" errors

### 2. Firestore Transactions
- **Issue:** Concurrent updates can fail transactions
- **Solution:** Firestore automatically retries, don't add manual retry logic
- **Detection:** "Transaction failed" errors (rare)

### 3. MCP Server Timeouts
- **Issue:** Long-running MCP tools can timeout
- **Solution:** Implement streaming or chunking for large operations
- **Detection:** "Tool execution timeout" in logs

### 4. WebSocket State
- **Issue:** Lost connections don't clean up sessions
- **Solution:** Heartbeat/ping mechanism implemented
- **Detection:** Growing memory usage

## Quick Reference

### Finding Code for Common Tasks

**Want to modify token limits?**
- Logic: `server/usageTracker.js` (`checkUsageLimits`)
- Storage: `server/firestoreService.js`
- Config: `.env` (`DAILY_TOKEN_LIMIT`)

**Want to add a new AI model?**
- Create adapter: `server/models/NewModel.js`
- Register: `server/utils.js` (`getGenerativeModel`)
- Update frontend: `frontend/src/components/HomeView.jsx`

**Want to change usage tracking?**
- Core logic: `server/usageTracker.js`
- Database ops: `server/firestoreService.js`
- API endpoints: `server/routes.js`
- WebSocket integration: `server/socket.js`

**Want to add MCP server support?**
- Client code: `server/mcp.js`
- Transport handlers: `server/mcp.js` (STDIO/SSE)
- OAuth flow: `server/mcpOAuth.js`
- Frontend UI: `frontend/src/components/McpServerView.jsx`

## Dependencies

### Backend
- `express` - Web server
- `ws` - WebSocket server
- `@google-cloud/firestore` - Database
- `@google-cloud/vertexai` - Gemini models
- `@anthropic-ai/vertex-sdk` - Claude models
- `@modelcontextprotocol/sdk` - MCP client

### Frontend
- `react` - UI framework
- `vite` - Build tool
- `zustand` - State management
- `tailwindcss` - Styling

## Additional Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Google Vertex AI](https://cloud.google.com/vertex-ai)
- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Security Documentation](docs/SECURITY_TOKEN_STORAGE.md)

## Contribution Guidelines

When making changes:
1. ✅ Maintain per-tenant usage tracking
2. ✅ Always require `bigidBaseUrl` for usage operations
3. ✅ Use atomic Firestore transactions for writes
4. ✅ Update this AGENTS.MD if architecture changes
5. ✅ Add tests for new features
6. ✅ Update documentation

## Emergency Contacts

For urgent issues related to:
- **Security vulnerabilities:** Check `docs/SECURITY_TOKEN_STORAGE.md`
- **Firestore issues:** Verify GCP credentials and IAM permissions
- **Usage tracking bugs:** Ensure `bigidBaseUrl` is passed correctly
- **MCP server issues:** Check server logs and OAuth token validity

---

**Last Updated:** 2025-12-12  
**Document Version:** 1.0  
**Maintained By:** Development Team
