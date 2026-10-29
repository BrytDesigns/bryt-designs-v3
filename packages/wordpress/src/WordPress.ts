import { Context, Effect, Layer, Stream } from "effect";
import { GraphQLClient, GraphQLMiddleware, GraphQLProtocol } from "effect/graphql";

import { wordpressEnv } from "./env";
import { QueriesGraphQLGroup } from "./queries.graphql.ts";
import { makeUrlRewriter } from "./urls";

/** Rewrites WordPress URLs in every raw response before it is decoded. See `makeUrlRewriter`. */
export class WordPressUrls extends GraphQLMiddleware.Service<WordPressUrls>()("@repo/wordpress/WordPressUrls") {
  static readonly layer = Layer.effect(
    WordPressUrls,
    Effect.gen(function* () {
      const rewrite = makeUrlRewriter({
        wordpressOrigin: (yield* wordpressEnv.config.WORDPRESS_GRAPHQL_URL).origin,
        siteOrigin: (yield* wordpressEnv.config.SITE_URL).origin,
      });
      return {
        execute: ({ next, request }) => Effect.map(next(request), (result) => ({ ...result, data: rewrite(result.data) })),
        subscribe: ({ next, request }) => Stream.map(next(request), (result) => ({ ...result, data: rewrite(result.data) })),
      };
    }),
  );
}

export const WordPressGraphQLGroup = QueriesGraphQLGroup.middleware(WordPressUrls);

/**
 * The WordPress GraphQL client: one method per operation in queries.graphql,
 * such as `wordpress.GetPost({ slug })`. Queries go out as POST through the
 * app's `HttpClient`, which the layer requires.
 */
export class WordPress extends Context.Service<WordPress, GraphQLClient.FromGroup<typeof WordPressGraphQLGroup>>()(
  "@repo/wordpress/WordPress",
) {
  static readonly layer = Layer.effect(WordPress, GraphQLClient.make(WordPressGraphQLGroup)).pipe(
    Layer.provide(WordPressUrls.layer),
    Layer.provide(
      Layer.unwrap(
        Effect.map(wordpressEnv.config.WORDPRESS_GRAPHQL_URL, (url) => GraphQLProtocol.layerHttp({ url: url.href })),
      ),
    ),
  );

  /** Answers each operation from a handler, skipping the network, decoding and middleware. */
  static readonly layerTest = GraphQLClient.layerTest(WordPress, WordPressGraphQLGroup);
}
