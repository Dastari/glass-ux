import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx.js";
import { observeElementSize } from "../../lib/use-element-size.js";
import { Tooltip } from "../tooltip/index.js";
import { splitMiddle } from "./split.js";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? () => {} : useLayoutEffect;

/** Ancestors that are already focusable: truncated text inside one adds no tab stop. */
const CONTROL_SELECTOR =
  "a[href], button, input, select, textarea, [role=button], [role=link], [role=tab], [role=treeitem], [role=option], [role=menuitem], [role=row][tabindex], [role=gridcell][tabindex]";

interface Measurement {
  truncated: boolean;
  /** Set once the text has been cut; the tooltip then stays mounted. */
  tooltip: boolean;
  insideControl: boolean;
  nodeText: string;
}

const UNMEASURED: Measurement = {
  truncated: false,
  tooltip: false,
  insideControl: false,
  nodeText: "",
};

export interface TruncatedTextProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  children: ReactNode;
  /** Full accessible tooltip text for rich nodes. Defaults to the rendered textContent. */
  text?: string;
  /**
   * Truncate in the middle so both ends stay visible (hostnames, serials, paths):
   * `true` cuts before the last segment, a number keeps that many trailing characters.
   */
  middle?: boolean | number;
  /** Tabular figures for identifiers and numbers (implied by `middle`). */
  numeric?: boolean;
  /** Preferred side for the tooltip. */
  tooltipSide?: "top" | "bottom";
}

/**
 * One line of text that ends in an ellipsis when it does not fit, and shows the full text
 * in a tooltip only when it was actually cut (R8.1). Truncated standalone text becomes
 * keyboard focusable; text inside a focusable control adds no nested tab stop. It lays out as a block that fills its
 * box, so the parent decides the width; flex parents need `min-width: 0` on the slot.
 */
export function TruncatedText({
  children,
  text,
  middle,
  numeric,
  tooltipSide = "top",
  className,
  ...rest
}: TruncatedTextProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const [element, setElement] = useState<HTMLSpanElement | null>(null);
  const [state, setState] = useState<Measurement>(UNMEASURED);
  const measuredKey = useRef<string | null>(null);
  const insideControl = useRef<{ parent: Element | null; inside: boolean }>({
    parent: null,
    inside: false,
  });

  const rootCallback = useCallback((node: HTMLSpanElement | null) => {
    rootRef.current = node;
    setElement(node);
  }, []);

  // Reads layout only from the shared observer, a text change or a hover. The text and the
  // enclosing-control lookup are read only once the text is actually cut.
  const measure = useCallback(() => {
    const root = rootRef.current;
    const target = headRef.current ?? root;
    if (!root || !target) return;
    const truncated = target.scrollWidth > target.clientWidth + 0.5;
    if (!truncated) {
      setState((current) =>
        current.truncated ? { ...current, truncated: false } : current,
      );
      return;
    }
    const parent = root.parentElement;
    if (insideControl.current.parent !== parent) {
      insideControl.current = {
        parent,
        inside: Boolean(parent?.closest(CONTROL_SELECTOR)),
      };
    }
    const next: Measurement = {
      truncated: true,
      tooltip: true,
      insideControl: insideControl.current.inside,
      nodeText: root.textContent ?? "",
    };
    setState((current) =>
      current.truncated &&
      current.insideControl === next.insideControl &&
      current.nodeText === next.nodeText
        ? current
        : next,
    );
  }, []);

  // One shared ResizeObserver delivers the first measurement after layout and every resize.
  useIsomorphicLayoutEffect(() => {
    if (!element) return;
    if (typeof ResizeObserver === "undefined") {
      measure();
      return;
    }
    return observeElementSize(element, measure);
  }, [element, measure]);

  // A text change inside an unchanged box does not resize it: re-measure when the text does.
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const key = `${middle ?? ""}\u0000${root.textContent ?? ""}`;
    const previous = measuredKey.current;
    measuredKey.current = key;
    if (previous !== null && previous !== key) measure();
  });

  const { truncated } = state;
  const fullText =
    text ?? (typeof children === "string" ? children : state.nodeText);
  const parts =
    middle && typeof children === "string"
      ? splitMiddle(children, typeof middle === "number" ? middle : undefined)
      : null;

  const content = (
    <span
      {...rest}
      ref={rootCallback}
      className={cx("fa-truncate", className)}
      data-middle={parts ? "" : undefined}
      data-numeric={numeric || parts ? "" : undefined}
      data-truncated={truncated ? "" : undefined}
      tabIndex={
        rest.tabIndex ?? (truncated && !state.insideControl ? 0 : undefined)
      }
      onPointerEnter={measure}
    >
      {parts ? (
        <>
          <span ref={headRef} className="fa-truncate-head">
            {parts.head}
          </span>
          <span className="fa-truncate-tail">{parts.tail}</span>
        </>
      ) : (
        children
      )}
    </span>
  );

  // The tooltip mounts the first time the text is cut and then stays, so later resizes do
  // not remount the text; text that always fits never creates one.
  if (!state.tooltip) return content;
  return (
    <Tooltip
      content={fullText}
      enabled={truncated}
      side={tooltipSide}
      arrow={false}
      describe={false}
    >
      {content}
    </Tooltip>
  );
}
