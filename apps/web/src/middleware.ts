import type { StartMiddleware } from "@solidjs/vite-plugin";
import { createAPIHandler } from "filesystem-routing/api";
// Loaded with the server, so an invalid server env (see env.ts) fails at boot
// instead of on the first request that reads it.
import "virtual:env/server";
import routes from "virtual:file-routes";

// The chain fronts every request: page renders, server function calls and API
// routes. Each middleware is `(event, next) => Response`; write the app's own
// with `middleware(...)` from src/server/runtime.ts, which runs them as Effects.

// Serves the GET/POST/... exports of route modules; anything else goes down the chain.
const handleAPI: StartMiddleware = createAPIHandler(routes);

export default [handleAPI];
