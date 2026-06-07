const { accessSync } = require("node:fs");
const { join } = require("node:path");

const required = [
  "index.html",
  "styles.css",
  "script.js",
  "favicon.svg",
  "_headers",
];

for (const file of required) {
  accessSync(join(__dirname, "..", "apps", "web", "public", file));
}

console.log("Web assets verified.");
