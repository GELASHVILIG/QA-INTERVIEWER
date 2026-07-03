/* Launches an isolated copy of server.js for E2E runs so the real
   data.json is never touched. Used by playwright.config.js. */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..", "..");
const tmp = path.join(__dirname, ".tmp");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
for (const f of ["server.js", "index.html"])
  fs.copyFileSync(path.join(root, f), path.join(tmp, f));

const child = spawn(process.execPath, [path.join(tmp, "server.js")], {
  env: { ...process.env, PORT: process.env.PORT || "3100" },
  stdio: "inherit"
});
process.on("SIGTERM", () => child.kill());
process.on("SIGINT", () => child.kill());
child.on("exit", code => process.exit(code || 0));
