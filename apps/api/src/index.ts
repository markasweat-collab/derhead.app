import { Hono } from "hono";

type Bindings = {
  ENVIRONMENT?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  console.log(
    JSON.stringify({
      service: "derhead-api",
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Date.now() - start,
    }),
  );
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "derhead-api",
    timestamp: new Date().toISOString(),
  }),
);

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
      api: "https://api.derhead.app",
      mcp: "https://mcp.derhead.app",
      web: "https://derhead.app",
    },
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
