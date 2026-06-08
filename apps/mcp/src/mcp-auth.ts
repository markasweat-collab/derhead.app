import { timingSafeEqual, verifyBearerToken } from "@derhead/security";

const PUBLIC_JSONRPC_METHODS = new Set([
  "initialize",
  "notifications/initialized",
  "tools/list",
  "ping",
]);

export function verifyMcpAuthToken(
  headers: Headers,
  expectedToken: string,
): boolean {
  if (verifyBearerToken(headers.get("Authorization") ?? undefined, expectedToken)) {
    return true;
  }

  const apiKey = headers.get("X-API-Key")?.trim();
  if (apiKey && expectedToken && timingSafeEqual(apiKey, expectedToken)) {
    return true;
  }

  return false;
}

export async function isPublicMcpDiscoveryRequest(
  method: string,
  request: Request,
): Promise<boolean> {
  if (method === "GET" || method === "OPTIONS") {
    return true;
  }

  if (method !== "POST") {
    return false;
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return false;
  }

  try {
    const body: unknown = await request.clone().json();
    const messages = Array.isArray(body) ? body : [body];
    if (messages.length === 0) {
      return false;
    }

    return messages.every((message) => {
      if (!message || typeof message !== "object") {
        return false;
      }
      const rpcMethod = (message as { method?: unknown }).method;
      return typeof rpcMethod === "string" && PUBLIC_JSONRPC_METHODS.has(rpcMethod);
    });
  } catch {
    return false;
  }
}

export function requiresMcpAuth(
  method: string,
  isPublicDiscovery: boolean,
): boolean {
  if (method === "OPTIONS") {
    return false;
  }
  return !isPublicDiscovery;
}
