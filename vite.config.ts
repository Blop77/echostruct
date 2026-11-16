import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  // Relative base + single-file output: dist/index.html is one self-contained
  // file that works offline, from a USB stick, or as a chat attachment.
  base: "./",
  plugins: [viteSingleFile()],
  build: { target: "es2020" },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
