import type { StartMiddleware } from "@solidjs/vite-plugin";
import { createAPIHandler, createAPIMatcher } from "filesystem-routing/api";
// Loaded with the server, so an invalid server env (see env.ts) fails at boot
// instead of on the first request that reads it.
import "virtual:env/server";
import routes from "virtual:file-routes";

import { Router } from "./router";
import { handleCache } from "./server/cache";
import { middleware } from "./server/runtime";

// The chain fronts every request: page renders, server function calls and API
// routes. Each middleware is `(event, next) => Response`; write the app's own
// with `middleware(...)` from src/server/runtime.ts, which runs them as Effects.

const matchAPI = createAPIMatcher(routes);

// First, so every response leaves with cache headers: `no-store` unless its route opts in.
const cache = middleware(
  handleCache({
    isAPI: (path, method) => matchAPI(path, method)?.isPage === false,
    matchPage: (path) => Router.match(path),
  }),
);

// Serves the GET/POST/... exports of route modules; anything else goes down the chain.
const handleAPI: StartMiddleware = createAPIHandler(routes);

export default [cache, handleAPI];
