import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
        // Externalize native modules for main process
        vite: {
          plugins: [
            {
              name: "shim-node-sqlite-transform",
              transform(code, id) {
                if (code.includes("node:sqlite")) {
                  const shimPath = path
                    .resolve(__dirname, "electron/sqlite-shim.ts")
                    .replace(/\\/g, "/");
                  return code.replace(/["']node:sqlite["']/g, `"${shimPath}"`);
                }
              },
            },
          ],
          resolve: {
            alias: {
              "node:sqlite": path.resolve(__dirname, "electron/sqlite-shim.ts"),
            },
          },
          build: {
            emptyOutDir: true,
            rollupOptions: {
              external: (source) => {
                if (source === "electron" || source === "better-sqlite3") {
                  return true;
                }
                if (source === "node:sqlite") {
                  return false;
                }
                if (source.startsWith("node:")) {
                  return true;
                }
                return false;
              },
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
        vite: {
          build: {
            emptyOutDir: true,
          },
        },
      },
      // Polyfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === "test"
          ? // Disable renderer polyfills in test mode to avoid conflicts with Vitest
            // See: https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
            undefined
          : {}, // Enable polyfills for dev/prod (empty object = default settings)
    }),
  ],
  // Path alias for @ imports (shadcn convention)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "node:sqlite": "better-sqlite3",
    },
  },
});
