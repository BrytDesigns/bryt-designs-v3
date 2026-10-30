import { Title } from "@solidjs/meta";
import type { RouteDefinition } from "@solidjs/router";
import { httpStatus } from "@solidjs/web";

export const route = {
  // Cached for 10 minutes, so a page published at this URL shows within that.
  info: { cache: "page" },
  // Runs in preload so the status is set before the response head flushes.
  preload: () => httpStatus(404),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <main class="flex min-h-screen flex-col items-center justify-center gap-6">
      <Title>Not Found - Bryt Designs</Title>
      <h1 class="text-heading-h3">Page not found</h1>
      <a class="text-link underline" href="/">
        Back home
      </a>
    </main>
  );
}
