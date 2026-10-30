import * as ButtonPrimitive from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

type ButtonProps<T extends ValidComponent = "button"> = ButtonPrimitive.ButtonRootProps<T> & {
  class?: string | undefined;
};

export function Button<T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ButtonProps<T>>,
) {
  // Kobalte's generic polymorphic props don't survive omit(); narrow to the
  // default element first.
  const rest = omit(props as ButtonProps, "class");
  return (
    <ButtonPrimitive.Root
      class={["rounded-full bg-accent-fill px-4 py-2 text-button text-black hover:bg-foreground hover:text-background", props.class]}
      {...rest}
    />
  );
}
