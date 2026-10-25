import { useSyncExternalStore, type ReactNode } from "react";
import { registerMessagePack, type MessagePack } from "glass-ux/i18n";
import { configureLocale, DirectionProvider, localeDirection, type TextDirection } from "glass-ux/locale";

/** The interface languages the docs can preview, by their own names. */
export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "nl", label: "Nederlands" },
  { value: "ja", label: "日本語" },
  { value: "zh-Hans", label: "简体中文" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
  { value: "he", label: "עברית" },
] as const;
export type DocsLanguage = (typeof LANGUAGES)[number]["value"];

/** Each pack loads when it is first chosen, so English pages download none. */
const PACKS: Record<Exclude<DocsLanguage, "en">, () => Promise<{ default: MessagePack }>> = {
  de: () => import("glass-ux/i18n/de"),
  fr: () => import("glass-ux/i18n/fr"),
  es: () => import("glass-ux/i18n/es"),
  it: () => import("glass-ux/i18n/it"),
  "pt-BR": () => import("glass-ux/i18n/pt-BR"),
  nl: () => import("glass-ux/i18n/nl"),
  ja: () => import("glass-ux/i18n/ja"),
  "zh-Hans": () => import("glass-ux/i18n/zh-Hans"),
  ko: () => import("glass-ux/i18n/ko"),
  ar: () => import("glass-ux/i18n/ar"),
  he: () => import("glass-ux/i18n/he"),
};

const STORAGE_KEY = "glass-ux-docs.language";
const listeners = new Set<() => void>();
let current: { language: DocsLanguage; direction: TextDirection } = { language: "en", direction: "ltr" };

const known = (value: string | null): value is DocsLanguage => LANGUAGES.some((language) => language.value === value);

/** Switch the docs' components to a language: its pack, formatting locale, `lang` and reading direction. */
export async function setDocsLanguage(language: DocsLanguage, remember = true) {
  if (language !== "en") registerMessagePack((await PACKS[language]()).default);
  const direction = language === "en" ? "ltr" : localeDirection(language);
  configureLocale(language === "en" ? undefined : language);
  document.documentElement.lang = language === "en" ? "en-AU" : language;
  document.documentElement.dir = direction;
  if (remember) {
    if (language === "en") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, language);
  }
  current = { language, direction };
  for (const notify of listeners) notify();
}

/**
 * Restore the remembered language at start-up. The `?lang=` and `?dir=` preview parameters
 * win for that visit and are not remembered.
 */
export function restoreDocsLanguage() {
  const params = new URLSearchParams(location.search);
  const previewLanguage = params.get("lang");
  const previewDirection = params.get("dir");
  if (previewLanguage || previewDirection) {
    if (previewLanguage) document.documentElement.lang = previewLanguage;
    if (previewDirection === "rtl" || previewDirection === "ltr") document.documentElement.dir = previewDirection;
    current = { language: known(previewLanguage) ? previewLanguage : "en", direction: document.documentElement.dir === "rtl" ? "rtl" : "ltr" };
    if (known(previewLanguage) && previewLanguage !== "en") void setDocsLanguage(previewLanguage, false);
    return;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (known(stored) && stored !== "en") void setDocsLanguage(stored, false);
}

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

/** The docs' current interface language and direction. */
export function useDocsLanguage() {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/** Shares the docs' reading direction with every component, and follows language changes. */
export function DocsDirection({ children }: { children: ReactNode }) {
  const { direction } = useDocsLanguage();
  return <DirectionProvider direction={direction}>{children}</DirectionProvider>;
}
