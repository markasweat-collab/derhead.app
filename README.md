# derhead.app

Secure hosting for MCP servers and Cursor-built apps — split across three Cloudflare deploys.

## Architecture

| Deploy | Platform | Domain | Purpose |
|--------|----------|--------|---------|
| `apps/web` | Cloudflare Pages | `derhead.app`, `www.derhead.app` | Public marketing site only |
| `apps/api` | Cloudflare Worker | `api.derhead.app` | App API routes |
| `apps/mcp` | Cloudflare Worker | `mcp.derhead.app` | Authenticated MCP server |

Reserved for later: `app.derhead.app` (logged-in app UI).

## Local development

```bash
npm install

# Public site (http://localhost:8080)
npm run dev:web

# API worker (http://localhost:8787)
npm run dev:api

# MCP worker (http://localhost:8788)
npm run dev:mcp
```

## Deploy

Each app deploys independently:

```bash
npm run deploy:web   # Cloudflare Pages → derhead.app
npm run deploy:api   # Worker → api.derhead.app
npm run deploy:mcp   # Worker → mcp.derhead.app
```

Or all at once: `npm run deploy:all`

### Cloudflare setup

1. **Pages (`derhead-web`)** — connect repo, set root directory to `apps/web`, build command empty, output directory `public`. Add custom domains `derhead.app` and `www.derhead.app`. The `_redirects` file sends www → apex.

2. **Worker (`derhead-api`)** — connect repo, root directory `apps/api`, deploy command `npx wrangler deploy`. Add custom domain `api.derhead.app`.

3. **Worker (`derhead-mcp`)** — connect repo, root directory `apps/mcp`, deploy command `npx wrangler deploy`. Add custom domain `mcp.derhead.app`. Set secret:

   ```bash
   cd apps/mcp && npx wrangler secret put MCP_AUTH_TOKEN
   ```

### MCP authentication

All requests to `https://mcp.derhead.app/mcp` require a Bearer token:

```
Authorization: Bearer <your-mcp-auth-token>
```

Only harmless test tools are enabled: `ping`, `echo`, `get_time`. Do not connect private accounts or data until auth, logging, and tool allowlists are verified in production.

## Project structure

```
apps/
  web/public/     Static site (Pages)
  api/src/        API Worker (Hono)
  mcp/src/        MCP Worker (Hono + @hono/mcp)
```
