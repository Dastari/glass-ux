import { useMessages } from "../../lib/i18n/index.js"
import { foldText } from "../../lib/fold.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { chipOverflowMessages } from "./messages.js"
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { observeElementSize } from "../../lib/resize-observer.js";
import { Button } from "../button/index.js";
import { EmptyState } from "../empty-state/index.js";
import { SearchField } from "../input/index.js";
import { Popover } from "../popover/index.js";
import { Tooltip } from "../tooltip/index.js";
import { CONTROL_SELECTOR } from "../truncated-text/truncated-text.js";
export interface OverflowChip {
  /** Stable entity identifier. */ id: string;
  /** Searchable label. */ label: string;
  /** Host-owned identity chip. */ content: ReactNode;
}
export interface ChipOverflowProps {
  /** Full collection, before limiting visible chips. */ items: readonly OverflowChip[];
  /** Chips visible before the overflow trigger. */ limit?: number;
  /** Accessible collection name and search label. */ label: string;
  /**
   * `true` (the default) lets the chips wrap onto more lines. `false` keeps them on one line, for
   * a table row or a toolbar: chips share the width and end in an ellipsis, and the +N trigger
   * never shrinks. A chip that was cut shows its `label` in a tooltip. The chip must be able to
   * shrink: Badge and EntityIdentity do, and so does plain text.
   */
  wrap?: boolean;
}

/** Whether any box in the chip holds more than it shows. A 1px box is visually hidden text, not a cut. */
const isCut = (node: Element): boolean =>
  (node.clientWidth > 1 && node.scrollWidth > node.clientWidth + 0.5) || Array.from(node.children).some(isCut);

/**
 * One chip of a single-line collection. The chip's own text does the truncating, so this measures
 * the boxes inside it. With no +N to reach every entry from, a cut chip takes focus for its tooltip.
 */
function SingleLineChip({ item, overflowing }: { item: OverflowChip; overflowing: boolean }) {
  const [element, setElement] = useState<HTMLSpanElement | null>(null);
  const [state, setState] = useState({ cut: false, tooltip: false, focusable: false });
  const measure = useCallback(() => {
    if (!element) return;
    const cut = isCut(element);
    // A chip inside a control, or with one inside it, adds no tab stop of its own.
    const focusable = cut && !element.querySelector(`${CONTROL_SELECTOR}, [tabindex]`) && !element.parentElement?.closest(CONTROL_SELECTOR);
    setState((current) =>
      current.cut === cut && current.focusable === focusable
        ? current
        : { cut, focusable, tooltip: current.tooltip || cut },
    );
  }, [element]);
  useEffect(() => (element ? observeElementSize(element, measure) : undefined), [element, measure]);
  const chip = (
    <span
      ref={setElement}
      className="fa-chip-overflow-item"
      tabIndex={state.focusable && !overflowing ? 0 : undefined}
      onPointerEnter={measure}
    >
      {item.content}
    </span>
  );
  // The tooltip mounts the first time the chip is cut and then stays, as TruncatedText's does.
  if (!state.tooltip) return chip;
  return (
    <Tooltip content={item.label} enabled={state.cut} side="top" arrow={false} describe={false}>
      {chip}
    </Tooltip>
  );
}

/** A compact chip collection with a searchable +N overflow popover. */
export function ChipOverflow({ items, limit = 2, label, wrap = true }: ChipOverflowProps) {
  const messages = useMessages(chipOverflowMessages)
  const locale = useLocale()

  const [query, setQuery] = useState("");
  const visible = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : items.length;
  const needle = foldText(query.trim(), locale);
  const found = items.filter((item) => foldText(item.label, locale).includes(needle));
  return (
    <span className="fa-chip-overflow" data-nowrap={wrap ? undefined : ""}>
      {items.slice(0, visible).map((item) =>
        wrap ? (
          <span key={item.id}>{item.content}</span>
        ) : (
          <SingleLineChip key={item.id} item={item} overflowing={items.length > visible} />
        ),
      )}
      {items.length > visible ? (
        <Popover.Root
          onOpenChange={(open) => {
            if (!open) setQuery("");
          }}
        >
          <Popover.Trigger
            render={
              <Button
                size="xs"
                variant="ghost"
                aria-label={messages.more(items.length - visible, label)}
              >
                +{items.length - visible}
              </Button>
            }
          />
          <Popover.Popup title={label} align="start">
            <SearchField
              aria-label={messages.search(label)}
              value={query}
              onValueChange={setQuery}
            />
            {found.length ? (
              <ul className="fa-chip-overflow-list" aria-label={label}>
                {found.map((item) => (
                  <li key={item.id}>{item.content}</li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={null}>{messages.noMatches}</EmptyState>
            )}
          </Popover.Popup>
        </Popover.Root>
      ) : null}
    </span>
  );
}
