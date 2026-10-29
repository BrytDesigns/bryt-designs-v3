import { Title } from "@solidjs/meta";
import type { RouteDefinition } from "@solidjs/router";
import { httpStatus } from "@solidjs/web";

// Runs in preload so the status is set before the response head flushes.
export const route = {
  preload: () => httpStatus(404),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <main class="flex min-h-screen flex-col items-center justify-center gap-6">
      <Title>Not Found - Bryt Designs</Title>
      <h1 class="text-3xl font-semibold">Page not found</h1>
      <a class="underline" href="/">
        Back home
      </a>
    </main>
  );
}
