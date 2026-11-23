import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
// The 3D viewer is lazy-loaded; its Three.js chunk is intentionally larger.
  build: {
    chunkSizeWarningLimit: 650,
  },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": "http://127.0.0.1:5000",
    },
  },
});

