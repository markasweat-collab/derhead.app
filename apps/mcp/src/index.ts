import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { createMcpServer } from "./server";
import { logEvent, requireAuth } from "./lib";

type Bindings = {
  MCP_AUTH_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "derhead-mcp",
    tools: ["ping", "echo", "get_time"],
    authRequired: true,
  }),
);

app.all("/mcp", async (c) => {
  const token = c.env.MCP_AUTH_TOKEN;

  if (!token) {
    logEvent("auth.misconfigured");
    return c.json({ error: "Server auth is not configured" }, 503);
  }

  if (!requireAuth(c.req.header("Authorization"), token)) {
    logEvent("auth.failed", {
      path: "/mcp",
      ip: c.req.header("CF-Connecting-IP") ?? "unknown",
    });
    return c.json({ error: "Unauthorized" }, 401);
  }

  logEvent("mcp.request", {
    method: c.req.method,
    ip: c.req.header("CF-Connecting-IP") ?? "unknown",
  });

  const mcpServer = createMcpServer();
  const transport = new StreamableHTTPTransport();

  await mcpServer.connect(transport);
  return transport.handleRequest(c);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
