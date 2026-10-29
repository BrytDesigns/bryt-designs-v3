import { Config, Schema } from "effect";
import type { StandardSchema } from "effect";

// Env vars are declared by the package that reads them and composed by each
// app. A package lists its vars as Effect Schemas with `defineEnv`, and its
// layers read them through the matching `config` entries. An app's env.ts
// passes every package it uses to `composeEnv`, which builds the
// `{ server, client }` maps @solidjs/vite-plugin validates at boot and types
// `virtual:env/*` from. See docs/adr/0001-env-composition.md.

/** A var's schema. It decodes the raw value: a string, or undefined when unset. */
export type EnvField = Schema.Codec<unknown, string | undefined>;

export type EnvFields = { readonly [key: string]: EnvField };

export interface Env<S extends EnvFields, C extends EnvFields> {
  /** Who declares these vars, named when one fails validation. */
  readonly name: string;
  /** Server-only vars. */
  readonly server: S;
  /** Public vars, baked into the browser bundle. Names carry the `VITE_` prefix. */
  readonly client: C;
  /** One `Config` per var, decoding through the var's schema. */
  readonly config: { readonly [K in keyof (S & C)]: Config.Config<(S & C)[K]["Type"]> };
}

export type AnyEnv = Env<EnvFields, EnvFields>;

export function defineEnv<S extends EnvFields = Record<never, never>, C extends EnvFields = Record<never, never>>(
  name: string,
  vars: { readonly server?: S; readonly client?: C },
): Env<S, C> {
  const server = vars.server ?? ({} as S);
  const client = vars.client ?? ({} as C);
  const config = Object.fromEntries(
    Object.entries({ ...server, ...client }).map(([key, schema]) => [key, Config.schema(schema, key)]),
  );
  return { name, server, client, config } as Env<S, C>;
}

// Merges one side of every env, keeping the first declaration of each var.
type Merged<E extends ReadonlyArray<AnyEnv>, Side extends "server" | "client"> = E extends readonly [
  infer Head extends AnyEnv,
  ...infer Tail extends ReadonlyArray<AnyEnv>,
]
  ? Head[Side] & Omit<Merged<Tail, Side>, keyof Head[Side]>
  : Record<never, never>;

type Standard<F> = {
  readonly [K in keyof F]: F[K] extends EnvField ? StandardSchema.StandardSchemaV1<F[K]["Encoded"], F[K]["Type"]> : never;
};

/**
 * Builds the env schema an app's env.ts default-exports. Several packages may
 * declare the same var: its value is checked against every declaration, and
 * `virtual:env/*` gets the value decoded by the first, so an app lists its own
 * env first.
 */
export function composeEnv<const E extends ReadonlyArray<AnyEnv>>(
  ...envs: E
): { readonly server: Standard<Merged<E, "server">>; readonly client: Standard<Merged<E, "client">> } {
  const side = (pick: "server" | "client") => {
    const declarations = new Map<string, Array<{ name: string; schema: EnvField }>>();
    for (const env of envs) {
      for (const [key, schema] of Object.entries(env[pick])) {
        declarations.set(key, [...(declarations.get(key) ?? []), { name: env.name, schema }]);
      }
    }
    return Object.fromEntries([...declarations].map(([key, declared]) => [key, everyDeclaration(declared)]));
  };
  return { server: side("server"), client: side("client") } as never;
}

function everyDeclaration(
  declared: ReadonlyArray<{ name: string; schema: EnvField }>,
): StandardSchema.StandardSchemaV1 {
  const validators = declared.map(({ name, schema }) => ({
    name,
    standard: Schema.toStandardSchemaV1(schema)["~standard"],
  }));
  return {
    "~standard": {
      version: 1,
      vendor: "@repo/core/env",
      validate(value) {
        const issues: Array<StandardSchema.StandardSchemaV1.Issue> = [];
        let output: unknown;
        for (const [index, { name, standard }] of validators.entries()) {
          const result = standard.validate(value);
          // Effect validates synchronously unless a schema does async work, and
          // the plugin only accepts synchronous validators for server vars.
          if (result instanceof Promise) throw new Error(`[@repo/core/env] ${name} declares an async schema`);
          if (result.issues) issues.push(...result.issues.map((issue) => ({ ...issue, message: `${issue.message} (declared by ${name})` })));
          else if (index === 0) output = result.value;
        }
        return issues.length > 0 ? { issues } : { value: output };
      },
    },
  };
}
