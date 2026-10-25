import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useCallback,
  useSyncExternalStore,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  IconAlert,
  IconEdit,
  IconSpinner,
} from "../../icons/generated/icons.js";
import { isIsoDate } from "../date-picker/calendar-date.js";
import { Input } from "../input/index.js";
import { Select } from "../select/index.js";
import { Switch } from "../switch/index.js";
import { TooltipPopup, TooltipPrimitive } from "../tooltip/index.js";
import type { DataTableCellEdit } from "./edit-types.js";
import type { DataColumnMeta } from "./features.js";
import { CellEditStore } from "./edit-state.js";
import { useDataTableMessages } from "./use-messages.js";

export const EditingContext = createContext<{
  store?: CellEditStore;
  navigate?: (rowId: string, columnId: string, delta: -1 | 1) => boolean;
  save?: (change: DataTableCellEdit<any>) => void | Promise<void>;
  announce: (message: string) => void;
}>({ announce: () => {} });

/** The same bounded editor is used by table cells, details and card fields. */
export function EditableValue({
  row,
  rowId,
  columnId,
  meta,
  raw,
  children,
}: {
  row: unknown;
  rowId: string;
  columnId: string;
  meta: DataColumnMeta;
  raw: unknown;
  children: ReactNode;
}) {
  const context = useContext(EditingContext);
  const m = useDataTableMessages();
  const [fallbackStore] = useState(() => new CellEditStore());
  const store = context.store ?? fallbackStore;
  const cellKey = JSON.stringify([rowId, columnId]);
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(cellKey, listener),
    [store, cellKey],
  );
  const snapshot = useCallback(() => store.read(cellKey), [store, cellKey]);
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  const dispatch = (event: Parameters<CellEditStore["dispatch"]>[1]) =>
    store.dispatch(cellKey, event);
  const [editing, setEditing] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [draft, setDraft] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const text = useRef("");
  const finished = useRef(false);
  const popupOpen = useRef(false);
  const errorId = useId();
  const edit = meta.edit;
  const available = Boolean(
    context.save &&
    edit &&
    meta.editable !== false &&
    (typeof meta.editable !== "function" || meta.editable(row)),
  );
  // A new host value supersedes a settled optimistic value. Pending saves keep their draft.
  const overlay =
    state &&
    (state.status === "pending" ||
      Object.is(state.source, raw) ||
      (state.status === "error" && Object.is(state.submitted, raw)))
      ? state
      : null;
  const value = overlay ? overlay.value : raw;
  const formatted = (v: unknown) =>
    edit?.format?.(v, row) ?? (v == null ? "" : String(v));
  const focus = () => root.current?.focus({ preventScroll: true });
  useLayoutEffect(() => {
    if (!editing) return;
    const control = root.current?.querySelector<HTMLElement>(
      "input, button, [tabindex='0']",
    );
    control?.focus({ preventScroll: true });
    if (control instanceof HTMLInputElement && control.type !== "date")
      control.select();
  }, [editing]);
  useLayoutEffect(() => {
    if (state?.status !== "saved") return;
    const cell = root.current?.closest(".fa-dt-cell") ?? root.current;
    cell?.setAttribute("data-flash", "");
    const done = () => cell?.removeAttribute("data-flash");
    cell?.addEventListener("animationend", done, { once: true });
    return () => cell?.removeEventListener("animationend", done);
  }, [state?.status, state?.token]);
  if (!available || !edit) return children;

  const begin = (replacement?: string) => {
    if (overlay?.status === "pending") return;
    finished.current = false;
    const initial = replacement ?? formatted(value);
    text.current = initial;
    setDraft(replacement === undefined ? value : initial);
    setError(null);
    setEditing(true);
  };
  const cancel = () => {
    finished.current = true;
    setEditing(false);
    setError(null);
    focus();
  };
  const commit = (returnFocus = true) => {
    if (finished.current) return true;
    let next = draft;
    try {
      if (
        typeof edit.kind === "string" &&
        !["select", "switch"].includes(edit.kind)
      ) {
        next = edit.parse
          ? edit.parse(text.current, row)
          : edit.kind === "number"
            ? text.current.trim()
              ? Number(text.current)
              : NaN
            : text.current;
      }
      if (
        edit.kind === "date" &&
        !edit.parse &&
        text.current &&
        !isIsoDate(text.current)
      )
        throw new Error(m.invalidDate);
      const invalid =
        edit.kind === "number" &&
        typeof next === "number" &&
        !Number.isFinite(next)
          ? m.invalidNumber
          : edit.validate?.(next, row);
      if (invalid) throw new Error(invalid);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : m.invalidValue;
      setError(message);
      context.announce(message);
      root.current
        ?.querySelector<HTMLElement>("input, button")
        ?.focus({ preventScroll: true });
      return false;
    }
    finished.current = true;
    setEditing(false);
    setError(null);
    if (returnFocus) focus();
    if (Object.is(next, value)) return true;
    const operation = store.nextToken();
    dispatch({
      type: "save",
      value: next,
      previous: value,
      source: raw,
      token: operation,
    });
    try {
      Promise.resolve(
        context.save?.({ row, rowId, columnId, value: next, previous: value }),
      ).then(
        () => dispatch({ type: "resolve", token: operation }),
        (reason) => fail(reason, operation),
      );
    } catch (reason) {
      fail(reason, operation);
    }
    return true;
  };
  function fail(reason: unknown, operation: number) {
    const message = reason instanceof Error ? reason.message : m.saveFailed;
    dispatch({ type: "reject", token: operation, error: message });
    context.announce(message);
  }
  const key = (event: KeyboardEvent<HTMLElement>) => {
    if (!editing) {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === "F2") {
        event.preventDefault();
        event.stopPropagation();
        begin();
      } else if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        begin(event.key);
      }
      return;
    }
    // The select popup owns its arrows, Enter and Escape while open.
    event.stopPropagation();
    if (popupOpen.current || event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Tab") {
      const table = root.current?.closest(".fa-dt");
      const fields = [
        ...(table?.querySelectorAll<HTMLElement>("[data-cell-editable]") ?? []),
      ].filter(
        (el) => el.getClientRects().length && el.dataset.pending === undefined,
      );
      const at = fields.indexOf(root.current!);
      const next = fields[at + (event.shiftKey ? -1 : 1)];
      if (!commit(!next)) {
        event.preventDefault();
        return;
      }
      if (context.navigate?.(rowId, columnId, event.shiftKey ? -1 : 1)) {
        event.preventDefault();
      } else if (next) {
        event.preventDefault();
        next.focus();
        next.dispatchEvent(
          new globalThis.KeyboardEvent("keydown", { key: "F2", bubbles: true }),
        );
      }
    }
  };
  let editor: ReactNode;
  const name = m.editCell(meta.label);
  if (typeof edit.kind === "function")
    editor = edit.kind({
      row,
      rowId,
      columnId,
      value: draft,
      onValueChange: setDraft,
      commit,
      cancel,
      error,
      "aria-label": name,
    });
  else if (edit.kind === "select")
    editor = (
      <Select
        size="sm"
        className="fa-dt-editor"
        aria-label={name}
        invalid={Boolean(error)}
        options={(edit.options ?? []).map((option, index) => ({
          value: String(index),
          label: option.label,
        }))}
        value={String(
          edit.options?.findIndex((option) => Object.is(option.value, draft)) ??
            -1,
        )}
        onValueChange={(index) =>
          setDraft(edit.options?.[Number(index)]?.value)
        }
        onOpenChange={(open) => {
          popupOpen.current = open;
        }}
      />
    );
  else if (edit.kind === "switch")
    editor = (
      <Switch
        size="sm"
        aria-label={name}
        checked={Boolean(draft)}
        onCheckedChange={setDraft}
        invalid={Boolean(error)}
      />
    );
  else
    editor = (
      <Input
        size="sm"
        className="fa-dt-editor"
        aria-label={name}
        aria-describedby={error ? errorId : undefined}
        invalid={Boolean(error)}
        type="text"
        placeholder={edit.kind === "date" ? m.datePlaceholder : undefined}
        inputMode={edit.kind === "number" ? "decimal" : undefined}
        value={text.current}
        onValueChange={(next) => {
          text.current = next;
          setDraft(next);
          setError(null);
        }}
      />
    );
  return (
    <TooltipPrimitive.Root
      open={
        Boolean(error) || Boolean(!editing && overlay?.error && tooltipOpen)
      }
    >
      <span
        ref={root}
        className="fa-dt-editable"
        tabIndex={0}
        role="group"
        aria-label={name}
        aria-describedby={error || overlay?.error ? errorId : undefined}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        data-cell-editable=""
        data-dt-interactive=""
        data-editing={editing ? "" : undefined}
        data-pending={overlay?.status === "pending" ? "" : undefined}
        data-error={error || overlay?.status === "error" ? "" : undefined}
        aria-busy={overlay?.status === "pending" || undefined}
        onKeyDown={key}
        onDoubleClick={(event) => {
          event.stopPropagation();
          begin();
        }}
        onBlur={(event) => {
          if (
            !editing ||
            popupOpen.current ||
            event.currentTarget.contains(event.relatedTarget as Node)
          )
            return;
          commit(false);
        }}
      >
        <span className="fa-dt-edit-display" aria-hidden={editing || undefined}>
          {overlay ? (
            <span className="fa-dt-text">{formatted(value) || "—"}</span>
          ) : (
            children
          )}
        </span>
        {editing ? <span className="fa-dt-editor-box">{editor}</span> : null}
        <span className="fa-dt-edit-status" aria-hidden>
          {overlay?.status === "pending" ? (
            <IconSpinner className="fa-spin" />
          ) : overlay?.status === "error" ? (
            <IconAlert />
          ) : (
            <IconEdit />
          )}
        </span>
      </span>
      <TooltipPopup
        id={errorId}
        anchor={root}
        side="bottom"
        align="start"
        arrow
      >
        {error ?? overlay?.error}
      </TooltipPopup>
    </TooltipPrimitive.Root>
  );
}
