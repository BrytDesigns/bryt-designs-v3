import { defineEnv } from "@repo/core/env";
import { Schema } from "effect";

export const wordpressEnv = defineEnv("@repo/wordpress", {
  server: {
    // The WPGraphQL endpoint. Not a secret: the API is public.
    WORDPRESS_GRAPHQL_URL: Schema.URLFromString,
    // The site's public URL. Links into WordPress are rewritten to its origin.
    SITE_URL: Schema.URLFromString,
  },
});
