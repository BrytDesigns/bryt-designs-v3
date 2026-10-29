import { Title } from "@solidjs/meta";
import { createSignal } from "solid-js";

import { Button } from "@repo/ui/button";

export default function Home() {
  const [count, setCount] = createSignal(0);

  return (
    <main class="flex min-h-screen flex-col items-center justify-center gap-6">
      <Title>Bryt Designs</Title>
      <h1 class="text-3xl font-semibold">Bryt Designs</h1>
      <Button onClick={() => setCount(count() + 1)}>Clicks: {count()}</Button>
    </main>
  );
}
