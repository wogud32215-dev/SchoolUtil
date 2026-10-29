import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const destDir = path.join(root, "dist-electron");

const scripts = [
  "portal-cert-uia.ps1",
  "portal-edufine-uia.ps1",
  "brity-messenger-uia.ps1",
  "brity-cert-uia.ps1",
  "brity-gov-cert-login-uia.ps1",
];

mkdirSync(destDir, { recursive: true });

for (const name of scripts) {
  const src = path.join(root, "electron", name);
  const dest = path.join(destDir, name);
  copyFileSync(src, dest);
  console.log(`[copy-uia-scripts] ${name} -> dist-electron/`);
}
