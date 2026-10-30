// Signed cookie sessions. Reads come off the request and writes append
// Set-Cookie to the response head, both through RequestEvent, so they ride
// whatever response leaves, thrown redirects included.
//
// Signed, not encrypted: the payload is tamper-proof but readable by the
// client. Never put secrets in it, and keep it small (cookies cap at ~4KB).
import { createCookie } from "@remix-run/cookie";
import { RequestEvent } from "@repo/core/request";
import { Clock, Context, Duration, Effect, Layer, Option, Schema } from "effect";

import { webEnv } from "../../env";

/** Add the fields the app stores in the session. */
export const SessionData = Schema.Struct({});
export type SessionData = typeof SessionData.Type;

// Drives the cookie's Max-Age and the enforced expiry.
const MAX_AGE = Duration.days(7);

// The cookie's value: the data plus its expiry in epoch seconds, as JSON.
const Payload = Schema.fromJsonString(Schema.Struct({ data: SessionData, exp: Schema.Number }));

export class Session extends Context.Service<
  Session,
  {
    /**
     * The current session, or none when it is absent, tampered with, signed by
     * a rotated-out secret, or expired. Reads the request's cookie only, so a
     * `set` earlier in the same request does not read back.
     */
    readonly get: Effect.Effect<Option.Option<SessionData>, never, RequestEvent>;
    /** Replaces the whole session on the outgoing response. */
    readonly set: (data: SessionData) => Effect.Effect<void, never, RequestEvent>;
    /** Expires the session cookie on the outgoing response. */
    readonly clear: Effect.Effect<void, never, RequestEvent>;
  }
>()("@repo/web/server/Session") {
  static readonly layer = Layer.effect(
    Session,
    Effect.gen(function* () {
      // SESSION_SECRET is comma-separated, newest first: the first entry signs and
      // every entry verifies. To rotate, prepend a new secret ("new,old") and drop
      // the old one after MAX_AGE. Dropping every old secret signs everyone out.
      const secrets = (yield* webEnv.config.SESSION_SECRET)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const cookie = createCookie("session", {
        secrets,
        // @remix-run/cookie defaults httpOnly and secure to false.
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: Duration.toSeconds(MAX_AGE),
      });

      const get = Effect.gen(function* () {
        const { request } = yield* RequestEvent;
        const raw = yield* Effect.promise(() => cookie.parse(request.headers.get("cookie")));
        const now = yield* Clock.currentTimeMillis;
        return Schema.decodeUnknownOption(Payload)(raw).pipe(
          // Enforced here: the signature covers the value only, and a client may
          // ignore the cookie's Max-Age.
          Option.filter(({ exp }) => now < exp * 1000),
          Option.map(({ data }) => data),
        );
      });

      const set = Effect.fn("Session.set")(function* (data: SessionData) {
        const { response } = yield* RequestEvent;
        const exp = Math.floor((yield* Clock.currentTimeMillis) / 1000) + Duration.toSeconds(MAX_AGE);
        const value = yield* Schema.encodeEffect(Payload)({ data, exp }).pipe(Effect.orDie);
        response.headers.append("set-cookie", yield* Effect.promise(() => cookie.serialize(value)));
      });

      const clear = Effect.gen(function* () {
        const { response } = yield* RequestEvent;
        response.headers.append("set-cookie", yield* Effect.promise(() => cookie.serialize("", { maxAge: 0 })));
      });

      return Session.of({ get, set, clear });
    }),
  );
}
