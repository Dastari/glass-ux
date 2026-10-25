import { useDataTableMessages } from "./use-messages.js";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  SyntheticEvent,
} from "react";
import { IconGrip } from "../../icons/generated/icons.js";
import { TOOLTIP_DELAY_MS, TooltipPrimitive } from "../tooltip/index.js";

/** What every grip shares (one object per table, inside the RowController). */
export interface GripController {
  /** One tooltip for every grip: how to reorder, or a disabled grip's reason. */
  tooltip: TooltipPrimitive.Handle<string>;
  /** The visible instruction an available grip's tooltip shows. */
  hint: string;
  /** Element id of the keyboard instructions (aria-describedby on an available grip). */
  helpId: string;
  /** Prefix for a disabled grip's reason element id. */
  idBase: string;
  pointerDown: (rowId: string, event: ReactPointerEvent<HTMLElement>) => void;
  keyDown: (rowId: string, event: ReactKeyboardEvent<HTMLElement>) => void;
  blur: (rowId: string) => void;
}

/** Keep touch long-press and right-click on the grip from opening the row's context menu. */
const stop = (event: SyntheticEvent) => event.stopPropagation();

/**
 * A row's reorder grip: "Reorder <row>". `reason` is "" when the row can move, otherwise why it
 * cannot (aria-disabled, so it stays focusable and hoverable for the tooltip, R11.3). Its
 * tooltip says how to reorder (R20.7), on hover and on keyboard focus, or why it cannot.
 */
export function GripButton({
  rowId,
  index,
  label,
  tabIndex,
  reason,
  grip,
}: {
  rowId: string;
  /** The line index, for a unique reason id. */
  index: number;
  label: string;
  tabIndex: number;
  reason: string;
  grip: GripController;
}) {
  const m = useDataTableMessages();
  const disabled = reason !== "";
  const reasonId = `${grip.idBase}-${index}`;
  return (
    <>
      <TooltipPrimitive.Trigger
        handle={grip.tooltip}
        payload={disabled ? reason : grip.hint}
        delay={TOOLTIP_DELAY_MS}
        render={
          <button
            type="button"
            className="fa-dt-grip-button"
            aria-label={m.reorderRow(label)}
            aria-disabled={disabled || undefined}
            aria-describedby={disabled ? reasonId : grip.helpId}
            tabIndex={tabIndex}
            data-dt-interactive=""
            onPointerDown={(event) => {
              stop(event);
              if (disabled) return;
              // The hint has done its job once the grip is taken.
              grip.tooltip.close();
              grip.pointerDown(rowId, event);
            }}
            onTouchStart={stop}
            onContextMenu={(event) => {
              event.preventDefault();
              stop(event);
            }}
            onKeyDown={(event) => grip.keyDown(rowId, event)}
            onBlur={() => grip.blur(rowId)}
          />
        }
      >
        <IconGrip />
      </TooltipPrimitive.Trigger>
      {disabled ? (
        <span id={reasonId} hidden>
          {reason}
        </span>
      ) : null}
    </>
  );
}
