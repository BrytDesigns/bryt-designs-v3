import { Meta, Title } from "@solidjs/meta";
import { For } from "solid-js";

import { Button } from "@repo/ui/button";

// An internal page that renders every design-system token, for checking them
// against the Figma type sheet (210:1542). Live in every environment, so it
// sets its own noindex rather than relying on a site-wide switch.

type Theme = { cls: "theme-dark" | "theme-light"; name: string; key: "dark" | "light" };

const themes: Theme[] = [
  { cls: "theme-dark", name: "Dark (default)", key: "dark" },
  { cls: "theme-light", name: "Light", key: "light" },
];

type Swatch = { cls: string; token: string; figma: string; dark: string; light: string };

// Semantic colors: each column below renders them under its own theme class.
const colors: Swatch[] = [
  { cls: "bg-background", token: "background", figma: "black", dark: "#000000", light: "#FFFFFF" },
  { cls: "bg-foreground", token: "foreground", figma: "white", dark: "#FFFFFF", light: "#000000" },
  { cls: "bg-surface", token: "surface", figma: "surface-dark", dark: "#0D0D0D", light: "#F2F2F2" },
  { cls: "bg-border", token: "border", figma: "white-12", dark: "white at 12%", light: "black at 12%" },
  { cls: "bg-border-strong", token: "border-strong", figma: "white-32", dark: "white at 32%", light: "black at 32%" },
  { cls: "bg-accent", token: "accent", figma: "color-01", dark: "#F9BD09", light: "#8B6A04" },
  { cls: "bg-accent-fill", token: "accent-fill", figma: "color-01", dark: "#F9BD09", light: "#F9BD09" },
];

const fixedColors = [
  { cls: "bg-black", token: "black", value: "#000000" },
  { cls: "bg-white", token: "white", value: "#FFFFFF" },
];

type TextStyle = {
  cls: string;
  figma: string;
  font: string;
  // "floor -> desktop" for fluid styles, px at 375 and 1920.
  size: string;
  leading: string;
  tracking: string;
  upper?: boolean;
  // The sample line the Figma type sheet uses for this style.
  sample: string;
};

