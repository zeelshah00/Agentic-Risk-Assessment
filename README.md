# Agentic Risk Assessment

A full-stack platform that connects BigID data governance instances to AI models (Claude, Gemini) through the [Model Context Protocol](https://modelcontextprotocol.io) (MCP), enabling natural-language risk assessment, policy analysis, and data catalog exploration.

---

## The Problem

BigID surfaces enormous amounts of data about sensitive assets, policies, access controls, and security findings — but acting on that data requires navigating multiple UI screens and manually correlating results. There was no way to ask a natural-language question like *"Which data sources contain PII with open access and no active policy?"* and get a grounded, evidence-backed answer.

This project solves that by giving an AI model direct, structured access to BigID's APIs as callable tools, then driving an agentic loop that reasons across multiple API calls to answer complex governance questions.

---

## Architecture

The project has two independent but complementary components:

```
┌─────────────────────────────────────────────────────────────┐
│  Web App  (server/ + frontend/)                             │
│                                                             │
│  React UI ──WebSocket──► Express backend ──MCP client──►   │
│                             │                    │          │
│                       Firestore            MCP Server(s)   │
│                     (usage tracking)               │        │
└─────────────────────────────────────────────────────────────┘
                                                    │
┌───────────────────────────────────────────────────▼─────────┐
│  Standalone MCP Server  (src/)                              │
│                                                             │
│  28+ typed BigID tools  ◄──► 12 API clients  ◄──► BigID    │
│  Zod-validated schemas       CacheManager                   │
└─────────────────────────────────────────────────────────────┘
```

### Web App (`server/` + `frontend/`)

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite + Zustand + Tailwind | Chat UI, MCP server config, settings |
| Backend | Node.js + Express + WebSocket | API router, AI model orchestration, streaming |
| AI models | Anthropic Claude (Vertex) / Google Gemini | Agentic reasoning and tool use |
| Auth | OAuth 2.1 + PKCE | Secure MCP server token exchange |
| Storage | BigID TPA storage | Per-user configuration persistence |
| Usage | Google Firestore | Server-side per-tenant token tracking |
| Infra | GCP Cloud Run + Terraform | Containerized deployment, dev/prod isolation |

### Standalone MCP Server (`src/`)

A TypeScript MCP server that exposes BigID's APIs as structured tools any MCP-compatible client (Claude Desktop, Continue, Cursor, etc.) can call directly — no web app required.

| Layer | Technology | Purpose |
|---|---|---|
| Protocol | `@modelcontextprotocol/sdk` | stdio MCP transport |
| API clients | Axios + 12 domain-specific clients | BigID REST API access |
| Validation | Zod | Runtime schema enforcement on tool arguments |
| Caching | node-cache | TTL-based in-memory cache reduces API load |
| Auth | Session or user-token | Configurable BigID authentication |
| Logging | Winston | stderr-only logging to avoid polluting MCP stdout |

---

## Key Design Decisions

### Why MCP?

MCP is an open standard for connecting AI models to external tools. Implementing it means the same BigID tool definitions work across Claude Desktop, Cursor, Continue, and our own web app without any changes. It also decouples the AI model choice from the tool implementation — swapping Claude for Gemini (or vice versa) is a one-line config change.

### Why a standalone TypeScript MCP server alongside the Node.js web app?

The web app is a multi-tenant SaaS product — it manages OAuth, usage limits, streaming, and per-user configuration. The standalone MCP server is for developers and power users who want to connect directly from their IDE or AI client without standing up the full web stack. Both use the same underlying BigID API layer.

### Why Firestore for usage tracking (not in-memory or client-side)?

Token usage must be tracked server-side for two reasons: (1) a client can't be trusted to report its own consumption accurately, and (2) Cloud Run instances can scale to multiple replicas. Firestore's atomic transactions prevent race conditions when two replicas process requests for the same tenant simultaneously. Tenants are identified by a SHA-256 hash of their BigID base URL, so one deployment can safely serve hundreds of BigID instances with fully isolated quotas.

### Why Zod schemas on MCP tool arguments?

AI models occasionally generate tool calls with missing or malformed arguments. Zod validates every incoming tool call at the boundary before it reaches any API client, producing a clear error message the model can self-correct from rather than a cryptic upstream failure.

### Why per-domain API clients instead of one generic client?

Each BigID API domain (catalog, DSPM, ACI, lineage, inventory, etc.) has different pagination patterns, filter formats, and response shapes. Separate typed clients keep each domain's logic contained and testable. A shared `BigIDAuth` instance handles token acquisition and refresh across all of them.

### Why OAuth 2.1 + PKCE for MCP servers?

The MCP spec recommends OAuth 2.1 for remote server authentication. PKCE eliminates the need to store a client secret, which matters here because the authorization flow runs inside a browser popup and the callback is handled by the backend. Tokens are stored in BigID TPA storage (not localStorage) so they survive page reloads and are never accessible to other browser origins.

### Why GCP Cloud Run + Terraform?

Cloud Run gives container-based autoscaling with zero infrastructure to manage day-to-day. Terraform codifies the dev and production environments as separate workspaces, making it impossible to accidentally apply production configuration to dev or vice versa. The load balancer Terraform provisions also adds geolocation-based routing for GDPR compliance (EU users can be automatically opted out of analytics).

---

## MCP Tools (28+)

| Domain | Tools |
|---|---|
| Metadata Search | `metadata_quick_search`, `metadata_full_search`, `metadata_objects_search`, `metadata_objects_count` |
| Data Catalog | `get_catalog_objects`, `get_object_details`, `get_catalog_tags`, `get_catalog_rules`, `get_catalog_count` |
| Inventory | `get_inventory_aggregation` |
| DSPM / Security | `get_security_cases`, `get_security_trends`, `get_cases_group_by_policy` |
| Sensitivity | `get_sensitivity_configs`, `get_sensitivity_config_by_id`, `get_total_classification_ratios`, `get_classification_ratio_by_name` |
| Data Categories | `get_data_categories` |
| Policies | `get_policies` |
| Access Control (ACI) | `get_aci_data_managers`, `get_aci_data_manager_permissions`, `get_aci_groups`, `get_aci_users` |
| Lineage | `get_lineage_tree` |
| Location | `get_locations` |
| Widgets | `get_dashboard_widget` |
| Health | `get_health_check` |

---

## Project Structure

```
├── src/                    # TypeScript MCP server
│   ├── server.ts           # MCP server entry point, tool registration
│   ├── auth/               # BigID authentication (session + user token)
│   ├── cache/              # In-memory TTL cache
│   ├── client/             # 12 domain-specific BigID API clients
│   ├── config/             # Config loader, server instructions, filter spec
│   ├── schemas/            # Zod validation schemas (one per tool)
│   ├── tools/              # MCP tool implementations (one file per domain)
│   ├── types/              # TypeScript types for all BigID API shapes
│   └── utils/              # Date helpers, error handler, filter converter, paging
│
├── server/                 # Node.js web app backend
│   ├── core.js             # Agentic loop: prompt → tool calls → response
│   ├── mcp.js              # MCP client (tool discovery + invocation)
│   ├── mcpOAuth.js         # OAuth 2.1 + PKCE flow
│   ├── routes.js           # Express API routes
│   ├── socket.js           # WebSocket chat handler (streaming)
│   ├── usageTracker.js     # Per-tenant Firestore token tracking
│   ├── firestoreService.js # Firestore read/write operations
│   ├── reportGenerator.js  # Document generation
│   ├── tpa.js              # BigID TPA storage helpers
│   └── models/             # AI model adapters (Anthropic, Google)
│
├── frontend/               # React + Vite web UI
│   └── src/
│       ├── components/     # Chat, MCP config, settings, agent management views
│       ├── hooks/          # useAppManager (initialization + BigID context)
│       └── store/          # Zustand global state
│
├── terraform/
│   ├── dev/                # Development Cloud Run environment
│   └── production/         # Production Cloud Run environment
│
├── server.js               # Web app entry point
├── package.json            # MCP server dependencies
├── Dockerfile              # Multi-stage build (Node 22 + Chromium)
├── bigid-filter-spec.yml   # BigID query language reference
└── docs/
    └── SECURITY_TOKEN_STORAGE.md
```

---

## Setup

### Standalone MCP Server

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy and fill in the config:
   ```bash
   cp config/env.example .env
   # Edit .env with your BigID domain and credentials
   ```

3. Build and start:
   ```bash
   npm run build
   npm start
   ```

The server communicates over stdio. Point any MCP client at the built binary (`dist/server.js`).

**Required environment variables:**

| Variable | Description |
|---|---|
| `BIGID_DOMAIN` | Your BigID instance domain (e.g. `sandbox.bigid.tools`) |
| `BIGID_AUTH_TYPE` | `session` (username/password) or `user_token` |
| `BIGID_USERNAME` / `BIGID_PASSWORD` | Required for `session` auth |
| `BIGID_USER_TOKEN` | Required for `user_token` auth |

### Web App

1. Install root and frontend dependencies:
   ```bash
   npm install
   cd frontend && npm install
   ```

2. Copy and fill in the root `.env`:
   ```bash
   cp .env.example .env
   ```

3. Build the frontend, then start the backend:
   ```bash
   cd frontend && npm run build
   cd .. && node server.js
   ```

The UI is served at `http://localhost:3000/ui`.

**Required environment variables:**

| Variable | Description |
|---|---|
| `PORT` | Server port (default `3000`) |
| `STDIO_SAFE_HOSTNAMES` | Comma-separated hostnames allowed to run stdio MCP servers |
| `DAILY_TOKEN_LIMIT` | Per-tenant daily token cap (0 = unlimited) |
| `ENVIRONMENT_NAME` | Identifier used in Firestore usage records |
| `OAUTH_CALLBACK_BASE_URL` | Base URL for OAuth redirect (e.g. `http://localhost:3000`) |

### Docker

```bash
docker build -t agentic-risk-assessment .
docker run -p 3000:3000 --env-file .env agentic-risk-assessment
```

---

## Deployment (GCP)

Terraform configurations for dev and production Cloud Run environments live in `terraform/dev/` and `terraform/production/`. See `terraform/README.md` for full deployment instructions.
