import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import {
  allowedMethodsMiddleware,
  authRateLimitMiddleware,
  clientIp,
  corsMiddleware,
  maxBodySizeMiddleware,
  securityHeadersMiddleware,
  verifyBearerToken,
} from "@derhead/security";
import { logEvent } from "./lib";
import { createMcpServer } from "./server";

type Bindings = {
  MCP_AUTH_TOKEN: string;
  ALLOWED_ORIGINS?: string;
};

const MAX_BODY_BYTES = 256_000;

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", securityHeadersMiddleware());
app.use("*", corsMiddleware());
app.use("*", authRateLimitMiddleware());

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "derhead-mcp",
  }),
);

app.all(
  "/mcp",
  allowedMethodsMiddleware(["POST", "OPTIONS"]),
  maxBodySizeMiddleware(MAX_BODY_BYTES),
  async (c) => {
    const token = c.env.MCP_AUTH_TOKEN;

    if (!token) {
      logEvent("auth.misconfigured");
      return c.json({ error: "Service unavailable" }, 503);
    }

    if (!verifyBearerToken(c.req.header("Authorization"), token)) {
      logEvent("auth.failed", { path: "/mcp", ip: clientIp(c) });
      return c.json({ error: "Unauthorized" }, 401);
    }

    const contentType = c.req.header("Content-Type") ?? "";
    if (
      c.req.method === "POST" &&
      !contentType.includes("application/json")
    ) {
      return c.json({ error: "Unsupported media type" }, 415);
    }

    logEvent("mcp.request", {
      method: c.req.method,
      ip: clientIp(c),
    });

    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPTransport();

    await mcpServer.connect(transport);
    return transport.handleRequest(c);
  },
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  logEvent("error", { message: err.message, ip: clientIp(c) });
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
