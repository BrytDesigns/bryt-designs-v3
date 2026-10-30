import { defineEnv } from "@repo/core/env";
import { Schema } from "effect";

export const analyticsEnv = defineEnv("@repo/analytics", {
  client: {
    // The Tag Manager container, which the app passes to <GoogleTagManager>.
    // Unset (local dev) loads no container, so no traffic reaches GA4; set it
    // for staging and production.
    VITE_GTM_ID: Schema.UndefinedOr(Schema.String.check(Schema.isPattern(/^GTM-[A-Z0-9]+$/))),
  },
});
