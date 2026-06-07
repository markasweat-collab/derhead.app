const { accessSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const publicDir = join(__dirname, "..", "apps", "web", "public");

const required = [
  "index.html",
  "styles.css",
  "script.js",
  "favicon.svg",
  "_headers",
  "_redirects",
];

for (const file of required) {
  accessSync(join(publicDir, file));
}

const redirectsPath = join(publicDir, "_redirects");
const redirects = readFileSync(redirectsPath, "utf8");
for (const [index, line] of redirects.split("\n").entries()) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    continue;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error(
      `_redirects line ${index + 1}: absolute URLs are not allowed on Workers. Use relative paths only.`,
    );
  }
}

const revision =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  new Date().toISOString();

writeFileSync(join(publicDir, ".deploy-revision"), `${revision}\n`, "utf8");

console.log("Web assets verified.");
