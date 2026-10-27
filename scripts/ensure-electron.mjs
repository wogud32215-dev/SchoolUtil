import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const exe = path.join(root, "node_modules", "electron", "dist", "electron.exe");

if (!fs.existsSync(exe)) {
  console.warn(
    "[SchoolUtil] electron.exe가 없습니다. 다음을 실행하세요:\n" +
      "  npm run electron:install\n" +
      "npm 11을 쓰는 경우: npm install-scripts approve electron 후 다시 설치",
  );
}
