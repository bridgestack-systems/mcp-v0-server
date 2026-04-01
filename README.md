# MCP v0.dev UI Generator

MCP (Model Context Protocol) server for v0.dev UI generation. Enables any Claude-powered agent to generate, iterate, and retrieve UI components via native tool calls.

## Architecture

```
Claude Agent → MCP Server (stdio) → v0-bridge (HTTP :3100) → v0.dev API
```

## Tools

| Tool | Description |
|------|-------------|
| `generate_ui` | Generate UI from a design prompt. Returns files + preview URL. |
| `iterate_ui` | Refine existing UI with feedback. Requires chatId from generate_ui. |
| `get_chat` | Retrieve files from a previous v0.dev session. |

## Setup

```bash
npm install
npm run build

# v0-bridge (must be running first)
cd v0-bridge && npm install && V0_API_KEY=... node server.js

# MCP server
V0_BRIDGE_URL=http://localhost:3100 node dist/index.js
```

## Deploy

```bash
cp .env.example .env  # Set V0_API_KEY
./deploy.sh mcp.bridgestack.systems
```

## GCP VM

- Host: `mcp.bridgestack.systems`
- Type: `e2-small` (0.5 vCPU, 2GB RAM)
- Zone: `asia-southeast1-b`
- Start/stop on demand to save costs
