# 3. All server code is Effect, run on one shared runtime

**Status:** Accepted · **Date:** 2026-10-29

## Context

Packages such as `@repo/wordpress` expose Effect services and layers, but nothing in `apps/web` could run them: the app's server code was plain async functions (session helpers over `getRequestEvent()`, a one-line health route). Page caching (#11) and the Insights routes (#8) both add server code, so how it's written had to be settled first.

## Decision

- **All server code is Effect v4.** Middleware, API routes, server functions and route preloads are Effects. Helpers return Effects, Layers or plain values and never run them; Effects only run at those endpoints.
- **One runtime per Worker isolate.** `apps/web/src/server/runtime.ts` builds a `ManagedRuntime` from `AppLayer` at module level. An isolate keeps module state between requests, so the layers build on the first request and every later one reuses them.
- **The request is a service.** `RequestEvent` in `@repo/core/request` holds the request, the response head and the matched route params, typed without any framework, so a service in any package can read the request. Solid's request event already has that shape, and the app provides it as-is.
- **One runner, thin framework wrappers.** `makeRequestRunner(runtime)` in `@repo/core/request` provides `RequestEvent` and runs an Effect on the runtime.
  - It only accepts Effects whose error type is `never`, so typed errors become a response inside the Effect.
  - On a defect it rejects with the original value. A `Response` thrown downstream (a redirect) passes through unchanged, and Solid's handler still answers 500 for a bug.
  - `apps/web` wraps it for Solid: `middleware(...)`, which also hands over Solid's own event for render inputs such as `renderMode`, and `apiRoute(...)`. Server-function and preload wrappers come with their first use (#8).
- **`Session` stays in the app**, as a service: its cookie, its secret and what it stores are this app's.

## Considered

- **Plain TypeScript where there's no I/O**, such as the cache middleware. One way of writing server code is easier to read and test than a rule about when Effect applies.
- **A runtime per request.** It would rebuild every layer on every request.
- **The runtime on `event.locals`.** Module scope is already shared per isolate, so locals would only carry a pointer to it.
- **`RequestEvent` in `apps/web`, typed with Solid's event.** Packages can't import from apps, so a package service that needs the request would have it passed in by hand.

## Consequences

- An Effect that can still fail doesn't typecheck at an endpoint.
- Effect code reads `RequestEvent`; `getRequestEvent()` is left to framework glue.
- Each kind of endpoint needs a wrapper before its first use.
- Endpoint Effects are tested over a test runtime (`makeEndpoints`), or with `RequestEvent` provided directly, without a server.
