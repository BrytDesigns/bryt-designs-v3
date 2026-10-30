import { assert, describe, it } from "@effect/vitest";
import { RequestEvent } from "@repo/core/request";
import { Effect, Layer, ManagedRuntime } from "effect";

import { makeEndpoints } from "./runtime";
import type { SolidEvent } from "./runtime";

// How the runner itself behaves (layers built once, defects, typed errors) is
// covered in @repo/core/request. These cover the Solid glue on top.
const { middleware, apiRoute } = makeEndpoints(ManagedRuntime.make(Layer.empty));

const makeEvent = (url = "https://site.example/"): SolidEvent => ({
  request: new Request(url),
  locals: {},
  response: { headers: new Headers() },
});

describe("middleware", () => {
  it("runs the rest of the chain through next and can change its response", async () => {
    const handle = middleware((next) =>
      Effect.map(next, (response) => {
        response.headers.set("x-test", "yes");
        return response;
      }),
    );
    const response = await handle(makeEvent(), async () => new Response("page"));
    assert.strictEqual(await response.text(), "page");
    assert.strictEqual(response.headers.get("x-test"), "yes");
  });

  it("hands over Solid's event, so render inputs are set before next runs", async () => {
    const handle = middleware((next, event) =>
      Effect.andThen(
        Effect.sync(() => {
          event.renderMode = "async";
        }),
        next,
      ),
    );
    const event = makeEvent();
    let modeWhenRendered: string | undefined;
    await handle(event, async () => {
      modeWhenRendered = event.renderMode;
      return new Response("page");
    });
    assert.strictEqual(modeWhenRendered, "async");
  });

  it("lets a Response thrown downstream (a redirect) through unchanged", async () => {
    const redirect = new Response(null, { status: 302, headers: { location: "/login" } });
    const handle = middleware((next) => next);
    const rejected = await Promise.resolve(handle(makeEvent(), () => Promise.reject(redirect))).then(
      () => assert.fail("expected a rejection"),
      (error: unknown) => error,
    );
    assert.strictEqual(rejected, redirect);
  });
});

describe("apiRoute", () => {
  it("answers with the Effect's response and sees the matched params", async () => {
    const handler = apiRoute(RequestEvent.useSync((event) => Response.json({ slug: event.params?.slug })));
    // The event as the API dispatcher hands it over, params written on.
    const response = await handler({ ...makeEvent("https://site.example/posts/hello"), params: { slug: "hello" } });
    assert.deepStrictEqual(await response.json(), { slug: "hello" });
  });
});
