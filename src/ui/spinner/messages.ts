import { defineMessages } from "../../lib/i18n/catalog.js";

export const spinnerMessages = defineMessages("spinner", {
  loading: "Loading",
});
declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    spinner: typeof spinnerMessages.defaults;
  }
}
