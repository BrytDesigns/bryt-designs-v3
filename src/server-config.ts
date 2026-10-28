import { createFlightDataCollector } from "@solidjs/router/server";
import { configureServerFunctionsServer } from "@solidjs/web/server-functions/server";

import { Router } from "./router";

// Loaded before any server function dispatch. The collector reruns the target
// route's preload after a mutation, so its response carries the fresh data.
configureServerFunctionsServer({
  collectFlightData: createFlightDataCollector(Router),
});
