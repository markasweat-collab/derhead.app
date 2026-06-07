const { accessSync } = require("node:fs");
const { join } = require("node:path");

const required = ["index.html", "styles.css", "script.js", "favicon.svg"];

for (const file of required) {
  accessSync(join(__dirname, "..", "public", file));
}

console.log("Static assets verified.");
