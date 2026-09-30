import { defineConfig } from "nitro";

export default defineConfig({
  preset:
    process.env.NITRO_PRESET ||
    (process.env.VERCEL ? "vercel" : process.env.NETLIFY ? "netlify" : undefined),
});
