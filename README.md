# derhead.app

Secure hosting platform for MCP servers and apps built in Cursor — connected to ChatGPT Business.

## Local preview

Serve the `public/` directory locally:

```bash
python3 -m http.server 8080 --directory public
```

Then visit http://localhost:8080

## Deploy

```bash
npm install
npm run deploy
```

Cloudflare Workers Builds runs `npm run build` then `npm run deploy` on push.

## Structure

| Path | Purpose |
|------|---------|
| `public/index.html` | Landing page |
| `public/styles.css` | Styles |
| `public/script.js` | Mobile nav & waitlist form |
| `public/favicon.svg` | Site icon |
| `wrangler.jsonc` | Cloudflare static assets config |
| `package.json` | Build & deploy scripts |
