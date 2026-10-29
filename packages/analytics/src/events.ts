// Every event the site sends to Tag Manager, keyed by its `event` name, with the
// fields pushed alongside it. Tag Manager's triggers match these names, so
// renaming one breaks its tags until the container is updated too.
//
// Never put personal data (names, emails, phone numbers, message text) in an
// event: whatever reaches dataLayer can end up in GA4, which forbids it.
export interface AnalyticsEvents {
  // The container fires a GA4 event per form_name (contact_form_submission, …,
  // and newsletter_form_submission for "subscribe"), plus a Google Ads
  // conversion for "contact" and general_form_submission for every form.
  form_submission: { form_name: "contact" | "website" | "seo" | "advertising" | "subscribe" };
  cta_click: { cta_text: string; cta_location: string };
  project_card_click: { project_slug: string };
}

export type AnalyticsEvent = keyof AnalyticsEvents;
