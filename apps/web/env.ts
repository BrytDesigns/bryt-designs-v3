import { composeEnv, defineEnv } from "@repo/core/env";
import { wordpressEnv } from "@repo/wordpress/env";
import { Schema } from "effect";

// Typed env, picked up by @solidjs/vite-plugin; generated types land in solid-env.d.ts.
// `server` vars come from `virtual:env/server` (server code only) and are read from
// process.env and validated when the server boots. `client` vars need the VITE_
// prefix, come from `virtual:env/client`, and are baked into the bundle at build
// time, so they must never hold secrets.
//
// Packages declare the vars they read; list each package the app uses after the
// app's own vars. A var several declare is checked against every declaration, and
// the first one decides its type here. See docs/adr/0001-env-composition.md.
export default composeEnv(
  defineEnv("@repo/web", {
    server: {
      // Signs the session cookie. Comma-separated, newest first; see src/server/session.ts.
      SESSION_SECRET: Schema.String.check(Schema.isMinLength(32)),
    },
    client: {
      // Tag Manager container, passed to @repo/analytics by Document.tsx. Unset
      // (local dev) loads no container, so no traffic reaches GA4; set it for
      // staging and production.
      VITE_GTM_ID: Schema.UndefinedOr(Schema.String.check(Schema.isPattern(/^GTM-[A-Z0-9]+$/))),
    },
  }),
  wordpressEnv,
);
