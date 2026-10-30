import type { AnalyticsEvent, AnalyticsEvents } from "./events";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

// Pushes an event to dataLayer and nothing else: Tag Manager decides which tags
// fire and whether consent allows them. Before the container loads, pushes
// queue in dataLayer and run once it does. Does nothing on the server.
export function track<E extends AnalyticsEvent>(event: E, params: AnalyticsEvents[E]): void {
  if (typeof window === "undefined") return;
  (window.dataLayer ??= []).push({ event, ...params });
}
