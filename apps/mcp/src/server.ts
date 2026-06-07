import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logEvent } from "./lib";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "derhead-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Returns pong. Harmless connectivity test.",
      inputSchema: {},
    },
    async () => {
      logEvent("tool.call", { tool: "ping" });
      return {
        content: [{ type: "text", text: "pong" }],
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
      logEvent("tool.call", { tool: "echo" });
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
      logEvent("tool.call", { tool: "get_time" });
      return {
        content: [{ type: "text", text: new Date().toISOString() }],
      };
    },
  );

  return server;
}
