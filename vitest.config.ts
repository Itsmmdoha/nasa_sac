import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  css: false,
  test: { environment: "node", pool: "forks" },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
