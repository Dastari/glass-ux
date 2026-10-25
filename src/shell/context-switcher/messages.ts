import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

import type { SwitcherLabels, SwitcherNoun } from "./model.js"

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * The switcher's English labels for a noun: `switcherLabels({ one: "project", other:
 * "projects" })` gives "All projects", "Find a project", "Project: Atlas" and the rest.
 * Override single labels by spreading the result.
 */
export function englishSwitcherLabels({ one, other, article = /^[aeiou]/i.test(one) ? "an" : "a" }: SwitcherNoun): SwitcherLabels {
  return {
    all: `All ${other}`,
    allShort: "All",
    recent: "Recent",
    group: capitalise(other),
    title: capitalise(one),
    choose: `Choose ${article} ${one}`,
    placeholder: `Find ${article} ${one}`,
    search: `Search ${other}`,
    popup: `Choose ${article} ${one}`,
    missing: `${capitalise(one)} unavailable`,
    loading: `Loading ${other}`,
    unavailable: `${capitalise(one)} directory unavailable`,
    none: `No ${other} returned`,
    loadMore: `Load more ${other}`,
    noMatch: (query) => `No ${other} match “${query}”`,
    includes: (name, count) => plural("en", count, { one: `${name} and ${count} ${one} under it`, other: `${name} and ${count} ${other} under it` }),
    changed: (name) => `Now in ${name}`,
  }
}


/** English defaults for contextSwitcher. */
export const contextSwitcherMessages = defineMessages("contextSwitcher", {
  ...englishSwitcherLabels({ one: "organisation", other: "organisations" }),
  loadedResults: (count: number, more: boolean, locale = "en-US") => plural(locale, count, { one: `${count} loaded result`, other: `${count} loaded results` }) + (more ? "; more available" : ""),
  loaded: (count: number, noun: string, suffix: string) => `${count} loaded ${noun}${suffix}`,
  retry: "Retry",
  resultCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} result`, other: `${numberFormat(locale).format(count)} results` }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    contextSwitcher: typeof contextSwitcherMessages.defaults
  }
}

/** Resolve contextSwitcher wording outside React; pass the component's locale. */
export function getContextSwitcherMessages(locale = getLocale()): typeof contextSwitcherMessages.defaults {
  return resolveMessages(contextSwitcherMessages.namespace, contextSwitcherMessages.defaults, locale)
}
