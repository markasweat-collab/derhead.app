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

## Package layout

```
packages/db/          Shared D1 queries + estimators
apps/mcp/src/tools/   MCP tool registration
```

## Roadmap notes

- **Rooms / projects / assets / constraints CRUD tools** — schema exists; add MCP tools as needed
- **Live retailer APIs** — replace `source_products` stub
- **Dashboard** — optional REST via `apps/api` sharing `@derhead/db`
