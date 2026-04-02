import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { xmo_extract, handleExtract } from "./tools/extract.js";
import { xmo_query, handleQuery } from "./tools/query.js";
import { xmo_consolidate, handleConsolidate } from "./tools/consolidate.js";

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
  return { tools: [xmo_extract, xmo_query, xmo_consolidate] };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "xmo_extract":
      return handleExtract(args);
    case "xmo_query":
      return handleQuery(args);
    case "xmo_consolidate":
      return handleConsolidate(args);
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
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
