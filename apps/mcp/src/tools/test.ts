import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logEvent } from "../lib";

export function registerTestTools(server: McpServer): void {
  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Returns pong. Harmless connectivity test.",
      inputSchema: {},
    },
    async () => {
      logEvent("tool.call", { tool: "ping", success: true });
      return {
        content: [{ type: "text", text: "pong" }],
      };
    },
  );

  server.registerTool(
    "get_status",
    {
      title: "Get Status",
      description:
        "Returns MCP server health. Harmless test tool — no side effects.",
      inputSchema: {},
    },
    async () => {
      logEvent("tool.call", { tool: "get_status", success: true });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "healthy",
              service: "derhead-mcp",
              product: "hometwin",
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "echo",
    {
      title: "Echo",
      description: "Echoes back the provided message. Harmless test tool.",
      inputSchema: {
        message: z.string().describe("Message to echo back"),
      },
    },
    async ({ message }) => {
      logEvent("tool.call", { tool: "echo", success: true });
      return {
        content: [{ type: "text", text: message }],
      };
    },
  );

  server.registerTool(
    "get_time",
    {
      title: "Get Time",
      description: "Returns the current UTC time. Harmless test tool.",
      inputSchema: {},
    },
    async () => {
      logEvent("tool.call", { tool: "get_time", success: true });
      return {
        content: [{ type: "text", text: new Date().toISOString() }],
      };
    },
  );
}
