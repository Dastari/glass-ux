import { useEffect, type ReactElement, type ReactNode } from "react";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import {
  APPEARANCE_STORAGE_KEY,
  type Appearance,
} from "../lib/appearance/appearance.js";
import { AppearanceProvider } from "../lib/appearance/use-appearance.js";
import { LocaleProvider } from "../lib/locale/use-locale.js";
import { MessagesProvider } from "../lib/i18n/use-messages.js";
import type { MessageOverrides } from "../lib/i18n/catalog.js";
import { TooltipProvider } from "../ui/tooltip/index.js";

/** Provider settings and normal Testing Library render options. */
export interface GlassRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Stored appearance overrides; tests default to reduced motion. Restored on unmount. */
  appearance?: Partial<Appearance>;
  /** Formatting locale, default en-AU. */
  locale?: string;
  /** Per-namespace translations. */
  messages?: MessageOverrides;
}

/**
 * Render with appearance, locale, messages and tooltip providers. Testing Library's cleanup
 * unmounts the providers and restores the previous stored appearance and root attributes.
 * Run installGlassTestEnvironment first in jsdom. Add application providers around ui as needed.
 */
export function renderWithGlass(
  ui: ReactElement,
  {
    appearance,
    locale = "en-AU",
    messages = {},
    ...options
  }: GlassRenderOptions = {},
): RenderResult {
  const key = APPEARANCE_STORAGE_KEY;
  const stored = localStorage.getItem(key);
  const attributes = Array.from(
    document.documentElement.attributes,
    (attr) => [attr.name, attr.value] as const,
  );
  localStorage.setItem(
    key,
    JSON.stringify({ motion: "reduced", ...appearance }),
  );
  function Wrapper({ children }: { children?: ReactNode }) {
    useEffect(
      () => () => {
        if (stored === null) localStorage.removeItem(key);
        else localStorage.setItem(key, stored);
        for (const attr of Array.from(document.documentElement.attributes))
          document.documentElement.removeAttribute(attr.name);
        for (const [name, value] of attributes)
          document.documentElement.setAttribute(name, value);
      },
      [],
    );
    return (
      <AppearanceProvider>
        <LocaleProvider locale={locale}>
          <MessagesProvider messages={messages}>
            <TooltipProvider>{children}</TooltipProvider>
          </MessagesProvider>
        </LocaleProvider>
      </AppearanceProvider>
    );
  }
  return render(ui, { ...options, wrapper: Wrapper });
}
