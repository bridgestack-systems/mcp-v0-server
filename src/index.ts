#!/usr/bin/env node
/**
 * MCP Server for v0.dev UI Generation
 *
 * Exposes v0.dev capabilities as MCP tools that any Claude-powered agent can call:
 *   - generate_ui: Create a new UI from a design prompt
 *   - iterate_ui: Refine an existing UI with feedback
 *   - get_chat: Retrieve generated files from a previous session
 *
 * Requires v0-bridge running on localhost:3100 (or V0_BRIDGE_URL env var).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { generateUISchema, handleGenerateUI } from "./tools/generate-ui.js";
import { iterateUISchema, handleIterateUI } from "./tools/iterate-ui.js";
import { getChatSchema, handleGetChat } from "./tools/get-chat.js";
import { healthCheck } from "./v0-bridge-client.js";

const server = new McpServer({
  name: "v0-ui-generator",
  version: "1.0.0",
});

// --- Tools ---

server.tool(
  "generate_ui",
  "Generate a UI component or full page using v0.dev. Provide a design prompt describing what you want. Returns generated source files (React/HTML/CSS) and a preview URL.",
  generateUISchema.shape,
  async (input) => {
    const result = await handleGenerateUI(input);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "iterate_ui",
  "Refine an existing v0.dev UI generation. Provide the chatId from a previous generate_ui call and feedback describing what to change.",
  iterateUISchema.shape,
  async (input) => {
    const result = await handleIterateUI(input);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "get_chat",
  "Retrieve the generated files and preview URL from a previous v0.dev session by chat ID.",
  getChatSchema.shape,
  async (input) => {
    const result = await handleGetChat(input);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- Startup ---

async function main() {
  const bridgeOk = await healthCheck();
  if (!bridgeOk) {
    console.error(
      `WARNING: v0-bridge not reachable at ${process.env.V0_BRIDGE_URL || "http://localhost:3100"}. ` +
        `Tools will fail until v0-bridge is running.`
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP v0-ui-generator server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
