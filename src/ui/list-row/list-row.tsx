import type { ComponentProps, ReactNode } from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cx } from "../../lib/cx.js";
import { TruncatedText } from "../truncated-text/index.js";
export interface ListRowProps extends Omit<
  ComponentProps<typeof BaseButton>,
  "title"
> {
  /** Main row label; rich nodes receive a truncation tooltip. */ title: ReactNode;
  /** Secondary information, below the title. */ meta?: ReactNode;
  /** Leading icon or identity glyph. */ icon?: ReactNode;
  /** Non-interactive trailing metadata or count. */ trailing?: ReactNode;
  /** Marks the currently selected destination. */ selected?: boolean;
}
/** A clickable list row sharing the library's item recipe and native keyboard activation. */
export function ListRow({
  title,
  meta,
  icon,
  trailing,
  selected = false,
  className,
  ...rest
}: ListRowProps) {
  return (
    <BaseButton
      type="button"
      {...rest}
      className={cx("fa-item fa-list-row", className)}
      data-selected={selected ? "" : undefined}
      data-disabled={rest.disabled ? "" : undefined}
    >
      {icon ? <span className="fa-list-row-icon">{icon}</span> : null}
      <span className="fa-list-row-text">
        <TruncatedText>{title}</TruncatedText>
        {meta ? (
          <TruncatedText className="fa-list-row-meta">{meta}</TruncatedText>
        ) : null}
      </span>
      {trailing ? (
        <span className="fa-list-row-trailing">{trailing}</span>
      ) : null}
    </BaseButton>
  );
}
