import type { ReactNode } from "react"
import { IconLock, IconRestart } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../button/index.js"
import { SettingRow } from "../setting-row/index.js"

export interface InheritedSettingProps {
  /** Names the setting: "Show signed-in user's photo", "SNMP credentials". */
  label: ReactNode
  /** Who the value comes from while not overridden, as the UI names them: "Orbit Workspace", "Central studio (site)", "the workspace". */
  source: ReactNode
  /** The inherited value in words: "On", "v2c · port 161 · every 5 min". */
  inheritedValue?: ReactNode
  /** The entity sets its own value. */
  overridden: boolean
  /** Start an override (copy the inherited value into the entity's own). */
  onOverride: () => void
  /** Drop the override and inherit again. */
  onReset: () => void
  /** Whose override it is: "this device" → "Overridden for this device". */
  scope?: string
  /** The control for a setting row while overridden: a Switch, a Segmented. */
  control?: ReactNode
  /** Fields under the row while overridden: a credential profile. */
  children?: ReactNode
  /**
   * A broader level enforces the value ("Orbit Workspace"): the row says "Enforced by Orbit Workspace" with a lock, offers no Override, and its disabled reason names the enforcer.
   */
  enforcedBy?: string
  disabled?: boolean
  /** Why the setting cannot be overridden here (permissions). An enforcer supplies its own. */
  disabledReason?: string
  className?: string
}

/**
 * A setting that can come from a broader level (R6.9): workspace → organisation →
 * site → this entity. Inherited, it says where the value comes from and what it is, with
 * Override. Overridden, it says so ("Overridden for this device"), shows the control (or
 * the fields beneath), and offers Reset to inherit again. Enforced by a broader level, it
 * names the enforcer and cannot be overridden.
 */
export function InheritedSetting({
  label,
  source,
  inheritedValue,
  overridden,
  onOverride,
  onReset,
  scope = "this item",
  control,
  children,
  enforcedBy,
  disabled,
  disabledReason,
  className,
}: InheritedSettingProps) {
  const valueText = (from: ReactNode) =>
    inheritedValue !== undefined ? (
      <>
        {from}: {inheritedValue}
      </>
    ) : (
      from
    )

  if (enforcedBy) {
    const reason = `Enforced by ${enforcedBy}: it can't be changed here`
    return (
      <div className={cx("fa-inherited", className)} data-enforced="">
        <SettingRow
          label={label}
          disabled
          aria-description={reason}
          description={
            <span className="fa-inherited-scope">
              <IconLock className="fa-inherited-lock" />
              {valueText(`Enforced by ${enforcedBy}`)}
            </span>
          }
        />
      </div>
    )
  }

  return (
    <div className={cx("fa-inherited", className)} data-overridden={overridden ? "" : undefined}>
      <SettingRow
        label={label}
        disabled={disabled}
        description={
          overridden ? (
            <>
              <span className="fa-inherited-scope">Overridden for {scope}</span>
              <span className="fa-inherited-was"> · inherits {valueText(source)}</span>
            </>
          ) : (
            <span className="fa-inherited-scope">Inherited from {valueText(source)}</span>
          )
        }
        control={
          overridden ? (
            <>
              <Button size="sm" variant="ghost" icon={<IconRestart />} onClick={onReset} disabled={disabled} disabledReason={disabledReason} className="fa-inherited-reset">
                Reset
              </Button>
              {control}
            </>
          ) : (
            <Button size="sm" onClick={onOverride} disabled={disabled} disabledReason={disabledReason} className="fa-inherited-override">
              Override
            </Button>
          )
        }
      />
      {overridden && children ? <div className="fa-inherited-fields">{children}</div> : null}
    </div>
  )
}
