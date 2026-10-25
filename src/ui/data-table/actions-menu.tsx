import { useDataTableMessages } from "./use-messages.js";
import type { RowData } from "@tanstack/react-table";
import type { ReactElement, ReactNode } from "react";
import type { ResolvedGroup } from "../../lib/actions/actions.js";
import { ActionMenuItems, type ActionRunHandler } from "../actions/index.js";
import {
  ContextMenu,
  type ContextMenuPrimitive,
} from "../context-menu/index.js";
import { Menu, type MenuPrimitive } from "../menu/index.js";

/**
 * The row ⋯ menu and the right-click menu (R12.1, R11.6). Both are the shared Menu and
 * ContextMenu popups holding the shared ActionMenuItems, so they are the same object as
 * ActionMenu and ActionContextMenu everywhere else: the same rows, shortcuts, submenus,
 * disabled reasons, danger separator, confirmation and toasts. What the table adds is
 * performance: one menu per table, resolved for the row when it opens, instead of one
 * per row.
 */

export interface MenuContent<T extends RowData> {
  /** Action groups in display order. */
  groups: ResolvedGroup<T>[];
  /** Selected entities passed to action visibility, enablement, confirmation and execution. */
  targets: T[];
  /** Names the popup: "Actions for NST-C106", "Actions for 3 endpoints". */
  label: string;
  /** Replacement content from a render slot. */
  custom?: ReactNode;
  /** The right-clicked cell's m.onlyValue / m.excludeValue group (R16.7). */
  filter?: ReactNode;
}

function Items<T extends RowData>({
  content,
  surface,
  onRun,
}: {
  content: MenuContent<T>;
  surface: "menu" | "context";
  onRun: ActionRunHandler<T> | undefined;
}) {
  if (content.custom !== undefined && content.custom !== null)
    return content.custom;
  return (
    <ActionMenuItems
      groups={content.groups}
      targets={content.targets}
      surface={surface}
      onRun={onRun}
    />
  );
}

/**
 * One ⋯ menu for the whole table: every row's trigger shares a handle and passes its row
 * id as the payload, so a page of rows mounts one menu, not one per row. Placed as
 * ActionMenu places its popup.
 */
export function RowActionsMenu<T extends RowData>({
  handle,
  resolve,
  onRun,
}: {
  handle: MenuPrimitive.Handle<string>;
  resolve: (rowId: string) => MenuContent<T> | null;
  /** The table's `onAction`; without it the shared runner runs the action. */
  onRun: ActionRunHandler<T> | undefined;
}) {
  const m = useDataTableMessages();
  return (
    <Menu.Root handle={handle}>
      {({ payload }) => {
        const content = payload ? resolve(payload) : null;
        return (
          <Menu.Popup
            align="end"
            aria-label={content ? m.actionsFor(content.label) : undefined}
          >
            {content ? (
              <Items content={content} surface="menu" onRun={onRun} />
            ) : null}
          </Menu.Popup>
        );
      }}
    </Menu.Root>
  );
}

/**
 * Right-click (long-press, Shift+F10, the Menu key) on any row opens the actions its ⋯
 * opens (R11.6). The trigger is the rows container; the caller resolves the row under the
 * pointer in `onOpenChange` and cancels when there is none.
 */
export function RowContextMenu<T extends RowData>({
  trigger,
  content,
  onRun,
  onOpenChange,
}: {
  /** Control that opens the overlay or action. */
  trigger: ReactElement;
  /** Content rendered by this slot or overlay. */
  content: MenuContent<T> | null;
  /** The table's `onAction`, called when the person chooses an action in the context menu; without it the shared runner runs the action. */
  onRun: ActionRunHandler<T> | undefined;
  /** Decide per event; call `details.cancel()` to keep the native menu (no row under the pointer). */
  onOpenChange?: (
    open: boolean,
    details: ContextMenuPrimitive.Root.ChangeEventDetails,
  ) => void;
}) {
  const m = useDataTableMessages();
  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger render={trigger} />
      <ContextMenu.Popup
        aria-label={content ? m.actionsFor(content.label) : undefined}
      >
        {content?.filter}
        {content &&
        (content.groups.length ||
          (content.custom !== undefined && content.custom !== null)) ? (
          <Items content={content} surface="context" onRun={onRun} />
        ) : null}
      </ContextMenu.Popup>
    </ContextMenu.Root>
  );
}
