// Signed cookie sessions over @solidjs/web's request event. Reads come off
// `event.request`; writes append Set-Cookie to the `event.response` stub, so
// they ride whatever response leaves, thrown redirects included.
//
// Signed, not encrypted: the payload is tamper-proof but readable by the
// client. Never put secrets in it, and keep it small (cookies cap at ~4KB).
import { createCookie } from "@remix-run/cookie";
import { getRequestEvent } from "@solidjs/web";
import type { RequestEvent, ResponseStub } from "@solidjs/web";
import { env } from "virtual:env/server";

/** Add the fields the app stores in the session. */
export interface SessionData {}

const MAX_AGE = 60 * 60 * 24 * 7; // seconds; drives cookie Max-Age and the enforced expiry

// SESSION_SECRET is comma-separated, newest first: the first entry signs and
// every entry verifies. To rotate, prepend a new secret ("new,old") and drop
// the old one after MAX_AGE. Dropping every old secret signs everyone out.
const secrets = env.SESSION_SECRET.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const cookie = createCookie("session", {
  secrets,
  // @remix-run/cookie defaults httpOnly and secure to false.
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
  maxAge: MAX_AGE,
});

function event(): RequestEvent & { response: ResponseStub } {
  const e = getRequestEvent();
  if (!e) {
    throw new Error(
      "session: no request event; call within a server function, SSR render, API route or middleware",
    );
  }
  return e as RequestEvent & { response: ResponseStub };
}

/**
 * The current session, or `null` when it is absent, tampered with, signed by a
 * rotated-out secret, or expired. Reads the request's cookie only, so a
 * `setSession` earlier in the same request does not read back.
 */
export async function getSession(): Promise<SessionData | null> {
  const raw = await cookie.parse(event().request.headers.get("cookie"));
  if (!raw) return null;
  try {
    const { data, exp } = JSON.parse(raw) as { data: SessionData; exp: number };
    // Enforced here: the signature covers the value only, and a client may
    // ignore the cookie's Max-Age.
    return typeof exp === "number" && Date.now() < exp * 1000 ? data : null;
  } catch {
    return null;
  }
}

/** Replaces the whole session on the outgoing response. */
export async function setSession(data: SessionData): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  event().response.headers.append("set-cookie", await cookie.serialize(JSON.stringify({ data, exp })));
}

/** Expires the session cookie on the outgoing response. */
export async function clearSession(): Promise<void> {
  event().response.headers.append("set-cookie", await cookie.serialize("", { maxAge: 0 }));
}
