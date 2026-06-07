import { Hono } from "hono";
import {
  authRateLimitMiddleware,
  clientIp,
  corsMiddleware,
  maxBodySizeMiddleware,
  requireBearerAuth,
  securityHeadersMiddleware,
  waitlistRateLimitMiddleware,
} from "@derhead/security";

type Bindings = {
  ENVIRONMENT?: string;
  API_AUTH_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
  WAITLIST?: KVNamespace;
  API_HEALTH_URL?: string;
  MCP_HEALTH_URL?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

app.post(
  "/v1/waitlist",
  waitlistRateLimitMiddleware(),
  maxBodySizeMiddleware(4_096),
  async (c) => {
    let body: { email?: string; company?: string };
    try {
      body = await c.req.json<{ email?: string; company?: string }>();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    if (body.company) {
      return c.json({ ok: true, message: "You're on the list. We'll be in touch." });
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return c.json({ error: "Invalid email address" }, 400);
    }

    const entry = {
      email,
      createdAt: new Date().toISOString(),
    };

    if (c.env.WAITLIST) {
      const existing = await c.env.WAITLIST.get(`email:${email}`);
      if (existing) {
        return c.json({
          ok: true,
          message: "You're already on the list. We'll be in touch.",
        });
      }
      await c.env.WAITLIST.put(`email:${email}`, JSON.stringify(entry));
    }

    console.log(
      JSON.stringify({
        service: "derhead-api",
        event: "waitlist.signup",
        email,
        ip: clientIp(c),
        stored: Boolean(c.env.WAITLIST),
      }),
    );

    return c.json(
      { ok: true, message: "You're on the list. We'll be in touch." },
      201,
    );
  },
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

app.get("/v1/services", async (c) => {
  const apiHealthUrl =
    c.env.API_HEALTH_URL ??
    "https://derhead-api.mark-a-sweat.workers.dev/health";
  const mcpHealthUrl =
    c.env.MCP_HEALTH_URL ??
    "https://derhead-mcp.mark-a-sweat.workers.dev/health";

  const checks = [
    {
      id: "web",
      name: "derhead-web",
      domain: "derhead.app",
      auth: "Public (static)",
      url: "https://derhead.app/",
    },
    {
      id: "api",
      name: "derhead-api",
      domain: "api.derhead.app",
      auth: "Bearer token",
      url: apiHealthUrl,
    },
    {
      id: "mcp",
      name: "derhead-mcp",
      domain: "mcp.derhead.app",
      auth: "Bearer token",
      url: mcpHealthUrl,
    },
  ] as const;

  const results = await Promise.all(
    checks.map(async (service) => {
      try {
        const response = await fetch(service.url, {
          method: service.id === "web" ? "HEAD" : "GET",
          redirect: "follow",
        });
        const healthy = response.ok;
        return { ...service, status: healthy ? "healthy" : "degraded" };
      } catch {
        return { ...service, status: "unreachable" };
      }
    }),
  );

  return c.json({ services: results });
});

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
