# HomeTwin on derhead.app

Port of the DIY-MCP digital twin concept to Cloudflare D1 + MCP tools on `mcp.derhead.app`.

## Data model (D1)

Tables: `properties`, `rooms`, `measurements`, `projects`, `assets`, `shopping_list_items`, `constraints`.

Schema: `packages/db/migrations/0001_hometwin_schema.sql`

## One-time D1 setup

```bash
# 1. Create the database (copy database_id from output)
npx wrangler d1 create derhead-hometwin -c apps/mcp/wrangler.jsonc

# 2. Paste database_id into apps/mcp/wrangler.jsonc (replace REPLACE_AFTER_D1_CREATE)

# 3. Apply schema
npm run db:migrate:remote

# Local dev
npm run db:migrate:local
npm run dev:mcp
```

## MCP tools

### Core (Phase 2)
- `list_properties`, `get_property`, `create_property`, `set_property_address`
- `add_measurement`, `update_measurement`, `list_measurements`

### Estimators (Phase 3)
- `estimate_paint`, `estimate_trim`, `estimate_rug`, `estimate_curtains`, `estimate_tile`

Each returns `{ quantity, unit, assumptions, confidence }`.

### Sourcing (Phase 4)
- `source_products` — stub retailer candidates until live APIs are connected
- `compare_products`
- `create_shopping_list`

### Validation (Phase 5)
- `validate_design` — checks proposed designs against stored constraints and measurements

Test tools (`ping`, `get_status`, `echo`, `get_time`) remain for connectivity checks.

## ChatGPT connector

ChatGPT Developer Mode uses **Mixed Authentication**:
- `initialize`, `tools/list`, and GET SSE discovery are **unauthenticated**
- `tools/call` (writes/reads data) requires **Bearer** or **X-API-Key**

### Connector setup

1. **Settings → Apps & connectors → Advanced → Developer mode** ON
2. **Create** connector:
   - **URL:** `https://mcp.derhead.app/mcp`
   - **Auth:** No authentication (discovery is public; tool calls still need token — see below)
3. After deploy, click **Refresh** on the connector
4. Enable in a **new chat** via the tools picker

For tool execution from ChatGPT, pass your MCP token when prompted or configure OAuth (future).

### Cloudflare (required for ChatGPT)

OpenAI servers must reach `/mcp` without bot challenges. In Cloudflare WAF:

- **If:** `(http.host eq "mcp.derhead.app")`
- **Then:** Skip → Bot Fight Mode, Security Level, Managed Challenge
- **Order:** First

Without this, ChatGPT sees the connector name but **no tools** (discovery GET/POST gets HTML challenge pages).

### Verify tool discovery

```bash
# Should return SSE with tools (no auth required after mixed-auth deploy)
curl -s -X POST 'https://mcp.derhead.app/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Look for `"name":"list_properties"` in the response.

## Package layout

```
packages/db/          Shared D1 queries + estimators
apps/mcp/src/tools/   MCP tool registration
```

## Roadmap notes

- **Rooms / projects / assets / constraints CRUD tools** — schema exists; add MCP tools as needed
- **Live retailer APIs** — replace `source_products` stub
- **Dashboard** — optional REST via `apps/api` sharing `@derhead/db`
