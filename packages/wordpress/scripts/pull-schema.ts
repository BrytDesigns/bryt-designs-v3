// Writes src/schema.graphql from the live WPGraphQL endpoint. graphqlgen checks
// every operation in src/*.graphql against it, so pull again (`pnpm schema:pull`)
// when a WordPress plugin update changes the schema, such as new ACF fields.
import { writeFile } from "node:fs/promises";
import { buildClientSchema, getIntrospectionQuery, printSchema } from "graphql";

const url = process.env.WORDPRESS_GRAPHQL_URL;
if (!url) {
  throw new Error("Set WORDPRESS_GRAPHQL_URL, in the repo root .env or the shell, to the WPGraphQL endpoint.");
}

const response = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query: getIntrospectionQuery() }),
});
if (!response.ok) throw new Error(`Introspection failed: HTTP ${response.status}`);

const { data, errors } = await response.json();
if (errors) throw new Error(`Introspection failed: ${JSON.stringify(errors)}`);

await writeFile(new URL("../src/schema.graphql", import.meta.url), `${printSchema(buildClientSchema(data))}\n`);
