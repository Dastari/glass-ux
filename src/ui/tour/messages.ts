import { defineMessages } from "../../lib/i18n/catalog.js"

const english = {
  progress: (step: number, total: number) => `Step ${step} of ${total}`,
  next: "Next",
  back: "Back",
  done: "Done",
  skip: "Skip tour",
  /** Announced when a step shows: its position and title. */
  announce: ({ step, total, title }: { step: number; total: number; title: string }) => `Step ${step} of ${total}: ${title}`,
}

/** Tour's English wording. */
export const tourMessages = defineMessages("tour", english)

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    tour: typeof tourMessages.defaults
  }
}
