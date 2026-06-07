import { Hono } from "hono";
import {
  authRateLimitMiddleware,
  clientIp,
  corsMiddleware,
  requireBearerAuth,
  securityHeadersMiddleware,
} from "@derhead/security";

type Bindings = {
  ENVIRONMENT?: string;
  API_AUTH_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", securityHeadersMiddleware());
app.use("*", corsMiddleware());
app.use("*", authRateLimitMiddleware());

app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  console.log(
    JSON.stringify({
      service: "derhead-api",
      event: "request",
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      ip: clientIp(c),
      durationMs: Date.now() - start,
    }),
  );
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "derhead-api",
  }),
);

app.use("/v1/*", requireBearerAuth("API_AUTH_TOKEN"));

app.get("/v1/status", (c) =>
  c.json({
    status: "operational",
    environment: c.env.ENVIRONMENT ?? "production",
  }),
);

app.get("/v1/info", (c) =>
  c.json({
    name: "derhead-api",
    version: "0.1.0",
    domains: {
      web: "https://derhead.app",
      api: "https://api.derhead.app",
      mcp: "https://mcp.derhead.app",
      app: "https://app.derhead.app",
    },
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error(
    JSON.stringify({
      service: "derhead-api",
      event: "error",
      message: err.message,
      ip: clientIp(c),
    }),
  );
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
