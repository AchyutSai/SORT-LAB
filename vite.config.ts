// Vite configuration for SortLab Benchmark Studio (TanStack Start + Nitro)
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // Order matters: tanstackStart() must come before viteReact().
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts
      // (our SSR error wrapper).
      start: { entry: "./src/server.ts" },
    }),
    tailwindcss(),
    tsConfigPaths(),
    viteReact(),
    // Builds the server output; auto-detects Vercel, Netlify, or NITRO_PRESET
    nitro({
      preset:
        process.env.NITRO_PRESET ||
        (process.env.VERCEL ? "vercel" : process.env.NETLIFY ? "netlify" : undefined),
    }),
  ],
});