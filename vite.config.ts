import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "filesystem-routing/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    solid({
      start: { middleware: "./src/middleware.ts" },
      ssr: true,
      diagnostics: true,
      serverFunctions: { components: true, configure: "./src/server-config.ts" },
      // Also compile the `?pick=` route modules that fileRoutes emits.
      extensions: [".jsx", ".tsx"],
    }),
    // `httpMethods` picks up GET/POST/... exports in route modules as API routes.
    fileRoutes({ httpMethods: true, types: true }),
    tailwindcss(),
  ],
  build: {
    target: "esnext",
    assetsInlineLimit: 0,
  },
});