const textStyles: TextStyle[] = [
  { cls: "text-display", figma: "Display/XL", font: "Aktiv Bold", size: "56 → 134", leading: "1", tracking: "-0.02em", sample: "Our Work" },
  { cls: "text-heading-h1", figma: "Heading/H1", font: "Aktiv Bold", size: "44 → 96", leading: "1", tracking: "-0.02em", upper: true, sample: "Bespoke Shopify builds" },
  { cls: "text-heading-h2", figma: "Heading/H2", font: "Aktiv Bold", size: "38 → 80", leading: "1", tracking: "-0.02em", upper: true, sample: "Bespoke Shopify builds" },
  { cls: "text-heading-h3", figma: "Heading/H3", font: "Aktiv Bold", size: "32 → 56", leading: "1.1", tracking: "-0.02em", sample: "Bespoke Shopify builds" },
  { cls: "text-heading-h4", figma: "Heading/H4", font: "Aktiv Bold", size: "28 → 40", leading: "1.1", tracking: "-0.02em", sample: "Bespoke Shopify builds" },
  { cls: "text-heading-h5", figma: "Heading/H5", font: "Aktiv Bold", size: "24 → 32", leading: "1.17", tracking: "-0.02em", sample: "Bespoke Shopify builds" },
  { cls: "text-heading-h6", figma: "Heading/H6", font: "Aktiv Bold", size: "24", leading: "1.3", tracking: "-0.01em", sample: "Bespoke Shopify builds" },
  { cls: "text-accent-h1", figma: "Accent/H1", font: "Instrument Serif Italic", size: "44 → 96", leading: "1", tracking: "0", upper: true, sample: "Measurable results" },
  { cls: "text-accent-h2", figma: "Accent/H2", font: "Instrument Serif Italic", size: "38 → 80", leading: "1", tracking: "0", upper: true, sample: "Measurable results" },
  { cls: "text-accent-h3", figma: "Accent/H3", font: "Instrument Serif Italic", size: "32 → 56", leading: "1.2", tracking: "-0.02em", sample: "Measurable results" },
  { cls: "text-accent-h4", figma: "Accent/H4", font: "Instrument Serif Italic", size: "30 → 46", leading: "1.1", tracking: "0", sample: "Measurable results" },
  { cls: "text-accent-eyebrow", figma: "Accent/Eyebrow", font: "Instrument Serif Italic", size: "26", leading: "normal", tracking: "0.3em", upper: true, sample: "Measurable results" },
  { cls: "text-stat-xl", figma: "Stat/XL", font: "Instrument Serif Italic", size: "64 → 140", leading: "normal", tracking: "0", sample: "+38%" },
  { cls: "text-stat-lg", figma: "Stat/L", font: "Instrument Serif Italic", size: "48 → 88", leading: "1", tracking: "0", upper: true, sample: "+38%" },
  { cls: "text-stat-md", figma: "Stat/M", font: "Instrument Serif Italic", size: "40 → 72", leading: "1", tracking: "0", sample: "+38%" },
  { cls: "text-body-statement", figma: "Body/Statement", font: "Aktiv Regular", size: "32 → 56", leading: "1.2", tracking: "-0.02em", sample: "Built for brands that grow." },
  { cls: "text-body-xl", figma: "Body/XL", font: "Aktiv Regular", size: "26 → 36", leading: "normal", tracking: "0", sample: "Built for brands that grow." },
  { cls: "text-body-quote", figma: "Body/Quote", font: "Aktiv Regular", size: "24 → 34", leading: "1.35", tracking: "-0.01em", sample: "Built for brands that grow." },
  { cls: "text-body-lg", figma: "Body/L", font: "Aktiv Regular", size: "24 → 28", leading: "normal", tracking: "-0.01em", sample: "Built for brands that grow." },
  { cls: "text-body-md", figma: "Body/M", font: "Aktiv Regular", size: "24", leading: "normal", tracking: "-0.01em", sample: "Built for brands that grow." },
  { cls: "text-body-lead", figma: "Body/Lead", font: "Aktiv Regular", size: "20", leading: "1.6", tracking: "0", sample: "Built for brands that grow." },
  { cls: "text-body-base", figma: "Body/Base", font: "Aktiv Regular", size: "18", leading: "1.6", tracking: "0", sample: "Built for brands that grow." },
  { cls: "text-body-sm", figma: "Body/S", font: "Aktiv Regular", size: "16", leading: "1.5", tracking: "0", sample: "Built for brands that grow." },
  { cls: "text-body-xs", figma: "Body/XS", font: "Aktiv Regular", size: "14", leading: "normal", tracking: "0", sample: "Built for brands that grow." },
  { cls: "text-caption", figma: "Caption", font: "Aktiv Regular", size: "13", leading: "normal", tracking: "0", sample: "Owner + Founder" },
  { cls: "text-caption-caps", figma: "Caption/Caps", font: "Aktiv Regular", size: "13", leading: "normal", tracking: "0.2em", upper: true, sample: "Owner + Founder" },
  { cls: "text-button", figma: "Button", font: "Aktiv Medium", size: "18", leading: "normal", tracking: "-0.01em", sample: "Get a Proposal" },
  { cls: "text-nav-link", figma: "Nav/Link", font: "Aktiv Medium", size: "16", leading: "normal", tracking: "0.06em", upper: true, sample: "Services" },
  { cls: "text-link", figma: "Link", font: "Aktiv Medium", size: "16", leading: "normal", tracking: "-0.01em", sample: "Learn more" },
  { cls: "text-tag", figma: "Tag", font: "Aktiv Medium", size: "14", leading: "normal", tracking: "0", sample: "Shopify Plus" },
  { cls: "text-eyebrow-lg", figma: "Eyebrow/L", font: "Aktiv Bold", size: "18", leading: "1.03", tracking: "0.2em", upper: true, sample: "Our services" },
  { cls: "text-eyebrow-md", figma: "Eyebrow/M", font: "Aktiv Bold", size: "16", leading: "1.03", tracking: "0.2em", upper: true, sample: "Our services" },
  { cls: "text-eyebrow-sm", figma: "Eyebrow/S", font: "IBM Plex Mono", size: "13", leading: "normal", tracking: "0.2em", upper: true, sample: "Our services" },
  { cls: "text-label-lg", figma: "Label/L", font: "Aktiv Bold", size: "18", leading: "normal", tracking: "0", sample: "Shopify Design" },
  { cls: "text-label-md", figma: "Label/M", font: "Aktiv Bold", size: "16", leading: "normal", tracking: "0", sample: "Shopify Design" },
  { cls: "text-mono-md", figma: "Mono/M", font: "IBM Plex Mono", size: "16", leading: "1.5", tracking: "0", sample: "Conversion rate" },
  { cls: "text-mono-sm", figma: "Mono/S", font: "IBM Plex Mono", size: "14", leading: "normal", tracking: "0", sample: "Conversion rate" },
  { cls: "text-mono-xs", figma: "Mono/XS", font: "IBM Plex Mono", size: "13", leading: "normal", tracking: "0", sample: "Conversion rate" },
  { cls: "text-mono-xs-semibold", figma: "Mono/XS SemiBold", font: "IBM Plex Mono SemiBold", size: "13", leading: "normal", tracking: "0", sample: "Conversion rate" },
  { cls: "text-mono-2xs", figma: "Mono/XXS", font: "IBM Plex Mono", size: "12", leading: "normal", tracking: "0", sample: "Conversion rate" },
];

