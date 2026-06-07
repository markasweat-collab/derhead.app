export const ALLOWED_TOOLS = ["ping", "echo", "get_time"] as const;

export type AllowedTool = (typeof ALLOWED_TOOLS)[number];

export function isAllowedTool(name: string): name is AllowedTool {
  return (ALLOWED_TOOLS as readonly string[]).includes(name);
}

export function logEvent(
  event: string,
  meta: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      service: "derhead-mcp",
      ts: new Date().toISOString(),
      event,
      ...meta,
    }),
  );
}

export function requireAuth(
  authorization: string | undefined,
  expectedToken: string,
): boolean {
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 && token === expectedToken;
}
