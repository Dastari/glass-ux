import type { CSSProperties } from "react";
import {
  IconChevronRight,
  IconCollapseAll,
  IconUnfold,
} from "../../icons/generated/icons.js";
import { Button } from "../button/index.js";
import { useDataTableMessages } from "./use-messages.js";

/** Where a line sits in a tree: `--fa-dt-level` is its depth, for the indent. */
export const levelStyle = (level: number | undefined) =>
  level === undefined
    ? undefined
    : ({ "--fa-dt-level": level - 1 } as CSSProperties);

/** The chevron that opens a row, or the same space on a row that has nothing to open. */
export function RowExpander({
  label,
  open,
  openable,
  panelId,
  tabIndex,
  onToggle,
}: {
  /** Row label for the accessible name. */
  label: string;
  /** Row is open. */
  open: boolean;
  /** Row has a panel or children. */
  openable: boolean;
  /** The panel's element, while open. */
  panelId: string | undefined;
  tabIndex: number;
  onToggle: () => void;
}) {
  const m = useDataTableMessages();
  if (!openable) return <span className="fa-dt-expander" data-spacer="" aria-hidden />;
  return (
    <Button
      variant="ghost"
      size="xs"
      className="fa-dt-expander"
      icon={<IconChevronRight />}
      aria-label={m.rowToggle({ expanded: open, label })}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      tabIndex={tabIndex}
      data-dt-interactive=""
      onClick={onToggle}
    />
  );
}

/** Expand-all in the expander column's header. */
export function ExpandAllButton({
  open,
  label,
  onToggle,
}: {
  /** Every row it can open is open. */
  open: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className="fa-dt-expander fa-dt-expand-all"
      icon={open ? <IconCollapseAll /> : <IconUnfold />}
      aria-label={label}
      onClick={onToggle}
    />
  );
}
