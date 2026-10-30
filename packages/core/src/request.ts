import { Context, Effect } from "effect";
import type { ManagedRuntime } from "effect";

// Serving a request with Effect, free of any framework. An app builds one
// runtime from its layers and runs each request's Effect through
// `makeRequestRunner`, which provides the request as `RequestEvent`. Services in
// any package read the request through that service. Framework glue (turning
// an Effect into a middleware or a route handler) stays in the app.
// See docs/adr/0003-effect-server-runtime.md.

export interface ServedRequest {
  readonly request: Request;
  /** The response head: a status and headers written here ride whatever response leaves. */
  readonly response: { status?: number; statusText?: string; readonly headers: Headers };
  /** The route params the router matched, if any. */
  readonly params?: Readonly<Record<string, string>>;
}

/** The request being served. Read it here rather than through a framework's global accessor. */
export class RequestEvent extends Context.Service<RequestEvent, ServedRequest>()("@repo/core/RequestEvent") {}

/**
 * Returns `runRequest(effect, event)`, which provides `RequestEvent` and runs
 * `effect` on `runtime`. The error type is `never`: turn typed errors into a
 * response (or a value) first. A defect rejects with the original value, as a
 * thrown error would, so the framework's own failure handling still applies.
 */
export function makeRequestRunner<R, ER>(runtime: ManagedRuntime.ManagedRuntime<R, ER>) {
  return <A>(effect: Effect.Effect<A, never, R | RequestEvent>, event: ServedRequest): Promise<A> =>
    runtime.runPromise(Effect.provideService(effect, RequestEvent, event));
}
