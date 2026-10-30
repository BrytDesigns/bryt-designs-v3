import { GoogleTagManager } from "@repo/analytics";
import { HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";
import { env } from "virtual:env/client";

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Bryt Designs</title>
        <HydrationScript />
        {env.VITE_GTM_ID && <GoogleTagManager id={env.VITE_GTM_ID} />}
      </head>
      <body>{props.children}</body>
    </html>
  );
}
