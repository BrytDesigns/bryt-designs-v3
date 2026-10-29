import * as v from "valibot";

// Typed env, picked up by @solidjs/vite-plugin; generated types land in solid-env.d.ts.
// `server` vars come from `virtual:env/server` (server code only) and are read from
// process.env and validated when the server boots. `client` vars need the VITE_
// prefix, come from `virtual:env/client`, and are baked into the bundle at build
// time, so they must never hold secrets.
export default {
  server: {
    // Signs the session cookie. Comma-separated, newest first; see src/server/session.ts.
    SESSION_SECRET: v.pipe(v.string(), v.minLength(32)),
  },
  client: {
    // Tag Manager container. Unset (local dev) loads no container, so no
    // traffic reaches GA4; set it for staging and production.
    VITE_GTM_ID: v.optional(v.pipe(v.string(), v.regex(/^GTM-[A-Z0-9]+$/))),
  },
};
