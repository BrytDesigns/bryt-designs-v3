import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { WordPress } from "./WordPress";

const ENDPOINT = "https://wp.example.com/graphql";

// The real layer over an HttpClient that answers every request with `body`,
// recording what was sent.
const answering = (body: unknown) => {
  const sent: Array<{ method: string; url: string; body: unknown }> = [];
  const http = HttpClient.make((request, url) => {
    sent.push({
      method: request.method,
      url: url.href,
      body: request.body._tag === "Uint8Array" ? JSON.parse(new TextDecoder().decode(request.body.body)) : undefined,
    });
    return Effect.succeed(HttpClientResponse.fromWeb(request, Response.json(body)));
  });
  const layer = WordPress.layer.pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
    Layer.provide(
      ConfigProvider.layer(ConfigProvider.fromUnknown({ WORDPRESS_GRAPHQL_URL: ENDPOINT, SITE_URL: "https://site.example/" })),
    ),
  );
  return { layer, sent };
};

const seoImage = (sourceUrl: string) => ({ sourceUrl, altText: "", mediaDetails: { width: 1200, height: 630 } });

const category = {
  name: "Build",
  slug: "build",
  description: `<img src="https://www.brytdesigns.com/wp-content/uploads/build.png">`,
  count: 114,
  seo: {
    title: "Build • Bryt Designs",
    metaDesc: null,
    canonical: "",
    metaRobotsNoindex: "index",
    metaRobotsNofollow: "follow",
    opengraphTitle: null,
    opengraphDescription: null,
    opengraphImage: seoImage("https://wp.example.com/wp-content/uploads/og.png"),
    twitterTitle: null,
    twitterDescription: null,
    twitterImage: null,
    schema: { raw: `{"@id":"https://wp.example.com/category/build/#webpage"}` },
  },
};

describe("WordPress", () => {
  it.effect("decodes a response with its URLs moved to the site", () => {
    const { layer } = answering({ data: { category } });
    return Effect.gen(function* () {
      const wordpress = yield* WordPress;
      const { category: decoded } = yield* wordpress.GetCategory({ slug: "build" });
      assert.strictEqual(decoded?.count, 114);
      assert.strictEqual(decoded?.description, `<img src="https://site.example/_content/uploads/build.png">`);
      assert.strictEqual(decoded?.seo?.opengraphImage?.sourceUrl, "https://site.example/_content/uploads/og.png");
      assert.strictEqual(decoded?.seo?.schema?.raw, `{"@id":"https://site.example/category/build/#webpage"}`);
    }).pipe(Effect.provide(layer));
  });

  it.effect("POSTs the operation to WORDPRESS_GRAPHQL_URL", () => {
    const { layer, sent } = answering({ data: { post: null } });
    return Effect.gen(function* () {
      const wordpress = yield* WordPress;
      yield* wordpress.GetPost({ slug: "seo-web-design" });
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0]?.method, "POST");
      assert.strictEqual(sent[0]?.url, ENDPOINT);
      assert.deepInclude(sent[0]?.body, { operationName: "GetPost", variables: { slug: "seo-web-design" } });
    }).pipe(Effect.provide(layer));
  });

  it.effect("returns null for a slug WordPress doesn't have", () => {
    const { layer } = answering({ data: { post: null } });
    return Effect.gen(function* () {
      const wordpress = yield* WordPress;
      const { post } = yield* wordpress.GetPost({ slug: "not-a-post" });
      assert.isNull(post);
    }).pipe(Effect.provide(layer));
  });

  // What GetPostFaq returns when the ACF group is hidden from GraphQL; the
  // route catches it and renders the post without the FAQ.
  it.effect("fails with GraphQLClientError when WordPress rejects the query", () => {
    const { layer } = answering({ errors: [{ message: 'Cannot query field "blogPost" on type "Post".' }] });
    return Effect.gen(function* () {
      const wordpress = yield* WordPress;
      const error = yield* Effect.flip(wordpress.GetPostFaq({ slug: "seo-web-design" }));
      assert.strictEqual(error._tag, "GraphQLClientError");
      assert.strictEqual(error.reason._tag, "ResponseError");
    }).pipe(Effect.provide(layer));
  });
});
