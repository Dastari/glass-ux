import type { ComponentProps, ReactNode } from "react";
import {
  IconError,
  IconInfo,
  IconSuccess,
  IconWarning,
} from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { TruncatedText } from "../truncated-text/index.js";

export type NoticeTone = "info" | "success" | "warning" | "danger";

const ICONS = {
  info: IconInfo,
  success: IconSuccess,
  warning: IconWarning,
  danger: IconError,
} as const;

export interface NoticeProps extends Omit<ComponentProps<"div">, "title"> {
  tone?: NoticeTone;
  /** A short bold lead-in. Optional: most notices are one sentence. */
  title?: ReactNode;
  /** One trailing control: a small Button or a link. */
  action?: ReactNode;
  /** One line that truncates; the full text is available on hover and keyboard focus. */
  compact?: boolean;
}

/**
 * Information that belongs to a place on the page — always rendered there, never injected
 * (R9.1). The tone's icon leads; text stays in text colours so it reads in every palette.
 * For transient outcomes use a toast; for connection state use the status bar.
 */
export function Notice({
  tone = "info",
  title,
  action,
  compact = false,
  className,
  children,
  ...rest
}: NoticeProps) {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "note"}
      {...rest}
      className={cx("fa-notice", className)}
      data-tone={tone}
      data-compact={compact ? "" : undefined}
    >
      <Icon className="fa-notice-icon" />
      {compact ? (
        <TruncatedText className="fa-notice-text">
          {title ? <span className="fa-notice-title">{title}</span> : null}
          <span className="fa-notice-body">{children}</span>
        </TruncatedText>
      ) : (
        <div className="fa-notice-text">
          {title ? <span className="fa-notice-title">{title}</span> : null}
          <span className="fa-notice-body">{children}</span>
        </div>
      )}
      {action ? <div className="fa-notice-action">{action}</div> : null}
    </div>
  );
}
