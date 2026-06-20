# BigID MCP Server

Standalone backend-only MCP server for BigID.

## Requirements

- Node.js 18+
- A BigID domain
- Either:
  - `BIGID_USER_TOKEN`, or
  - `BIGID_USERNAME` and `BIGID_PASSWORD`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a root `.env` file from the example:

```bash
cp config/env.example .env
```

3. Edit `.env` and fill in your real BigID values.

## Run

Build the server:

```bash
npm run build
```

Start the MCP server:

```bash
npm start
```

## Notes

- The server runs over stdio for MCP clients.
- The `.env` file should live at the repository root, not inside `config/`.
- `config/env.example` is only a template.
