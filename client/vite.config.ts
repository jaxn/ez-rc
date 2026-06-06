import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// In dev, proxy the WebSocket + API to the backend so the app works from a
// single origin (and tunnels expose just one port).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "ez-rc — Race Committee",
        short_name: "ez-rc",
        description: "Set square courses with live multi-device positions.",
        theme_color: "#0b3d61",
        background_color: "#0b3d61",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell only — deliberately do NOT cache map tiles for the PoC.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/ws/, /^\/api/, /^\/replay/, /^\/healthz/],
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      "/ws": { target: "ws://localhost:8080", ws: true },
      "/api": { target: "http://localhost:8080" },
      "/replay": { target: "http://localhost:8080" },
      "/healthz": { target: "http://localhost:8080" },
    },
  },
});
