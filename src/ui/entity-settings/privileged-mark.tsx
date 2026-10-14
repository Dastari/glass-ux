import { IconLock } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"

/**
 * A small lock beside the label of a setting that needs MFA to change (PrivilegedWrite,
 *): reassignment, credentials, routing, removal. Saving a change to one asks for
 * step-up first ("Verify and save"). Reads never do.
 */
export function PrivilegedMark({ className }: { className?: string }) {
  return (
    <span className={cx("fa-privileged-mark", className)} data-privileged="">
      <IconLock aria-hidden />
      <span className="sr-only"> (needs MFA)</span>
    </span>
  )
}