const containers = [
  { cls: "max-w-narrow", value: "960px" },
  { cls: "max-w-content", value: "1440px" },
  { cls: "max-w-wide", value: "1620px" },
];

const radii = [
  { cls: "rounded-panel", value: "24px" },
  { cls: "rounded-card", value: "16px" },
  { cls: "rounded-input", value: "12px" },
  { cls: "rounded-full", value: "pill" },
];

export default function DesignSystem() {
  return (
    <main class="mx-auto flex max-w-content flex-col gap-section-y px-gutter py-section-y">
      <Title>Design system - Bryt Designs</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <header class="flex flex-col gap-4">
        <p class="text-eyebrow-sm text-accent">Internal</p>
        <h1 class="text-heading-h2">Design system</h1>
        <p class="text-body-base text-foreground/60">
          Every token in @repo/design-system. Aktiv Grotesk, Instrument Serif and IBM Plex Mono
          have no font files yet, so their fallbacks render here.
        </p>
      </header>

      <section class="flex flex-col gap-8">
        <h2 class="text-heading-h4">Colors and themes</h2>
        <p class="text-body-base text-foreground/60">
          Each column is one theme class on a section, so everything inside follows it. On a whole
          page, the class goes on &lt;html&gt;. Light values are provisional.
        </p>
        <div class="grid gap-6 md:grid-cols-2">
          <For each={themes}>
            {(theme) => (
              <div class={[theme.cls, "flex flex-col gap-10 rounded-panel border border-border p-8"]}>
                <p class="text-eyebrow-sm">
                  .{theme.cls} · {theme.name}
                </p>

                <ul class="grid grid-cols-2 gap-6">
                  <For each={colors}>
                    {(swatch) => (
                      <li class="flex flex-col gap-2">
                        <div class={["h-16 rounded-card border border-border", swatch.cls]} />
                        <p class="text-label-md">{swatch.token}</p>
                        <p class="text-mono-2xs text-foreground/60">
                          {swatch[theme.key]} · Figma {swatch.figma}
                        </p>
                      </li>
                    )}
                  </For>
                </ul>

                <div class="flex flex-col gap-6">
                  <p class="text-label-lg">Accent: which one to use</p>
                  <div class="flex flex-col gap-2">
                    <div>
                      <Button>Get a Proposal</Button>
                    </div>
                    <p class="text-mono-2xs text-foreground/60">
                      Buttons: bg-accent-fill text-black
                    </p>
                  </div>
                  <div class="flex flex-col gap-2">
                    <p class="text-heading-h5">
                      A <span class="bg-accent-fill px-2 text-black">culture</span> built
                    </p>
                    <p class="text-mono-2xs text-foreground/60">
                      Highlight box, progress bar, active dot: bg-accent-fill, black text on it
                    </p>
                  </div>
                  <div class="flex flex-col gap-2">
                    <p class="text-eyebrow-sm text-accent">Our services</p>
                    <p class="text-heading-h5">
                      Built to <em class="text-accent-h4 text-accent">perform</em>
                    </p>
                    <p class="text-stat-md text-accent">+38%</p>
                    <p class="text-mono-2xs text-foreground/60">
                      Eyebrows, accent words, stats, icons: text-accent
                    </p>
                  </div>
                  <div class="flex flex-col gap-2">
                    <div>
                      <span class="text-link outline-2 outline-offset-2 outline-accent">Learn more</span>
                    </div>
                    <p class="text-mono-2xs text-foreground/60">
                      Focus ring: accent, applied globally on :focus-visible
                    </p>
                  </div>
                  <div class="flex flex-col gap-2 border-t border-border pt-6">
                    <p class="text-label-md text-accent-fill">Our services</p>
                    <p class="text-mono-2xs text-foreground/60">
                      Don't: text-accent-fill as text. Unreadable on light (1.7:1)
                    </p>
                    <div>
                      <span class="inline-block rounded-full bg-accent px-4 py-2 text-button text-black">
                        Get a Proposal
                      </span>
                    </div>
                    <p class="text-mono-2xs text-foreground/60">
                      Don't: bg-accent for a button. It turns gold on light
                    </p>
                  </div>
                </div>

                <p class="text-mono-xs">
                  <span class="light:hidden">dark: variant active</span>
                  <span class="hidden light:inline">light: variant active</span>
                </p>
              </div>
            )}
          </For>
        </div>
        <ul class="grid grid-cols-2 gap-6 md:grid-cols-4">
          <For each={fixedColors}>
            {(swatch) => (
              <li class="flex flex-col gap-2">
                <div class={["h-16 rounded-card border border-border", swatch.cls]} />
                <p class="text-label-md">{swatch.token}</p>
                <p class="text-mono-2xs text-foreground/60">{swatch.value} in both themes</p>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section class="flex flex-col gap-8">
        <h2 class="text-heading-h4">Text styles</h2>
        <ul class="flex flex-col">
          <For each={textStyles}>
            {(style) => (
              <li class="flex flex-col gap-4 border-t border-border py-8">
                <p class="text-mono-xs text-foreground/60">
                  <span class="text-foreground">{style.figma}</span> · {style.cls} · {style.font} ·{" "}
                  {style.size}px · {style.leading} · {style.tracking}
                  {style.upper ? " · uppercase" : ""}
                </p>
                <p class={style.cls}>{style.sample}</p>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section class="flex flex-col gap-8">
        <h2 class="text-heading-h4">Layout</h2>
        <ul class="flex flex-col gap-6">
          <For each={containers}>
            {(container) => (
              <li class="flex flex-col gap-3">
                <p class="text-mono-xs text-foreground/60">
                  <span class="text-foreground">{container.cls}</span> · {container.value}
                </p>
                <div class={["h-12 w-full rounded-input bg-surface", container.cls]} />
              </li>
            )}
          </For>
          <li class="flex flex-col gap-3">
            <p class="text-mono-xs text-foreground/60">
              <span class="text-foreground">px-gutter</span> · 16 → 40px ·{" "}
              <span class="text-foreground">py-section-y</span> · 64 → 100px
            </p>
            <div class="flex">
              <div class="h-12 w-gutter bg-accent-fill" />
              <div class="h-section-y w-12 bg-border-strong" />
            </div>
          </li>
        </ul>
        <ul class="grid grid-cols-2 gap-6 md:grid-cols-4">
          <For each={radii}>
            {(radius) => (
              <li class="flex flex-col gap-3">
                <div class={["h-24 border border-border-strong bg-surface", radius.cls]} />
                <p class="text-mono-xs text-foreground/60">
                  <span class="text-foreground">{radius.cls}</span> · {radius.value}
                </p>
              </li>
            )}
          </For>
        </ul>
      </section>
    </main>
  );
}
