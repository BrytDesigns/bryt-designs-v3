import { defineConfig } from "@effect/graphql-generator/Config";

// `pnpm codegen` writes a typed `.graphql.ts` next to each document, checked
// against the schema that `pnpm schema:pull` saves. Commit the generated files.
export default defineConfig({
  schema: "./src/schema.graphql",
  documents: ["src/**/*.graphql"],
});
