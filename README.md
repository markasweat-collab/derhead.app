# derhead.app

Secure hosting platform for MCP servers and apps built in Cursor — connected to ChatGPT Business.

## Local preview

Open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Deploy

```bash
npx wrangler deploy
```

Cloudflare Workers Builds deploys automatically on push to `main`.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Landing page |
| `styles.css` | Styles |
| `script.js` | Mobile nav & waitlist form |
| `favicon.svg` | Site icon |
| `wrangler.jsonc` | Cloudflare static assets config |
| `.assetsignore` | Excludes non-site files from deploy |
