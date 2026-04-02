import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "xmo-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: [] };
});

server.setRequestHandler(CallToolRequestSchema, async () => {
  return {
    content: [
      {
        type: "text",
        text: "XMO MCP Server ready",
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  console.error("XMO MCP Server running on stdio");
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
