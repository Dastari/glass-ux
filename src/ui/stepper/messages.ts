import { defineMessages } from "../../lib/i18n/catalog.js"

/** Stepper and Wizard's words. */
export const stepperMessages = defineMessages("stepper", {
  steps: "Steps",
  stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
  complete: "complete",
  current: "current",
  error: "needs attention",
  optional: "Optional",
  skipped: "skipped",
  back: "Back",
  next: "Next",
  finish: "Finish",
  finishing: "Finishing…",
  finished: "Done",
  skip: "Skip",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    stepper: typeof stepperMessages.defaults
  }
}
