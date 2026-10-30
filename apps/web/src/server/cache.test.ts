import { assert, describe, it } from "@effect/vitest";
import { Layer, ManagedRuntime } from "effect";

import { cacheHeaders, handleCache, withCachePolicy } from "./cache";
import type { CacheRoutes } from "./cache";
import { makeEndpoints } from "./runtime";
import type { SolidEvent } from "./runtime";

const PAGE = { "cache-control": "public, max-age=0", "cdn-cache-control": "max-age=600, stale-while-revalidate=86400" };
const NOT_FOUND = { "cache-control": "public, max-age=0", "cdn-cache-control": "max-age=600" };
const NO_STORE = { "cache-control": "no-store" };

describe("cacheHeaders", () => {
  it("keeps a page fresh at the edge for 10 minutes, then stale for a day, never in browsers", () => {
    assert.deepStrictEqual(cacheHeaders("page", 200), PAGE);
  });

  it("keeps an upload a year at the edge and a week in browsers", () => {
    assert.deepStrictEqual(cacheHeaders("upload", 200), {
      "cache-control": "public, max-age=604800",
      "cdn-cache-control": "max-age=31536000",
    });
  });

  it("keeps a 404 for 10 minutes with no stale serving", () => {
    assert.deepStrictEqual(cacheHeaders("page", 404), NOT_FOUND);
    assert.deepStrictEqual(cacheHeaders("upload", 404), NOT_FOUND);
  });

  it("stores nothing but a 200 or a 404", () => {
    for (const status of [201, 301, 302, 304, 400, 500, 503]) {
      assert.deepStrictEqual(cacheHeaders("page", status), NO_STORE);
    }
    assert.deepStrictEqual(cacheHeaders("no-store", 200), NO_STORE);
  });
});

describe("withCachePolicy", () => {
  it("never stores a response that sets a cookie", () => {
    const response = new Response("ok", { headers: { "set-cookie": "session=x", "cdn-cache-control": "max-age=60" } });
    withCachePolicy(response, "page");
    assert.strictEqual(response.headers.get("cache-control"), "no-store");
    assert.isNull(response.headers.get("cdn-cache-control"));
  });
});

describe("handleCache", () => {
  const { middleware } = makeEndpoints(ManagedRuntime.make(Layer.empty));

  // `/` and everything under `/insights` opt in, the latter through its layout;
  // `/about` doesn't. Any other path, `/api/*` included, falls to the catch-all
  // 404 page, which opts in, as in the app; `/api/*` is also an API route.
  const routes: CacheRoutes = {
    isAPI: (path) => path.startsWith("/api/"),
    matchPage: (path) =>
      path.startsWith("/insights")
        ? [{ info: { cache: "page" } }, {}]
        : path === "/about"
          ? [{}]
          : [{ info: { cache: "page" } }],
  };
  const handle = middleware(handleCache(routes));

  const html = (status = 200, headers: Record<string, string> = {}) =>
    new Response("<!DOCTYPE html>", { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } });

  // Serves `path` through the middleware, with `respond` standing in for the
  // rest of the chain. Returns the response and the render mode `respond` saw.
  const serve = async (path: string, respond: () => Response, method = "GET") => {
    const event: SolidEvent = {
      request: new Request(`https://site.example${path}`, { method }),
      locals: {},
      response: { headers: new Headers() },
    };
    let renderMode: string | undefined;
    const response = await handle(event, async () => {
      renderMode = event.renderMode;
      return respond();
    });
    return { response, renderMode };
  };

  const cacheHeadersOf = (response: Response) =>
    Object.fromEntries([...response.headers].filter(([name]) => name.endsWith("cache-control")));

  it("gives a page that doesn't opt in no-store, and leaves it streaming", async () => {
    const { response, renderMode } = await serve("/about", () => html());
    assert.deepStrictEqual(cacheHeadersOf(response), NO_STORE);
    assert.isUndefined(renderMode);
  });

  it("renders an opted-in page as one document and gives it the page headers", async () => {
    const { response, renderMode } = await serve("/", () => html());
    assert.strictEqual(renderMode, "async");
    assert.deepStrictEqual(cacheHeadersOf(response), PAGE);
  });

  it("lets a layout opt in every page under it", async () => {
    const { response, renderMode } = await serve("/insights/some-post", () => html());
    assert.strictEqual(renderMode, "async");
    assert.deepStrictEqual(cacheHeadersOf(response), PAGE);
  });

  it("keeps an opted-in 404 for 10 minutes and never stores a 5xx", async () => {
    assert.deepStrictEqual(cacheHeadersOf((await serve("/insights/missing", () => html(404))).response), NOT_FOUND);
    assert.deepStrictEqual(cacheHeadersOf((await serve("/", () => html(500))).response), NO_STORE);
  });

  it("never stores a response that sets a cookie", async () => {
    const page = await serve("/", () => html(200, { "set-cookie": "session=x" }));
    assert.deepStrictEqual(cacheHeadersOf(page.response), NO_STORE);
    // An API route that chose its policy, then set a cookie after.
    const api = await serve("/api/upload", () => {
      const response = withCachePolicy(new Response("bytes"), "upload");
      response.headers.append("set-cookie", "session=x");
      return response;
    });
    assert.deepStrictEqual(cacheHeadersOf(api.response), NO_STORE);
  });

  it("keeps an API route's own policy and gives one that set none no-store", async () => {
    const upload = await serve("/api/upload", () => withCachePolicy(new Response("bytes"), "upload"));
    assert.strictEqual(upload.response.headers.get("cdn-cache-control"), "max-age=31536000");
    assert.isUndefined(upload.renderMode);
    const health = await serve("/api/health", () => Response.json({ ok: true }));
    assert.deepStrictEqual(cacheHeadersOf(health.response), NO_STORE);
  });

  it("gives anything but the page's own HTML no-store, such as a server function call", async () => {
    const post = await serve("/", () => Response.json({ ok: true }), "POST");
    assert.deepStrictEqual(cacheHeadersOf(post.response), NO_STORE);
    assert.isUndefined(post.renderMode);
    const get = await serve("/", () => Response.json({ ok: true }));
    assert.deepStrictEqual(cacheHeadersOf(get.response), NO_STORE);
  });
});
