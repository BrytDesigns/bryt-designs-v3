import { assert, describe, it } from "@effect/vitest";
import { RequestEvent } from "@repo/core/request";
import { ConfigProvider, Duration, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { Session } from "./Session";

const layer = Session.layer.pipe(
  Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ SESSION_SECRET: "s".repeat(32) }))),
);

const makeEvent = (cookie?: string): RequestEvent["Service"] => ({
  request: new Request("https://site.example/", cookie === undefined ? {} : { headers: { cookie } }),
  response: { headers: new Headers() },
});

// Runs `effect` as the request `event`.
const as = <A, E, R>(event: RequestEvent["Service"], effect: Effect.Effect<A, E, R>) =>
  Effect.provideService(effect, RequestEvent, event);

// Signs a session in one request and returns the cookie the browser would send back.
const signIn = Effect.gen(function* () {
  const session = yield* Session;
  const event = makeEvent();
  yield* as(event, session.set({}));
  const setCookie = event.response.headers.get("set-cookie");
  assert.isNotNull(setCookie);
  return setCookie!.split(";")[0]!;
});

describe("Session", () => {
  it.effect("reads back a session set in an earlier request", () =>
    Effect.gen(function* () {
      const cookie = yield* signIn;
      const read = yield* as(makeEvent(cookie), Session.use((s) => s.get));
      assert.deepStrictEqual(read, Option.some({}));
    }).pipe(Effect.provide(layer)),
  );

  it.effect("is none without a cookie", () =>
    Effect.gen(function* () {
      const session = yield* Session;
      assert.isTrue(Option.isNone(yield* as(makeEvent(), session.get)));
    }).pipe(Effect.provide(layer)),
  );

  it.effect("is none when the cookie was tampered with", () =>
    Effect.gen(function* () {
      const session = yield* Session;
      const cookie = yield* signIn;
      const [name, value] = cookie.split("=") as [string, string];
      const tampered = `${name}=${value.startsWith("A") ? "B" : "A"}${value.slice(1)}`;
      assert.isTrue(Option.isNone(yield* as(makeEvent(tampered), session.get)));
    }).pipe(Effect.provide(layer)),
  );

  it.effect("is none once it expires, even if the browser still sends it", () =>
    Effect.gen(function* () {
      const session = yield* Session;
      const cookie = yield* signIn;
      yield* TestClock.adjust(Duration.days(7));
      assert.isTrue(Option.isNone(yield* as(makeEvent(cookie), session.get)));
    }).pipe(Effect.provide(layer)),
  );

  it.effect("clear expires the cookie", () =>
    Effect.gen(function* () {
      const session = yield* Session;
      const event = makeEvent();
      yield* as(event, session.clear);
      assert.match(event.response.headers.get("set-cookie") ?? "", /^session=;.*Max-Age=0/i);
    }).pipe(Effect.provide(layer)),
  );
});
