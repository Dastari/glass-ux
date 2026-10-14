import type { ComponentProps, ReactNode } from "react";
import { TruncatedText } from "../truncated-text/index.js";
import { cx } from "../../lib/cx.js";
export interface Fact {
  /** Stable label used as the row identifier. */ label: string;
  /** Typed or composed display value. */ value: ReactNode;
}
export interface FactListProps extends Omit<ComponentProps<"dl">, "children"> {
  /** Compact label/value rows, in reading order. */ facts: readonly Fact[];
}
/** A compact semantic description list for popovers, metadata and small summaries. */
export function FactList({ facts, className, ...rest }: FactListProps) {
  return (
    <dl {...rest} className={cx("fa-fact-list", className)}>
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>
            <TruncatedText>{fact.label}</TruncatedText>
          </dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
