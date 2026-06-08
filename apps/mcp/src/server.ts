import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHomeTwinTools } from "./tools/hometwin";
import { registerTestTools } from "./tools/test";

type McpEnv = {
  DB?: D1Database;
};

export function createMcpServer(env: McpEnv = {}): McpServer {
  const server = new McpServer({
    name: "derhead-mcp",
    version: "0.2.0",
  });

  registerTestTools(server);
  registerHomeTwinTools(server, { db: env.DB });

  return server;
}
