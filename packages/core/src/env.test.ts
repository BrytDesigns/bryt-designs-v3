import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Schema } from "effect";
import type { StandardSchema } from "effect";

import { composeEnv, defineEnv } from "./env";

const site = defineEnv("site", { server: { SITE_URL: Schema.URLFromString } });
const https = defineEnv("https", { server: { SITE_URL: Schema.String.check(Schema.isPattern(/^https:/)) } });

// Every validator here is synchronous; the plugin rejects async ones for server vars.
const validate = (schema: StandardSchema.StandardSchemaV1, value: unknown) =>
  schema["~standard"].validate(value) as StandardSchema.StandardSchemaV1.Result<unknown>;

describe("defineEnv", () => {
  it.effect("reads each var through its schema", () =>
    Effect.gen(function* () {
      const url = yield* site.config.SITE_URL;
      assert.instanceOf(url, URL);
      assert.strictEqual(url.origin, "https://example.com");
    }).pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ SITE_URL: "https://example.com/" })))),
  );
});

describe("composeEnv", () => {
  it("validates with the declared schema", () => {
    const result = validate(composeEnv(site).server.SITE_URL, "https://example.com");
    assert.isUndefined(result.issues);
    assert.instanceOf((result as StandardSchema.StandardSchemaV1.SuccessResult<unknown>).value, URL);
  });

  it("names the declaring env when a var is missing", () => {
    const result = validate(composeEnv(site).server.SITE_URL, undefined);
    assert.include(result.issues?.[0]?.message, "(declared by site)");
  });

  it("checks a shared var against every declaration", () => {
    const result = validate(composeEnv(site, https).server.SITE_URL, "http://example.com");
    assert.strictEqual(result.issues?.length, 1);
    assert.include(result.issues?.[0]?.message, "(declared by https)");
  });

  it("decodes a shared var with the first declaration", () => {
    const first = validate(composeEnv(site, https).server.SITE_URL, "https://example.com");
    assert.instanceOf((first as StandardSchema.StandardSchemaV1.SuccessResult<unknown>).value, URL);

    const swapped = validate(composeEnv(https, site).server.SITE_URL, "https://example.com");
    assert.strictEqual((swapped as StandardSchema.StandardSchemaV1.SuccessResult<unknown>).value, "https://example.com");
  });

  it("keeps server and client vars apart", () => {
    const env = composeEnv(site, defineEnv("public", { client: { VITE_NAME: Schema.String } }));
    assert.deepStrictEqual(Object.keys(env.server), ["SITE_URL"]);
    assert.deepStrictEqual(Object.keys(env.client), ["VITE_NAME"]);
  });
});
