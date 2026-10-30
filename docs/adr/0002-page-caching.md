# 2. Pages are cached at Cloudflare's edge with Workers Caching

**Status:** Accepted · **Date:** 2026-10-29

## Context

The site is one Cloudflare Worker that renders every request, and the Insights pages wait on the GoDaddy WordPress host. The old Next.js site refreshed pages on a timer (`revalidate`): posts and sitemaps every 10 minutes, archives daily. WordPress never notified it.

[Workers Caching](https://developers.cloudflare.com/workers/cache/) caches a Worker's own responses in front of it, driven by the response headers:
- It serves a stale copy while it re-invokes the Worker in the background (`stale-while-revalidate`).
- It never stores a response with `Set-Cookie`, `private` or `no-store`.
- It keeps serving the last good copy while the Worker fails.
- It's tiered, and purges apply everywhere.

The Workers Cache API, by contrast, is local to each data center.

## Decision

- **Workers Caching**, with `cache: { enabled: true }` in `alchemy.run.ts`. The cache belongs to one Worker version, so every deploy starts empty.
- **Refresh by timer only.** A change shows within about 10 minutes: no webhook, no purge calls.
- **Opt-in.** A page route sets `info: { cache: "page" }`, and a layout's opt-in covers the pages under it. An API-style route sets its own headers with `withCachePolicy`. Everything else leaves with `no-store`, because once caching is on, Cloudflare stores a `200` that has no header for 2 hours.
- **Policies** (`apps/web/src/server/cache.ts`):

  | Policy | For | Edge (`CDN-Cache-Control`) | Browser (`Cache-Control`) |
  |---|---|---|---|
  | `page` | every public page | fresh 10 min, then served stale up to 1 day | `public, max-age=0` |
  | `upload` | proxied WordPress files | 1 year | 1 week |
  | `no-store` | everything else | `no-store` | `no-store` |

  Only a `200` or a `404` is stored. A `404` stays 10 minutes with no stale serving, so a post published at a URL someone already tried shows within 10 minutes. A response that sets a cookie is never stored. No header carries `must-revalidate` or `s-maxage`, since both turn off stale serving.
- **Cached pages render as one complete document** for every visitor (`renderMode = "async"`). The cache key ignores User-Agent, so a cached stream would otherwise reach crawlers with only its `<Loading>` fallbacks. On a hit, nobody waits for the render anyway. Uncached responses still stream.
- **The cache middleware goes first in the chain**, so every response passes through it. It identifies API routes with the API matcher before matching pages, because the catch-all 404 page matches every path.
- **Workers Paid.** With caching on, every request is billed at the standard rate, cache hits and static files included. Hits use no CPU.

## Considered

- **ISR built by hand** on the Workers Cache API or KV with `waitUntil`: the Cache API is per data center, KV is eventually consistent, and either is code to own.
- **A WordPress webhook with purge by tag**: it needs a WordPress plugin, a shared secret and a route, and purges are limited to 5 a minute. The old site managed on a timer. It becomes its own issue if editors need posts faster.
- **Keeping the cache across deploys** (`crossVersionCache`): a deploy that changes a page or the layout would keep serving the old HTML until its timer runs out.
- **A separate policy for pages that only change on deploy**: a page labelled that way that reads its SEO from WordPress would serve stale metadata until the next deploy.
- **Caching WordPress data, or switching queries to `GET`**: pages are already cached, and GoDaddy's CDN caches `GET` GraphQL responses for 31 days with no purge we control.

## Consequences

- A new page isn't cached until it opts in, and a page that varies per visitor must never opt in.
- None of this runs in `pnpm dev`, which is Node. The staging deploy (#3) has to confirm two things the docs imply but don't state:
  - that Workers Caching covers `workers.dev`, falling back to a staging subdomain after #9
  - that stale serving holds when `CDN-Cache-Control` and the browser's `Cache-Control` differ
- The cache key includes the query string, so links with `utm_*`, `fbclid` or `gclid` miss the cache. A miss costs what every page cost before. Revisit when DNS moves (#9).
- Draft previews would need their own route that's never cached.
