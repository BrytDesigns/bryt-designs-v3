import { Predicate } from "effect";

/**
 * Where the site serves WordPress's `wp-content` directory (uploads, mostly).
 * The old site used the same path, and the app proxies it to WordPress.
 */
export const CONTENT_PATH = "/_content";

// Origins older posts were written under. Their wp-content URLs 403 today,
// while the files are still on the WordPress host.
const LEGACY_ORIGINS = [
  "https://www.brytdesigns.com",
  "https://brytdesigns.com",
  "http://www.brytdesigns.com",
  "http://brytdesigns.com",
];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Builds a function that moves every URL on the WordPress host, or on a legacy
 * brytdesigns.com origin, to `siteOrigin`, with `/wp-content/` becoming
 * {@link CONTENT_PATH}. It walks strings, arrays and objects, so post HTML,
 * images and Yoast's SEO data all point at the site. Paths, trailing slashes
 * and query strings are left as they are.
 */
export function makeUrlRewriter(options: { wordpressOrigin: string; siteOrigin: string }): (value: unknown) => unknown {
  const origins = [options.wordpressOrigin, ...LEGACY_ORIGINS].map(escapeRegExp).join("|");
  // The lookahead stops a longer host, such as brytdesigns.com.example.org, from matching.
  const pattern = new RegExp(`(?:${origins})(?![\\w.:-])(/wp-content/)?`, "gi");
  const rewrite = (value: unknown): unknown => {
    if (Predicate.isString(value)) {
      return value.replace(pattern, (_, content?: string) =>
        content ? `${options.siteOrigin}${CONTENT_PATH}/` : options.siteOrigin,
      );
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (Predicate.isObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, rewrite(entry)]));
    }
    return value;
  };
  return rewrite;
}
