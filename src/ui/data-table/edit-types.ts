import type { ReactNode } from "react";

/** Props supplied to a custom inline editor. Commit and cancel return focus to the cell. */
export interface CellEditorProps<Row, Value> {
  /** Original record being edited. */
  row: Row;
  /** Stable record identifier. */
  rowId: string;
  /** Column identifier. */
  columnId: string;
  /** Current draft, including changes made through onValueChange. */
  value: Value;
  /** Replace the draft. */
  onValueChange: (value: Value) => void;
  /** Validate and save the draft. Returns false when validation fails. */
  commit: () => boolean;
  /** Discard the draft. */
  cancel: () => void;
  /** Validation message, or null. */
  error: string | null;
  /** Accessible name for the editor. */
  "aria-label": string;
}

/** An inline editor bound to the accessor's value type. */
export interface DataTableColumnEdit<Row, Value> {
  /** Built-in compact control, or a custom editor. */
  kind:
    | "text"
    | "number"
    | "select"
    | "date"
    | "switch"
    | ((props: CellEditorProps<Row, Value>) => ReactNode);
  /** Values offered by the select editor. Values retain their accessor type. */
  options?: readonly { value: Value; label: string }[];
  /** Validate before saving; return a message to keep the editor open. */
  validate?: (value: Value, row: Row) => string | null;
  /** Convert text input to the accessor value. Exceptions become validation messages. */
  parse?: (text: string, row: Row) => Value;
  /** Format a value for text input and optimistic display. */
  format?: (value: Value, row: Row) => string;
}

/** A validated cell change. The host persists the value and may update its rows immediately. */
export interface DataTableCellEdit<Row, Value = unknown> {
  /** Record as supplied by the host. */
  row: Row;
  /** Stable record identifier. */
  rowId: string;
  /** Accessor column identifier. */
  columnId: string;
  /** Validated new value. */
  value: Value;
  /** Value before this change. */
  previous: Value;
}
