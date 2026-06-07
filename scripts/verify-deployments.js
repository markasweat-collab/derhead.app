#!/usr/bin/env node

const API_BASE = process.env.API_BASE_URL ?? "https://api.derhead.app";
const MCP_BASE = process.env.MCP_BASE_URL ?? "https://mcp.derhead.app";
const API_TOKEN = process.env.API_AUTH_TOKEN;
const MCP_TOKEN = process.env.MCP_AUTH_TOKEN;

const failures = [];

async function request(base, path, options = {}) {
  const url = new URL(path, base).toString();
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  let body;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return { status: response.status, body };
}

function expect(name, condition, detail) {
  if (condition) {
    console.log(`  ok  ${name}`);
    return;
  }
  const message = detail ? `${name}: ${detail}` : name;
  failures.push(message);
  console.log(`  FAIL  ${message}`);
}

async function checkHealth(base, service) {
  console.log(`\n${service} health (${base})`);
  try {
    const { status, body } = await request(base, "/health");
    expect("GET /health returns 200", status === 200, `got ${status}`);
    expect(
      "GET /health returns ok: true",
      typeof body === "object" && body?.ok === true,
      JSON.stringify(body),
    );
  } catch (error) {
    expect("GET /health is reachable", false, error.message);
  }
}

async function checkApiAuth() {
  console.log(`\nAPI auth (${API_BASE})`);
  try {
    const unauth = await request(API_BASE, "/v1/status");
    expect("GET /v1/status without token returns 401", unauth.status === 401);

    if (!API_TOKEN) {
      console.log("  skip  authenticated API checks (set API_AUTH_TOKEN)");
      return;
    }

    const auth = await request(API_BASE, "/v1/status", {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    expect("GET /v1/status with token returns 200", auth.status === 200);
    expect(
      "GET /v1/status reports operational",
      auth.body?.status === "operational",
      JSON.stringify(auth.body),
    );
  } catch (error) {
    expect("API auth checks are reachable", false, error.message);
  }
}

async function checkMcpAuth() {
  console.log(`\nMCP auth (${MCP_BASE})`);
  try {
    const unauth = await request(MCP_BASE, "/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "verify-deployments", version: "0.1.0" },
        },
      }),
    });
    expect("POST /mcp without token returns 401", unauth.status === 401);

    if (!MCP_TOKEN) {
      console.log("  skip  authenticated MCP checks (set MCP_AUTH_TOKEN)");
      return;
    }

    const auth = await request(MCP_BASE, "/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MCP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "verify-deployments", version: "0.1.0" },
        },
      }),
    });
    expect(
      "POST /mcp with token does not return 401",
      auth.status !== 401,
      `got ${auth.status}`,
    );
    expect(
      "POST /mcp with token does not return 503",
      auth.status !== 503,
      "MCP_AUTH_TOKEN secret may be missing",
    );
  } catch (error) {
    expect("MCP auth checks are reachable", false, error.message);
  }
}

async function main() {
  console.log("derhead.app deployment verification");
  await checkHealth(API_BASE, "API");
  await checkHealth(MCP_BASE, "MCP");
  await checkApiAuth();
  await checkMcpAuth();

  console.log("");
  if (failures.length === 0) {
    console.log("All checks passed.");
    return;
  }

  console.log(`${failures.length} check(s) failed:`);
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

main();
