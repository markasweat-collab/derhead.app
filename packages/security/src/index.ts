import type { Context, MiddlewareHandler, Next } from "hono";

/** Constant-time string comparison to prevent timing attacks on auth tokens. */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);

  if (aBytes.byteLength !== bBytes.byteLength) {
    return false;
  }

  return crypto.subtle.timingSafeEqual(aBytes, bBytes);
}

export function verifyBearerToken(
  authorization: string | undefined,
  expectedToken: string,
): boolean {
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token || !expectedToken) {
    return false;
  }

  return timingSafeEqual(token, expectedToken);
}

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cache-Control": "no-store",
};

export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function securityHeadersMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    const response = c.res;
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
  };
}

const DEFAULT_ALLOWED_ORIGINS = [
  "https://derhead.app",
  "https://www.derhead.app",
  "https://app.derhead.app",
  "https://chatgpt.com",
  "https://chat.openai.com",
];

export function corsMiddleware(allowedOrigins?: string): MiddlewareHandler {
  const origins = allowedOrigins
    ? allowedOrigins.split(",").map((o) => o.trim())
    : DEFAULT_ALLOWED_ORIGINS;

  return async (c, next) => {
    const origin = c.req.header("Origin");

    if (origin) {
      if (!origins.includes(origin)) {
        if (c.req.method === "OPTIONS") {
          return c.body(null, 403);
        }
        return c.json({ error: "Forbidden" }, 403);
      }

      c.header("Access-Control-Allow-Origin", origin);
      c.header("Vary", "Origin");
      c.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      c.header(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-Id, X-API-Key",
      );
      c.header("Access-Control-Max-Age", "86400");
    }

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  };
}

export function allowedMethodsMiddleware(methods: string[]): MiddlewareHandler {
  const allowed = new Set(methods.map((m) => m.toUpperCase()));

  return async (c, next) => {
    if (!allowed.has(c.req.method)) {
      return c.json({ error: "Method not allowed" }, 405);
    }
    await next();
  };
}

export function maxBodySizeMiddleware(maxBytes: number): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = c.req.header("Content-Length");
    if (contentLength && Number(contentLength) > maxBytes) {
      return c.json({ error: "Payload too large" }, 413);
    }
    await next();
  };
}

type RateLimitOptions = {
  maxAttempts: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimitMiddleware(
  options: RateLimitOptions,
  keyFn: (c: Context) => string,
): MiddlewareHandler {
  return async (c, next) => {
    const key = keyFn(c);
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    if (entry.count >= options.maxAttempts) {
      return c.json({ error: "Too many requests" }, 429);
    }

    entry.count += 1;
    await next();
  };
}

export function clientIp(c: Context): string {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function authRateLimitMiddleware(): MiddlewareHandler {
  return rateLimitMiddleware(
    { maxAttempts: 20, windowMs: 60_000 },
    (c) => `auth:${clientIp(c)}`,
  );
}

export function waitlistRateLimitMiddleware(): MiddlewareHandler {
  return rateLimitMiddleware(
    { maxAttempts: 5, windowMs: 3_600_000 },
    (c) => `waitlist:${clientIp(c)}`,
  );
}

export type AuditLogEntry = {
  service: string;
  event: string;
  ip: string;
  path: string;
  method: string;
  status?: number;
  success: boolean;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

/** Structured JSON audit log — view in Cloudflare Workers Logs. */
export function auditLog(entry: AuditLogEntry): void {
  const { meta, ...fields } = entry;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      ...fields,
      ...(meta ?? {}),
    }),
  );
}

export function requestLoggingMiddleware(service: string): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const path = new URL(c.req.url).pathname;
    const ip = clientIp(c);
    const method = c.req.method;

    await next();

    auditLog({
      service,
      event: "request",
      ip,
      path,
      method,
      status: c.res.status,
      success: c.res.status < 400,
      durationMs: Date.now() - start,
    });
  };
}

export function requireBearerAuth(
  tokenEnvKey: string,
  options?: { service?: string },
): MiddlewareHandler {
  return async (c, next) => {
    const expected = (c.env as Record<string, string | undefined>)[tokenEnvKey];
    const path = new URL(c.req.url).pathname;
    const ip = clientIp(c);

    if (!expected) {
      if (options?.service) {
        auditLog({
          service: options.service,
          event: "auth.misconfigured",
          ip,
          path,
          method: c.req.method,
          status: 503,
          success: false,
        });
      }
      return c.json({ error: "Service unavailable" }, 503);
    }

    if (!verifyBearerToken(c.req.header("Authorization"), expected)) {
      if (options?.service) {
        auditLog({
          service: options.service,
          event: "auth.failed",
          ip,
          path,
          method: c.req.method,
          status: 401,
          success: false,
        });
      }
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  };
}

export function safeErrorMessage(publicMessage = "Request failed"): string {
  return publicMessage;
}
