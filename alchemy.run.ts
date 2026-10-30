import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "BrytDesigns",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
    // The production stage (`pnpm run deploy`) reads .env.production and never
    // .env; every other stage, `alchemy dev` included, reads .env. Whichever file
    // a stage names must exist. Variables exported in the shell still win.
    secrets: [
      Alchemy.Secrets.DotEnv(({ stage }) => ({
        path: stage === "production" ? ".env.production" : ".env",
      })),
    ],
  },
  Effect.gen(function* () {
    // The SSR server bundle is the Worker; it renders routes and 404s itself.
    const website = yield* Cloudflare.Website.Vite("Website", {
      rootDir: "apps/web",
      // The default rebuild hash covers apps/web only; also rebuild when a
      // workspace package it compiles from source changes.
      memo: {
        include: ["**/*", "../../packages/*/src/**", "../../packages/*/package.json"],
        lockfile: true,
      },
      // The server reads these from process.env at boot (see apps/web/env.ts).
      env: {
        SESSION_SECRET: Config.Redacted("SESSION_SECRET"),
        // Not a secret, but any Config binds as one.
        WORDPRESS_GRAPHQL_URL: Config.String("WORDPRESS_GRAPHQL_URL"),
        // The stage's own URL: its first custom domain, else its workers.dev URL.
        // Production needs www.brytdesigns.com listed first when domains attach (#9).
        SITE_URL: Cloudflare.Worker.URL,
      },
    });

    return {
      url: website.url,
    };
  }),
);
