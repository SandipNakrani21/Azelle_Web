import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The Node API (server/) runs on :4000; the dev server forwards API and upload requests to it.
const apiProxy = {
  "/api": "http://localhost:4000",
  "/uploads": "http://localhost:4000",
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
    // The API lives in server/ — don't watch it (uploads being written there crashed the watcher on Windows).
    watch: { ignored: ["**/server/**"] },
  },
  preview: { proxy: apiProxy },
});
