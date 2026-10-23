import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Placement Tracker",
        short_name: "Placement",
        description: "Track your placement drives.",
        display: "standalone",
        start_url: "/",
        scope: "/",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    headers: {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.protect.clerk.com",
        "connect-src 'self' ws: wss: http: https: https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://*.clerk-telemetry.com https://*.protect.clerk.com:* https://*.supabase.co wss://*.supabase.co https://placement-tracker-yzdq.onrender.com https://*.sentry.io https://*.ingest.sentry.io",
        "img-src 'self' data: blob: https: https://img.clerk.com",
        "worker-src 'self' blob:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "frame-src 'self' https://challenges.cloudflare.com https://*.protect.clerk.com https://*.clerk.accounts.dev https://*.clerk.com",
        "form-action 'self'",
      ].join("; "),
    },
  },
});
