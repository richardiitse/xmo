import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { xmo_extract, handleExtract } from "./tools/extract.js";
import { xmo_query, handleQuery } from "./tools/query.js";
import { xmo_consolidate, handleConsolidate } from "./tools/consolidate.js";
import { xmo_load, handleLoad } from "./tools/loader.js";
import { xmo_stats, handleStats } from "./tools/stats.js";
import { xmo_extract_sessions, handleExtractSessions } from "./tools/extract_sessions.js";

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
  return { tools: [xmo_extract, xmo_extract_sessions, xmo_query, xmo_consolidate, xmo_load, xmo_stats] };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "xmo_extract":
      return handleExtract(args);
    case "xmo_extract_sessions":
      return handleExtractSessions(args);
    case "xmo_query":
      return handleQuery(args);
    case "xmo_consolidate":
      return handleConsolidate(args);
    case "xmo_load":
      return handleLoad(args);
    case "xmo_stats":
      return handleStats(args);
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
