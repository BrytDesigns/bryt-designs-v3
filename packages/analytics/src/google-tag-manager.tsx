// Loads a Tag Manager container. Render it once, in the document's <head>, so it
// is part of the server-rendered HTML and starts before hydration. The router
// navigates client-side, so the document never reloads and the container loads
// once per visit. Anything that must run before the container (consent defaults)
// goes in its own <script> above this.
export function GoogleTagManager(props: { id: string }) {
  return (
    <>
      {/* A fixed inline script, not HTML: innerHTML keeps it unescaped. */}
      {/* oxlint-disable-next-line solid/no-innerhtml */}
      <script innerHTML='window.dataLayer=window.dataLayer||[];window.dataLayer.push({"gtm.start":Date.now(),event:"gtm.js"});' />
      <script async src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(props.id)}`} />
    </>
  );
}
