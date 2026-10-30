## Agent skills

### Issue tracker

GitHub Issues (`BrytDesigns/bryt-designs-v3`) via `gh`. Every issue also gets a short Asana task in the Bryt Designs project that links back to it. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the root plus `docs/adr/`. See `docs/agents/domain.md`.

## Required tooling

Everyone working in this repo with Claude needs all of these. A SessionStart hook warns when `gh`, `node_modules` or `.env` is missing.

- **GitHub CLI**, logged in (`gh auth login`). Issues live in GitHub.
- **Asana MCP**, connected through the claude.ai Asana connector or your own Asana MCP app (Asana doesn't allow a shared one). Every issue gets an Asana task, so if no Asana tools are available, stop and ask the user to connect Asana before creating issues.
- **Figma MCP**, from the `figma` plugin enabled in `.claude/settings.json`. Sign in to Figma when first prompted.
- **`pnpm install`**, so the skills in `.claude/skills/` that link into `node_modules` resolve.
- **`.env`** at the repo root, copied from `.env.example` with `SESSION_SECRET` set. The server refuses to start without it. Vite and Alchemy both read it; see **Env vars** below.

## Monorepo

pnpm workspaces, no Turborepo. Two folders, packages scoped `@repo/*`:

- **`apps/`**: deployable apps. `apps/web` (`@repo/web`) is the marketing site.
- **`packages/`**: utility libraries and services the apps share.
  - `core`: Effect utilities and services: `@repo/core/env` (per-package env vars) and `@repo/core/request` (the request as a service, and the runner every endpoint goes through). Imports no UI code.
  - `design-system`: base styles, the Tailwind setup and brand tokens (`@repo/design-system/styles.css`).
  - `ui`: Kobalte components styled with the design system, one entry per component (`@repo/ui/button`).
  - `wordpress`: the WordPress GraphQL client the Insights pages read. Operations live in `src/queries.graphql`; `pnpm --filter @repo/wordpress codegen` regenerates the typed `.graphql.ts` beside it (committed, never edited), and `schema:pull` refreshes `src/schema.graphql`, which codegen checks them against.
  - `analytics`: the Tag Manager container loader and a typed `track()`. Tags, triggers and conversions live in Tag Manager, not in code.

Packages ship TypeScript source with no build step; the app's Vite build compiles them. Imports only flow from apps into packages, and from `ui` into `design-system` or `core`; `core` never imports UI code. A package that uses Tailwind classes exports a `styles.css` holding `@source "./"`, which the app imports after the design system's (see `apps/web/src/index.css`).

Add a dependency to the workspace that imports it (`pnpm --filter @repo/ui add <pkg>`). A version shared by several workspaces goes in the `catalog` in `pnpm-workspace.yaml` and is referenced as `"catalog:"`. Root scripts (`pnpm dev`, `build`, `typecheck`, `lint`, `test`) cover every workspace.

## Env vars

A package declares the vars it reads with `defineEnv` from `@repo/core/env` (see `packages/wordpress/src/env.ts`), and its Effect layers read them through the matching `config` entries. `apps/web/env.ts` passes its own vars first, then every package it uses, to `composeEnv`; the Solid plugin validates the result at boot and types `virtual:env/server` and `virtual:env/client` from it. Several packages may declare the same var: it's checked against each. A new var also needs a binding in `alchemy.run.ts` and a line in `.env.example`. See `docs/adr/0001-env-composition.md`.

## Caching

Cloudflare caches pages at its edge (Workers Caching): fresh for 10 minutes, then served stale for up to a day while it re-renders. A page opts in with `export const route = { info: { cache: "page" } }`, and a layout's opt-in covers the pages under it. An API-style route sets its own headers with `withCachePolicy` from `apps/web/src/server/cache.ts`. Everything else leaves with `no-store`. Never opt in a page that varies per visitor. See `docs/adr/0002-page-caching.md`.

## Figma

The root design file is [Bryt Designs v3 (2026)](https://www.figma.com/design/f8OmlqSvL0d4JhS4BNA6Dd/Bryt-Designs-v3--2026-?node-id=0-1): file key `f8OmlqSvL0d4JhS4BNA6Dd`, root node `0:1`. Reference it for every design, component, token or layout question, and start Figma MCP sessions with this file key unless the user links a different file. A node link into this file only narrows where to look.

## Effect

This repository uses the Effect Typescript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md`
**completely**, and follow the links in the file when required.

If you need to learn more about particular Effect apis and concepts that the
guide doesn't cover, search through the source code in `node_modules/effect/src`.

All server code is Effect v4. Middleware, API routes, server functions and
route preloads run as Effects on the shared runtime in
`apps/web/src/server/runtime.ts`, through its helpers. Helpers return Effects,
Layers or plain values and never run them. A service that needs the request
reads `RequestEvent` from `@repo/core/request`, not `getRequestEvent()`. See
`docs/adr/0003-effect-server-runtime.md`.

## Alchemy

Infrastructure is Alchemy v2 (`alchemy` and `@alchemy.run/cloudflare` at 2.0.0-beta.84), not v1's `await alchemy(...)`. Use the `alchemy` skill before changing `alchemy.run.ts`, which lives at the root and deploys `apps/web` through `rootDir`. The installed source in `node_modules/alchemy/src` and `node_modules/@alchemy.run/cloudflare/src` wins over the skill and over the docs (https://alchemy.run/llms.txt).

Production is the `production` stage, deployed with `pnpm run deploy` (plain `pnpm deploy` is a pnpm built-in). That stage reads secrets from `.env.production` only, which comes from the team password manager; every other stage reads `.env`. Never deploy to `production` without the user asking.

## Solid 2.0

<!-- BEGIN solid-2.0-primer -->
<!-- Copied from node_modules/solid-js/skills/solid-2.0/SKILL.md (solid-js 2.0.0-rc.19) minus its frontmatter, as the Solid v2 templates do. Re-copy it when upgrading solid-js. -->

# Solid 2.0 for agents

Solid is not React, and 2.0 is not 1.x. Pattern-matching from either is the
dominant bug source. Every name below is a `solid-js` export unless noted;
DOM APIs (`render`, `hydrate`, `Portal`, `dynamic`) are in `@solidjs/web`.

## Three rules

1. **Props are read, not destructured; pass values, not accessors.**
   - Wrong: `function C({ name }) {}` and `<C value={count} />`
   - Right: `function C(props) { return <p>{props.name}</p>; }` and `<C value={count()} />`
2. **`createEffect` takes two functions: compute (tracks), then apply (side effects).**
   - Wrong: `createEffect(() => { el.title = count(); });`
   - Right: `createEffect(() => count(), v => { el.title = v; });`
3. **Stores are written through the draft.**
   - Wrong: `setStore("user", "name", "B")` or `setStore(produce(s => ...))`
   - Right: `setStore(s => { s.user.name = "B"; });`

## 1.x → 2.0 corrections

Nothing in the left column exists in 2.0.

| Wrong (1.x)                                    | Right (2.0)                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `import { createStore } from "solid-js/store"` | `import { createStore } from "solid-js"`                          |
| `import { render } from "solid-js/web"`        | `import { render } from "@solidjs/web"`                           |
| `"jsxImportSource": "solid-js"`                | `"jsxImportSource": "@solidjs/web"`                               |
| `createEffect(fn)` (one argument)              | `createEffect(compute, apply)`                                    |
| `onMount(fn)`                                  | `onSettled(() => { setup(); return cleanup; })`                   |
| `createEffect(on(dep, fn))`                    | `createEffect(() => dep(), v => fn(v))`                           |
| `const [d] = createResource(id, fetchX)`       | `const d = createMemo(() => fetchX(id()))` under `<Loading>`      |
| `d.loading` / `d.error`                        | `<Loading>` or `isPending(() => d())` / `<Errored>`               |
| `refetch()`                                    | `refresh(d)` (`affects(d); refresh(d)` to read as pending)        |
| `<Suspense>` / `<SuspenseList>`                | `<Loading>` / `<Reveal>`                                          |
| `<ErrorBoundary>`                              | `<Errored fallback={(err, reset) => ...}>` (heals automatically)  |
| `<Index each={xs}>`                            | `<For each={xs} keyed={false}>`                                   |
| `batch(fn)`                                    | not needed: updates batch per microtask; `flush()` applies now    |
| `startTransition` / `useTransition`            | built-in transitions: `action(...)`, `isPending`, optimistic APIs |
| `createComputed`                               | `createMemo`, split `createEffect`, or `createSignal(fn)`         |
| `mergeProps` / `splitProps` / `unwrap`         | `merge` / `omit` / `snapshot`                                     |
| `produce`, `createMutable`, `modifyMutable`    | draft setters are the default in `createStore`                    |
| `createSelector`                               | `createProjection` (or `createStore(fn)`)                         |
| `<Ctx.Provider value={v}>`                     | `<Ctx value={v}>`                                                 |
| `classList={{ a: x() }}`                       | `class={{ a: x() }}` or `class={["base", { a: x() }]}`            |
| `use:dir={x}` / `attr:` / `on:` / `tabIndex`   | `ref={dir(x)}` / plain attributes / `onClick` / `tabindex`        |
| `onError` / `catchError`                       | `<Errored>` or `createEffect(c, { effect, error })`               |
| `from(source)` / `observable`                  | `createMemo(() => from(source))`; push out with `createEffect`    |

Also:

- Reads lag writes: `setX(1); x()` still returns the old value until the
  microtask or `flush()`. In tests, `flush()` before asserting.
- Effects never compare: when the compute re-runs, apply and the previous
  cleanup run again even if compute returned an equal value. To skip work on
  an unchanged value, read a memo in the compute:
  `const active = createMemo(() => status() === "active"); createEffect(() => active(), v => ...)`.
  The memo's `equals` (default `===`) stops the re-run.
- No writes inside a memo, effect compute, or component body (dev throws).
  Write from event handlers, `onSettled`, or actions.
- No reactive reads at the top of a component body; read in JSX, a memo, or
  `untrack`. Flow callbacks (`<For>`, `<Show>`, `<Match>`) are owners, not
  tracking scopes: read their accessor arguments in JSX, not at the top.
- `<For>`: default gives a raw item and an index accessor; `keyed={false}`
  gives an item accessor and a plain number. `<Repeat>`: `i` is a number.
- `onClick={cond() ? a : b}` binds once; decide inside a stable handler.
- `on:`, `oncapture:`, `attr:`, `bool:`, `use:` and `classList` on a native
  element are compile errors; the message names the replacement above.
- Inputs aren't strictly controlled: `value={x()}` writes only when the
  binding re-runs — and a change to any other dynamic attribute in the same
  template re-runs it (dev warns `UNCOMMITTED_INPUT_OVERWRITTEN` when that
  erases typed text). Keep typing in a draft signal (`onInput`), commit on
  `onChange`/submit; when a handler rejects input, also set
  `e.currentTarget.value = next` (an unchanged signal won't revert the DOM).

## Primitives to reach for

| Primitive                                                          | Use                                                                                     |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `createSignal(0)` / `createSignal(() => fetchUser(id()))`          | plain signal / writable derived value, sync or async; read by calling it                |
| `createMemo(() => fetchX(id()))`                                   | read-only derived value; a Promise result is pending until it lands                     |
| `createProjection(async () => api.list(), [], { key: "id" })`      | read-only derived store with keyed reconciliation                                       |
| `createOptimisticStore(() => api.list(), [])`                      | store whose optimistic writes revert when the transition settles                        |
| `action(function* (x) { write(); yield api.put(x); refresh(d); })` | mutation with transition coordination; optimistic writes go inside                      |
| `until(() => confirmed(), { timeout })`                            | Promise that resolves when a predicate turns truthy; `yield` it in an action            |
| `isPending(() => d())`                                             | true while a change to `d` is in flight (input changed or `affects()` declared)         |
| `latest(d)`                                                        | peek at the in-flight value during a transition                                         |
| `refresh(d)`                                                       | re-ask the source after a server write; quiet unless preceded by `affects(d)`           |
| `<Loading on={id()}>` `<Errored>` `<Reveal>` `<Repeat>` `<For>`    | async boundary (`on` re-arms it), error boundary, sibling order, range list, keyed list |

## Pointers

- Full reference: `node_modules/solid-js/CHEATSHEET.md`; the same text is
  the `solid-2.0-cheatsheet` skill in `node_modules/solid-js/skills/`.
- Diagnostics: dev builds print `[CODE] message` plus an `in <App> › …`
  owner line and, when the build wrote source locations, an
  `at src/App.tsx:18:3` line. The first report of each code ends with a
  footer: the code's docs page, then
  `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`, one section
  per code (`STRICT_READ_UNTRACKED`, `REACTIVE_WRITE_IN_OWNED_SCOPE`,
  `LOADING_ON_OUTSIDE_HOLD`, …). Fix the cause; never suppress a code.
- Evidence loops: `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md`
  (`captureArtifact`). With `@solidjs/vite-plugin`'s `diagnostics` option the
  dev server answers `POST /__solid/diagnostics` (`begin`, `active`, `whyDidRun`,
  `costs`, `end`).
- Lint: `eslint-plugin-solid`, config `v2`
  (`import solid from "eslint-plugin-solid/configs/v2"`) or `v2-strict`.
- Docs: https://v2.solidjs.com (Solid 2.0 docs; `/llms.txt` and
  `/llms-full.txt` for agents). Migration guide: `documentation/solid-2.0/MIGRATION.md`
  in the repository.

<!-- END solid-2.0-primer -->
