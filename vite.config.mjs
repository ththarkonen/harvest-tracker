import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:5173"
    }
  },
  preview: {
    host: "127.0.0.1",
    port: 4173
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("plotly.js-dist-min")) {
            return "plotly";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
          return undefined;
        }
      }
    }
  }
});
