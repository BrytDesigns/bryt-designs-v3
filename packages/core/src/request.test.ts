import { assert, describe, it } from "@effect/vitest";
import { Context, Effect, Layer, ManagedRuntime } from "effect";

import { makeRequestRunner, RequestEvent } from "./request";
import type { ServedRequest } from "./request";

// A stand-in for an app's layers that counts how often it is built.
class Builds extends Context.Service<Builds, { readonly count: number }>()("test/Builds") {}

const makeTestRunner = () => {
  let builds = 0;
  const runtime = ManagedRuntime.make(Layer.effect(Builds, Effect.sync(() => ({ count: ++builds }))));
  return { runRequest: makeRequestRunner(runtime), builds: () => builds };
};

const makeEvent = (url = "https://site.example/"): ServedRequest => ({
  request: new Request(url),
  response: { headers: new Headers() },
});

describe("makeRequestRunner", () => {
  it("builds the runtime's layers once and shares them across requests", async () => {
    const { runRequest, builds } = makeTestRunner();
    const read = Builds.useSync((b) => b.count);
    assert.strictEqual(await runRequest(read, makeEvent()), 1);
    assert.strictEqual(await runRequest(read, makeEvent()), 1);
    assert.strictEqual(builds(), 1);
  });

  it("provides each request's own event", async () => {
    const { runRequest } = makeTestRunner();
    const url = RequestEvent.useSync((event) => event.request.url);
    assert.strictEqual(await runRequest(url, makeEvent("https://site.example/a")), "https://site.example/a");
    assert.strictEqual(await runRequest(url, makeEvent("https://site.example/b")), "https://site.example/b");
  });

  it("rejects with the original value on a defect", async () => {
    const { runRequest } = makeTestRunner();
    const defect = new Error("boom");
    const rejected = await runRequest(Effect.die(defect), makeEvent()).then(
      () => assert.fail("expected a rejection"),
      (error: unknown) => error,
    );
    assert.strictEqual(rejected, defect);
  });

  it("only accepts Effects that cannot fail", () => {
    const { runRequest } = makeTestRunner();
    // @ts-expect-error a typed error has to become a response (or a value) first
    const run = () => runRequest(Effect.fail("not found"), makeEvent());
    assert.isFunction(run);
  });
});
