// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
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
    // Builds the server output; harmless to include in dev.
    nitro(),
  ],
});