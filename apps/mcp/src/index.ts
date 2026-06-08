import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import {
  allowedMethodsMiddleware,
  authRateLimitMiddleware,
  clientIp,
  corsMiddleware,
  maxBodySizeMiddleware,
  requestLoggingMiddleware,
  securityHeadersMiddleware,
  verifyBearerToken,
} from "@derhead/security";
import { logEvent } from "./lib";
import { createMcpServer } from "./server";

type Bindings = {
  MCP_AUTH_TOKEN: string;
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
};

const MAX_BODY_BYTES = 256_000;

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", securityHeadersMiddleware());
app.use("*", corsMiddleware());
app.use("*", authRateLimitMiddleware());
app.use("*", requestLoggingMiddleware("derhead-mcp"));

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
    const ip = clientIp(c);

    if (!token) {
      logEvent("auth.misconfigured", { ip, success: false });
      return c.json({ error: "Service unavailable" }, 503);
    }

    if (!verifyBearerToken(c.req.header("Authorization"), token)) {
      logEvent("auth.failed", { ip, path: "/mcp", success: false });
      return c.json({ error: "Unauthorized" }, 401);
    }

    const contentType = c.req.header("Content-Type") ?? "";
    if (
      c.req.method === "POST" &&
      !contentType.includes("application/json")
    ) {
      logEvent("request.rejected", {
        ip,
        path: "/mcp",
        reason: "unsupported_media_type",
        success: false,
      });
      return c.json({ error: "Unsupported media type" }, 415);
    }

    const mcpServer = createMcpServer({ DB: c.env.DB });
    const transport = new StreamableHTTPTransport();

    await mcpServer.connect(transport);
    return transport.handleRequest(c);
  },
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  logEvent("error", {
    ip: clientIp(c),
    message: err.message,
    success: false,
  });
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
