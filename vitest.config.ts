import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Several pages render the whole shell and the recommendation engine; on a
    // loaded machine a render can take longer than Vitest's 5 s default.
    testTimeout: 15000,
    // A worker per core runs a jsdom copy of the app each, which starves this
    // machine's memory and makes a slow test time out. Four workers still run
    // the whole suite in under a minute, so the cap costs nothing.
    maxWorkers: 4,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
