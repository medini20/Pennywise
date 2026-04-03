const { spawn } = require("child_process");
const path = require("path");

const frontendDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(__dirname, "..", "..", "backend");
const reactScriptsPath = path.resolve(
  frontendDir,
  "node_modules",
  "react-scripts",
  "bin",
  "react-scripts.js"
);

let shuttingDown = false;
let frontendProcess;
let backendProcess;

const shutdown = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill("SIGTERM");
  }

  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill("SIGTERM");
  }
};

const startBackend = () => {
  backendProcess = spawn("node", ["server.js"], {
    cwd: backendDir,
    stdio: "inherit",
    shell: false
  });

  backendProcess.on("exit", (code) => {
    if (!shuttingDown && code && code !== 0) {
      console.error(
        "[dev] Backend exited unexpectedly. Run `cd backend && node server.js` to inspect logs."
      );
    }
  });
};

const startFrontend = () => {
  frontendProcess = spawn(process.execPath, [reactScriptsPath, "start"], {
    cwd: frontendDir,
    stdio: "inherit",
    shell: false
  });

  frontendProcess.on("exit", (code) => {
    if (!shuttingDown) {
      shutdown();
      process.exit(code || 0);
    }
  });
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

startBackend();
setTimeout(startFrontend, 1200);
