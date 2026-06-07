# derhead.app

Powertrain intelligence for diesel pros — a static marketing site deployed via Cloudflare Workers.

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

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Landing page |
| `styles.css` | Styles |
| `script.js` | Mobile nav & waitlist form |
| `favicon.svg` | Site icon |
| `wrangler.jsonc` | Cloudflare static assets config |
