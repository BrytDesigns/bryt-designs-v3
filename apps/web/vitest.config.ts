import { defineConfig } from "vitest/config";

// Kept apart from vite.config.ts so tests load without the Solid start plugin:
// they cover server code, which is plain TypeScript and Effect.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
