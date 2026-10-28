import { copyFileSync } from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import electron from "vite-plugin-electron/simple";
import { launchElectronDev } from "./electron/launch-dev";

function copyPortalUiaScripts(): Plugin {
  const pairs = [
    ["electron/portal-cert-uia.ps1", "dist-electron/portal-cert-uia.ps1"],
    ["electron/portal-edufine-uia.ps1", "dist-electron/portal-edufine-uia.ps1"],
    [
      "electron/brity-messenger-uia.ps1",
      "dist-electron/brity-messenger-uia.ps1",
    ],
    ["electron/brity-cert-uia.ps1", "dist-electron/brity-cert-uia.ps1"],
    [
      "electron/brity-gov-cert-login-uia.ps1",
      "dist-electron/brity-gov-cert-login-uia.ps1",
    ],
  ];
  return {
    name: "copy-portal-uia-scripts",
    writeBundle(options) {
      if (!options.dir?.replace(/\\/g, "/").endsWith("dist-electron")) return;
      for (const [relSrc, relDest] of pairs) {
        try {
          copyFileSync(path.join(__dirname, relSrc), path.join(__dirname, relDest));
        } catch {
          /* dev 첫 빌드 전 등 */
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    copyPortalUiaScripts(),
    electron({
      main: {
        entry: "electron/bootstrap.ts",
        onstart() {
          launchElectronDev();
        },
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: [
                "electron-store",
                "koffi",
                "electron-updater",
                "chrome-remote-interface",
              ],
            },
          },
        },
      },
      preload: {
        input: "electron/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              output: {
                format: "cjs",
                entryFileNames: "preload.cjs",
              },
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "./",
});
