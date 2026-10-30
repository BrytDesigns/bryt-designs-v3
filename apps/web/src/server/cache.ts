// Page caching at Cloudflare's edge (Workers Caching): which responses it may
// store, and for how long. It's opt-in. A page route sets `info: { cache: "page" }`,
// an API-style route sets its own headers with `withCachePolicy`, and every other
// response leaves with `no-store`, because once caching is on Cloudflare stores
// a 200 that has no header for 2 hours. See docs/adr/0002-page-caching.md.
import type { RouteInfo } from "@solidjs/router";
import { Duration, Effect, Schema } from "effect";

import type { SolidEvent } from "./runtime";

export const CachePolicy = Schema.Literals(["page", "upload", "no-store"]);
export type CachePolicy = typeof CachePolicy.Type;

declare module "@solidjs/router" {
  interface RouteInfo {
    /** Opts the page, or every page under a layout, into the edge cache. */
    cache?: "page";
  }
}

// Refresh is by timer only: a page is fresh for 10 minutes, then served stale
// for up to a day while Cloudflare re-renders it in the background.
const PAGE_FRESH = Duration.minutes(10);
const PAGE_STALE = Duration.days(1);
// A 404 gets no stale serving, so a post published at a URL someone already
// tried shows within 10 minutes.
const NOT_FOUND = Duration.minutes(10);
// WordPress gives a changed upload a new file name. Each deploy empties the edge cache.
const UPLOAD_EDGE = Duration.days(365);
const UPLOAD_BROWSER = Duration.weeks(1);

const seconds = (duration: Duration.Duration) => Math.floor(Duration.toSeconds(duration));

/**
 * The cache headers for a response with `status`. Edge lifetimes go in
 * CDN-Cache-Control, which Workers Caching reads before Cache-Control and
 * browsers ignore, so a browser always checks back for a page. Neither header
 * carries `must-revalidate` or `s-maxage`: both turn off serving stale copies.
 * Only a 200 or a 404 is ever stored.
 */
export function cacheHeaders(policy: CachePolicy, status: number): Record<string, string> {
  if (policy === "no-store" || (status !== 200 && status !== 404)) {
    return { "cache-control": "no-store" };
  }
  if (status === 404) {
    return { "cache-control": "public, max-age=0", "cdn-cache-control": `max-age=${seconds(NOT_FOUND)}` };
  }
  if (policy === "page") {
    return {
      "cache-control": "public, max-age=0",
      "cdn-cache-control": `max-age=${seconds(PAGE_FRESH)}, stale-while-revalidate=${seconds(PAGE_STALE)}`,
    };
  }
  return {
    "cache-control": `public, max-age=${seconds(UPLOAD_BROWSER)}`,
    "cdn-cache-control": `max-age=${seconds(UPLOAD_EDGE)}`,
  };
}

/**
 * Sets `response`'s cache headers for `policy` and returns it. A response that
 * sets a cookie is never stored. Its headers must be mutable: copy a `fetch()`
 * response with `new Response(body, response)` first.
 */
export function withCachePolicy(response: Response, policy: CachePolicy): Response {
  const headers = cacheHeaders(response.headers.has("set-cookie") ? "no-store" : policy, response.status);
  response.headers.delete("cdn-cache-control");
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  return response;
}

export interface CacheRoutes {
  /** True when an API route (not a page) answers `path` for `method`. */
  readonly isAPI: (path: string, method: string) => boolean;
  /** The page routes `path` matches, root to leaf. */
  readonly matchPage: (path: string) => ReadonlyArray<{ readonly info?: RouteInfo | undefined }>;
}

/**
 * The cache middleware, for `middleware(...)` in runtime.ts. It goes first in
 * the chain, so every response passes through it.
 *
 * An opted-in page renders as one complete document for every visitor: the
 * cache key ignores User-Agent, so a cached stream would otherwise reach
 * crawlers, and on a hit nobody waits for the render anyway.
 */
export const handleCache =
  (routes: CacheRoutes) =>
  (next: Effect.Effect<Response>, event: SolidEvent): Effect.Effect<Response> =>
    Effect.gen(function* () {
      const policy = pagePolicy(routes, event.request);
      if (policy) {
        yield* Effect.sync(() => {
          event.renderMode = "async";
        });
      }
      const response = yield* next;
      return yield* Effect.sync(() => finalize(response, policy));
    });

// The policy of the page a GET or HEAD renders: the deepest matched route that
// names one, so a layout can opt in every page under it.
function pagePolicy(routes: CacheRoutes, request: Request): "page" | undefined {
  if (request.method !== "GET" && request.method !== "HEAD") return undefined;
  const { pathname } = new URL(request.url);
  if (routes.isAPI(pathname, request.method)) return undefined;
  return routes.matchPage(pathname).findLast((match) => match.info?.cache)?.info?.cache;
}

function finalize(response: Response, policy: "page" | undefined): Response {
  if (response.headers.has("set-cookie")) return withCachePolicy(response, "no-store");
  // Only the page's own HTML: a server function answering a GET under the same path isn't the page.
  if (policy && response.headers.get("content-type")?.startsWith("text/html")) {
    return withCachePolicy(response, policy);
  }
  // An API-style route that chose its own policy.
  if (response.headers.has("cache-control")) return response;
  return withCachePolicy(response, "no-store");
}
