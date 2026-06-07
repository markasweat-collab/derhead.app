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

Deploy from the **repo root** so the shared `@derhead/security` workspace package resolves.

```bash
npm install

npm run deploy          # public site (derhead Worker)
npm run deploy:api      # API worker → api.derhead.app
npm run deploy:mcp      # MCP worker → mcp.derhead.app
npm run deploy:all      # all three
```

### Cloudflare Workers Builds

Create **three separate Workers** projects in the Cloudflare dashboard, all connected to the same GitHub repo. Each project must use the **repo root** as its root directory (not `apps/api` or `apps/mcp` — those paths cannot resolve the workspace package).

#### 1. Public site (`derhead`)

| Setting | Value |
|---------|-------|
| Worker name | `derhead` |
| Root directory | *(empty — repo root)* |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

#### 2. API (`derhead-api`)

| Setting | Value |
|---------|-------|
| Worker name | `derhead-api` |
| Root directory | *(empty — repo root)* |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy -c apps/api/wrangler.jsonc` |

Custom domain `api.derhead.app` is declared in `apps/api/wrangler.jsonc` and is attached on first deploy.

#### 3. MCP (`derhead-mcp`)

| Setting | Value |
|---------|-------|
| Worker name | `derhead-mcp` |
| Root directory | *(empty — repo root)* |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy -c apps/mcp/wrangler.jsonc` |

Custom domain `mcp.derhead.app` is declared in `apps/mcp/wrangler.jsonc` and is attached on first deploy.

### Connect derhead.app (replace Squarespace)

If `derhead.app` still shows your old Squarespace site, the domain is on Cloudflare but traffic is **not** routed to the `derhead` Worker yet.

#### 1. Attach the Worker to your domain

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **`derhead`**
2. **Settings** → **Domains & Routes**
3. **Add** → **Custom Domain** → `derhead.app`
4. Repeat for `www.derhead.app`

Or redeploy after merging the latest `wrangler.jsonc` — it declares both custom domains automatically.

#### 2. Remove Squarespace DNS records

1. Cloudflare → **Websites** → **derhead.app** → **DNS** → **Records**
2. Delete any record pointing to Squarespace, for example:
   - CNAME `@` → `ext-sq.squarespace.com`
   - CNAME `www` → `ext-sq.squarespace.com`
   - A records with Squarespace IPs
3. After adding the Worker custom domain, Cloudflare creates the correct records for you.

#### 3. Disconnect Squarespace (optional but recommended)

In Squarespace: **Settings** → **Domains** → `derhead.app` → **Disconnect** or remove the domain so it stops claiming the site.

#### 4. Verify

Open `https://derhead.app` — you should see the derhead marketing site (hero: "Secure hosting for MCP servers…"), not Squarespace.

While DNS propagates, the Worker is always reachable at your `*.workers.dev` URL (shown on the `derhead` Worker overview page).

### Required secrets

Generate long random tokens (do not reuse across services):

```bash
openssl rand -base64 32
```

Set each secret once per worker:

```bash
# API worker
npx wrangler secret put API_AUTH_TOKEN -c apps/api/wrangler.jsonc

# MCP worker
npx wrangler secret put MCP_AUTH_TOKEN -c apps/mcp/wrangler.jsonc
```

Never commit secrets to git.

### Verify deployments

After deploy and secrets are set, run smoke tests from your machine:

```bash
# Public health checks only
npm run verify:deployments

# Full auth checks (requires secrets in env)
API_AUTH_TOKEN='your-api-token' MCP_AUTH_TOKEN='your-mcp-token' npm run verify:deployments
```

Expected results:

| Check | URL | Expected |
|-------|-----|----------|
| API health | `GET https://api.derhead.app/health` | `200`, `{ "ok": true }` |
| MCP health | `GET https://mcp.derhead.app/health` | `200`, `{ "ok": true }` |
| API auth | `GET https://api.derhead.app/v1/status` | `401` without token, `200` with Bearer token |
| MCP auth | `POST https://mcp.derhead.app/mcp` | `401` without token, not `503` with token |

Optional manual API check:

```bash
curl -sS https://api.derhead.app/health
curl -sS -H "Authorization: Bearer $API_AUTH_TOKEN" https://api.derhead.app/v1/status
```

### Local deploy (alternative to dashboard)

If you have `wrangler login` configured locally:

```bash
npm ci
npm run deploy:api
npm run deploy:mcp
npx wrangler secret put API_AUTH_TOKEN -c apps/api/wrangler.jsonc
npx wrangler secret put MCP_AUTH_TOKEN -c apps/mcp/wrangler.jsonc
API_AUTH_TOKEN='...' MCP_AUTH_TOKEN='...' npm run verify:deployments
```

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
| `/app/` | Dashboard (API token sign-in) |

Dashboard preview (static UI): `/app/?preview=1`

### Optional: persist waitlist signups in KV

By default, waitlist signups are logged in the API worker's Cloudflare Logs. To persist emails in KV:

```bash
npx wrangler kv namespace create WAITLIST -c apps/api/wrangler.jsonc
```

Add the returned `id` to `apps/api/wrangler.jsonc`:

```jsonc
"kv_namespaces": [{ "binding": "WAITLIST", "id": "<your-kv-id>" }]
```

Redeploy the API worker.

