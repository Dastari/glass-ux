import type { ComponentProps, ReactNode } from "react";
import { TruncatedText } from "../truncated-text/index.js";
import { cx } from "../../lib/cx.js";
export interface Fact {
  /** Stable label used as the row identifier. */ label: string;
  /** Typed or composed display value. */ value: ReactNode;
  /** A decorative icon before the label. With `variant="rows"` the icons form their own column. */ icon?: ReactNode;
}
export interface FactListProps extends Omit<ComponentProps<"dl">, "children"> {
  /** Compact label/value rows, in reading order. */ facts: readonly Fact[];
  /**
   * `compact`: each label sits beside its value, for popovers and small summaries. `rows`: a
   * property list for a record's details panel, with an icon column when any fact has an icon, a
   * label column every value starts after, and a hairline between rows. Values are centred on
   * the row, so chips and badges line up with their labels; the label column narrows in a narrow
   * container.
   * @defaultValue "compact"
   */
  variant?: "compact" | "rows";
}
/** A semantic description list: compact label and value pairs for popovers, metadata and small summaries, or aligned rows for a record's details. */
export function FactList({ facts, variant = "compact", className, ...rest }: FactListProps) {
  const icons = facts.some((fact) => fact.icon != null);
  return (
    <dl {...rest} className={cx("fa-fact-list", className)} data-variant={variant === "rows" ? "rows" : undefined} data-icons={icons ? "" : undefined}>
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>
            {icons ? (
              <span className="fa-fact-list-icon" aria-hidden>
                {fact.icon}
              </span>
            ) : null}
            <TruncatedText>{fact.label}</TruncatedText>
          </dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
