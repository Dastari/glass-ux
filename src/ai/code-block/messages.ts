import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for codeBlock. */
export const codeBlockMessages = defineMessages("codeBlock", {
  code: (value0: unknown) => `${value0} code`,
  lines: (value0: unknown) => `${value0} lines`,
  wrapLines: "Wrap lines",
  copyCode: "Copy code",
  source: (value0: unknown) => `${value0} source`,
  showFewerLines: "Show fewer lines",
  showAllLines: (value0: unknown) => `Show all ${value0} lines`,
  log: 'Log',
  text: 'Text',
  languagePowershell: "PowerShell",
  languageBash: "Bash",
  languageJson: "JSON",
  languageYaml: "YAML",
  languageTypescript: "TypeScript",
  languageSql: "SQL",
  languageXml: "XML",
  languageIni: "INI",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    codeBlock: typeof codeBlockMessages.defaults
  }
}

/** Resolve codeBlock wording outside React; pass the component's locale. */
export function getCodeBlockMessages(locale = getLocale()): typeof codeBlockMessages.defaults {
  return resolveMessages(codeBlockMessages.namespace, codeBlockMessages.defaults, locale)
}
