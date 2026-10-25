import { useMessages } from "../../lib/i18n/use-messages.js";
import { dataTableMessages, dataTableCellMessages } from "./messages.js";
export const useDataTableMessages = () => useMessages(dataTableMessages);

export const useDataTableCellMessages = () => useMessages(dataTableCellMessages)
