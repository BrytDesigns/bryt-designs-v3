# 1. Env vars are declared per package and composed per app

**Status:** Accepted · **Date:** 2026-10-29

## Context

Packages such as `@repo/wordpress` read their own env vars, and their Effect layers need them typed. gertex solved this with a custom `@gertex/env` (`createEnv` with a `runtimeEnv` map, a browser Proxy guard and an `EnvService` tag), because Next.js does none of it for you.

Here `@solidjs/vite-plugin` already does most of that work for `apps/web/env.ts`: it validates server vars at boot, refuses an import of `virtual:env/server` from client code at build time, bakes validated client values into the bundle, and generates the types of `virtual:env/*`. What it lacks is a way for packages to declare the vars they read, and a bridge into Effect.

## Decision

A thin layer in `@repo/core/env`:

- **`defineEnv(name, { server, client })`.** A package declares its vars as Effect Schemas and gets back one Effect `Config` per var, decoding through the same schema. Its layers read settings with `yield* env.config.KEY` rather than having the app pass values in. Client var names carry the `VITE_` prefix, as the plugin requires.
- **`composeEnv(...envs)`.** The app's `env.ts` passes its own vars and every package it uses, and gets the `{ server, client }` maps of Standard Schemas the plugin validates.
- **A var may be declared by several packages**, since each may genuinely need it. Boot validation checks the value against every declaration and names the package whose schema failed. `virtual:env/server` gets the value decoded by the first declaration, so the app lists its own vars first.
- **Effect Schema is the only validator.** valibot is gone.

## Considered

- **Porting `@gertex/env`.** Most of it duplicates what the plugin does, and its `runtimeEnv` map exists for Next's inlining rules.
- **The app passing values into each layer.** Every package's settings would be threaded through by hand.
- **Throwing when two packages declare a var.** A package couldn't then say that it needs a var another package also reads.

## Consequences

- Each var is validated twice, by the plugin at boot and by `Config` when a layer builds. Both are cheap and synchronous.
- A new var needs its declaration, a binding in `alchemy.run.ts`, and a line in `.env.example`.
