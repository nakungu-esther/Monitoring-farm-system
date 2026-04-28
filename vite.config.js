import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  /** Dev / preview: proxy /api → this origin. Default local Nest (`PORT` defaults to 5000 in main.ts); override with VITE_DEV_API_PROXY. */
  const devApiTarget = env.VITE_DEV_API_PROXY || "http://127.0.0.1:5000";

  const apiProxy = {
    "/api": {
      target: devApiTarget,
      changeOrigin: true,
    },
  };

  const plugins = [react(), tailwindcss()];

  try {
    const { VitePWA } = await import("vite-plugin-pwa");
    plugins.push(
      VitePWA({
        registerType: "autoUpdate",
        /** Never register Workbox during `vite` dev — avoids stale bundles mistaken for “HMR broken”. */
        devOptions: {
          enabled: false,
        },
        includeAssets: ["logo.png"],
        manifest: {
          name: "AgriTrack — Farm to payment",
          short_name: "AgriTrack",
          description: "Harvests, stock, sales, and credit — works offline on saved data.",
          theme_color: "#166534",
          background_color: "#f1f5f4",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//],
          importScripts: ["push-sw.js"],
          /** Drop old hashed chunks after deploy so updates apply cleanly. */
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
    );
  } catch {
    console.warn(
      "[agritrack] vite-plugin-pwa not found — run `npm install` for PWA/offline shell. Dev server still works.",
    );
  }

  // Dev: omit `development` export condition so Lit (via dapp-kit/wallets) resolves the production package and stops the console warning.
  const stripLitDevConditions =
    mode === "development"
      ? { conditions: ["import", "module", "browser", "default"] }
      : undefined;

  return {
    plugins,
    ...(stripLitDevConditions ? { resolve: stripLitDevConditions } : {}),
    server: {
      proxy: apiProxy,
    },
    /** `vite preview` serves the built app; without this, /api hits static HTML and you get "Cannot POST /api/...". */
    preview: {
      proxy: apiProxy,
    },
  };
});
