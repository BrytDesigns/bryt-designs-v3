import { Effect } from "effect";

import { apiRoute } from "../../server/runtime";

// Effect.sync, not Effect.succeed: a Response body reads once, so build one per request.
export const GET = apiRoute(Effect.sync(() => Response.json({ ok: true })));
