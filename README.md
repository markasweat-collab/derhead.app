# derhead.app

Secure hosting for MCP servers and Cursor-built apps — split across three Cloudflare deploys.

## Architecture

| Deploy | Platform | Domain | Purpose |
|--------|----------|--------|---------|
| Root `wrangler.jsonc` | Cloudflare Worker | `derhead.app`, `www.derhead.app` | Public marketing site (`apps/web/public`) |
| `apps/api` | Cloudflare Worker | `api.derhead.app` | App API routes (auth required on /v1/*) |
| `apps/mcp` | Cloudflare Worker | `mcp.derhead.app` | Authenticated MCP server |
| `apps/web/public/app` | (same web deploy) | `app.derhead.app` | Dashboard UI (private beta) |

## Security

Security is enforced at every layer via `@derhead/security`:

- **Constant-time** Bearer token verification (timing-attack resistant)
- **Rate limiting** on auth endpoints (20 req/min per IP)
- **Strict CORS** allowlist — unknown browser origins get 403
- **Security headers** on all Worker responses (HSTS, nosniff, DENY frame, CORP/COOP)
- **CSP + HSTS** on public site via Pages `_headers`
- **API auth** — `/v1/*` requires `API_AUTH_TOKEN` secret
- **MCP lockdown** — auth required, 256KB body limit, POST-only, tool allowlist, Content-Type validation
- **Generic errors** — no stack traces or internal details leaked to clients
- **Structured audit logs** — auth failures, tool calls, requests (no tokens logged)

See https://derhead.app/security/ for full details.

## Local development

```bash
npm install

npm run dev:web   # http://localhost:8080
npm run dev:api   # http://localhost:8787
npm run dev:mcp   # http://localhost:8788
```

Copy `.dev.vars.example` to `.dev.vars` in each worker app for local secrets.

## Deploy

```bash
npm run deploy          # public site (root wrangler → derhead Worker)
npm run deploy:api      # API worker
npm run deploy:mcp      # MCP worker
```

### Cloudflare Builds (fixes monorepo workspace error)

**Public site (`derhead` Worker)** — existing Git integration, deploy from repo root:

| Setting | Value |
|---------|-------|
| Root directory | *(empty — repo root)* |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Root is registered as a workspace package with `wrangler.jsonc` pointing at `apps/web/public`.

**API Worker (`derhead-api`)** — separate Cloudflare project:

| Setting | Value |
|---------|-------|
| Root directory | `apps/api` |
| Deploy command | `npx wrangler deploy` |

**MCP Worker (`derhead-mcp`)** — separate Cloudflare project:

| Setting | Value |
|---------|-------|
| Root directory | `apps/mcp` |
| Deploy command | `npx wrangler deploy` |

### Required secrets

```bash
# API worker
cd apps/api && npx wrangler secret put API_AUTH_TOKEN

# MCP worker
cd apps/mcp && npx wrangler secret put MCP_AUTH_TOKEN
```

Use long, random tokens. Never commit secrets to git.

## Project structure

```
apps/
  web/public/       Static site (Pages)
  api/src/          API Worker
  mcp/src/          MCP Worker
packages/
  security/         Shared auth, headers, rate limiting, CORS
```

## Public site pages

| Path | Page |
|------|------|
| `/` | Homepage |
| `/pricing/` | Pricing |
| `/docs/` | Getting started |
| `/security/` | Security architecture |
| `/blog/` | Changelog |
| `/app/` | Dashboard (private beta) |

Dashboard preview: `/app/?preview=1`
