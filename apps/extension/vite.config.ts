import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import manifest from "./src/manifest.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
      "@background": resolve(__dirname, "src/background"),
      "@storage": resolve(__dirname, "src/storage"),
      "@popup": resolve(__dirname, "src/popup"),
      "@options": resolve(__dirname, "src/options"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        options: resolve(__dirname, "options.html"),
      },
    },
  },
});
