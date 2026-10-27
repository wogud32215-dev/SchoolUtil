import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const exe = require("electron");

const ps =
  process.env.SystemRoot
    ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : "powershell.exe";

execFileSync(
  ps,
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "Unblock-File -LiteralPath $env:SCHOOLUTIL_ELECTRON_EXE",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, SCHOOLUTIL_ELECTRON_EXE: exe },
  },
);

console.log("[SchoolUtil] Unblock-File 완료:", exe);
