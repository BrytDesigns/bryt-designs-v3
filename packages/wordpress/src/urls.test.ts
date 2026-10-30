import { assert, describe, it } from "@effect/vitest";

import { makeUrlRewriter } from "./urls";

const rewrite = makeUrlRewriter({ wordpressOrigin: "https://wp.example.com", siteOrigin: "https://site.example" });

describe("makeUrlRewriter", () => {
  it("moves wp-content on the WordPress host to /_content on the site", () => {
    assert.strictEqual(
      rewrite("https://wp.example.com/wp-content/uploads/2026/10/a.jpg"),
      "https://site.example/_content/uploads/2026/10/a.jpg",
    );
  });

  it.each([
    "https://www.brytdesigns.com",
    "https://brytdesigns.com",
    "http://www.brytdesigns.com",
    "http://brytdesigns.com",
  ])("moves wp-content on %s to /_content on the site", (origin) => {
    assert.strictEqual(rewrite(`${origin}/wp-content/uploads/a.jpg`), "https://site.example/_content/uploads/a.jpg");
  });

  it("moves page links to the site, keeping the path, trailing slash, query and hash", () => {
    assert.strictEqual(
      rewrite("https://wp.example.com/seo-web-design/?ref=nav#faq"),
      "https://site.example/seo-web-design/?ref=nav#faq",
    );
    assert.strictEqual(rewrite("http://brytdesigns.com/about"), "https://site.example/about");
  });

  it("rewrites every URL in post HTML and Yoast's schema JSON", () => {
    const html = `<a href="https://wp.example.com/wcag-guide/">Guide</a><img src="https://wp.example.com/wp-content/a-300.jpg" srcset="https://wp.example.com/wp-content/a-300.jpg 300w, https://www.brytdesigns.com/wp-content/a-1024.jpg 1024w">`;
    assert.strictEqual(
      rewrite(html),
      `<a href="https://site.example/wcag-guide/">Guide</a><img src="https://site.example/_content/a-300.jpg" srcset="https://site.example/_content/a-300.jpg 300w, https://site.example/_content/a-1024.jpg 1024w">`,
    );
    assert.strictEqual(
      rewrite(`{"@id":"https://wp.example.com/#/schema/person/1","url":"https://wp.example.com"}`),
      `{"@id":"https://site.example/#/schema/person/1","url":"https://site.example"}`,
    );
  });

  it("leaves other hosts and relative paths alone", () => {
    for (const url of [
      "https://memberpress.com/wp-content/uploads/a.png",
      "https://brytdesigns.com.example.org/wp-content/a.png",
      "https://brytdesigns.community/a",
      "https://wp.example.com:8443/a",
      "/wp-content/uploads/a.jpg",
    ]) {
      assert.strictEqual(rewrite(url), url);
    }
  });

  it("walks arrays and objects, leaving non-strings as they are", () => {
    assert.deepStrictEqual(
      rewrite({ post: { count: 3, draft: false, image: null, links: ["https://wp.example.com/a/"] } }),
      { post: { count: 3, draft: false, image: null, links: ["https://site.example/a/"] } },
    );
  });
});
