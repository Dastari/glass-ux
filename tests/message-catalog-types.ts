// A package built on Glass UX adds its namespace to the catalogue through the public entry.
import { defineMessagePack, defineMessages, type MessageOverrides } from "glass-ux/i18n"

const notebookMessages = defineMessages("notebook", {
  run: "Run cell",
  cells: (count: number) => `${count} cells`,
})

declare module "glass-ux/i18n/catalog" {
  interface MessageCatalog {
    notebook: typeof notebookMessages.defaults
  }
}

export const pack = defineMessagePack("de", {
  notebook: { run: "Zelle ausführen" },
  // The namespaces inside the package stay in the same catalogue.
  paneLayout: { close: "Schließen" },
})

export const overrides: MessageOverrides = { notebook: { cells: (count: number) => `${count} Zellen` } }

// @ts-expect-error a key the namespace does not have
export const unknownKey: MessageOverrides = { notebook: { stop: "Stopp" } }
