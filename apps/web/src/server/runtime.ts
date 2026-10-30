import { makeRequestRunner } from "@repo/core/request";
import type { RequestEvent } from "@repo/core/request";
import { getRequestEvent } from "@solidjs/web";
import type { RequestEvent as SolidRequestEvent, ResponseStub } from "@solidjs/web";
import type { StartMiddleware } from "@solidjs/vite-plugin";
import { Effect, ManagedRuntime } from "effect";
import type { APIEvent } from "filesystem-routing/api";

import { Session } from "./Session";

// All server code is Effect (docs/adr/0003-effect-server-runtime.md). Each
// endpoint hands its Effect to a helper below, which runs it on the one runtime
// this module builds with the request provided as `RequestEvent` from
// @repo/core/request. Nothing else runs an Effect.

/** Solid's request event as the start handler builds it, response head included. */
export type SolidEvent = SolidRequestEvent & { readonly response: ResponseStub };

/** The services every server Effect can use besides the request. */
export const AppLayer = Session.layer;

/**
 * The endpoint helpers over a runtime. The app's own are exported at the
 * bottom; tests build theirs over a test runtime.
 */
export function makeEndpoints<R, ER>(runtime: ManagedRuntime.ManagedRuntime<R, ER>) {
  const run = makeRequestRunner(runtime);

  /** Runs `effect` for the current request, or for `event`. See `makeRequestRunner`. */
  const runRequest = <A>(
    effect: Effect.Effect<A, never, R | RequestEvent>,
    event: SolidEvent = currentEvent(),
  ): Promise<A> => run(effect, event);

  /**
   * A `start.middleware` entry. `next` runs the rest of the chain; a `Response`
   * thrown downstream (a redirect) rejects through it unchanged. `event` is
   * Solid's own, for render inputs only Solid reads, such as `renderMode`: set
   * them before running `next`.
   */
  const middleware =
    (
      handle: (next: Effect.Effect<Response>, event: SolidEvent) => Effect.Effect<Response, never, R | RequestEvent>,
    ): StartMiddleware =>
    (event, next) => {
      const solidEvent = event as SolidEvent;
      // `next` takes no arguments: passing it straight to Effect.promise would hand it an AbortSignal.
      return runRequest(handle(Effect.promise(() => next()), solidEvent), solidEvent);
    };

  /** An API route handler: a GET/POST/... export of a route module. */
  const apiRoute =
    (effect: Effect.Effect<Response, never, R | RequestEvent>) =>
    (event: APIEvent): Promise<Response> =>
      // The dispatcher hands over the request event with the matched params written on.
      run(effect, event as unknown as SolidEvent);

  return { runRequest, middleware, apiRoute };
}

function currentEvent(): SolidEvent {
  const event = getRequestEvent();
  if (!event) {
    throw new Error("runRequest: no request event; call it within a middleware, API route, server function or render");
  }
  return event as SolidEvent;
}

/** One per Worker isolate: its layers build on the first request and serve every request after. */
export const runtime = ManagedRuntime.make(AppLayer);

export const { runRequest, middleware, apiRoute } = makeEndpoints(runtime);
