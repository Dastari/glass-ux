import { Field as BaseField } from "@base-ui/react/field"
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react"
import { IconCheck, IconClose, IconSpinner } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import type { ButtonStatus } from "../button/index.js"
import { Skeleton } from "../skeleton/index.js"

export interface SettingRowContextValue {
  labelId: string
  descriptionId: string | undefined
}

/**
 * Lets a control that Base UI Field cannot label (Segmented, a ButtonGroup) find its row's
 * label and description. Field-aware controls (Switch, Select, NumberField) need nothing.
 */
export const SettingRowContext = createContext<SettingRowContextValue | null>(null)
export const useSettingRow = () => useContext(SettingRowContext)

export interface SettingRowProps extends Omit<ComponentProps<"div">, "children"> {
  /** Names the setting ("Keep agent up to date"). It labels the control. */
  label: ReactNode
  /** What the setting does, when the label alone does not say it. */
  description?: ReactNode
  /** A read-only current value shown beside the label ("SuperGrok", "1979"). */
  value?: ReactNode
  /** A badge after the label ("Beta"). */
  badge?: ReactNode
  /** The control or action, right-aligned: Switch, Segmented, a secondary Button. */
  control?: ReactNode
  /**
   * In-place save feedback for settings that apply immediately (R15.11): a spinner while
   * saving, a drawn ✓ on success, ✕ on failure. It sits beside the control and never
   * moves it. Drive it with `useActionFeedback()` from Button.
   */
  status?: ButtonStatus
  /** Error text in place of the description while `status` is "error". */
  error?: ReactNode
  disabled?: boolean
}

/**
 * One setting on one line: label (with an optional value and badge) and description on
 * the left, the control right-aligned. When the row is too narrow, the control drops
 * below the text instead of squeezing it (container query). Booleans are switches in
 * setting rows (R15.4).
 */
export function SettingRow({
  label,
  description,
  value,
  badge,
  control,
  status,
  error,
  disabled,
  className,
  ...rest
}: SettingRowProps) {
  const labelId = useId()
  const descriptionId = useId()
  const showError = status === "error" && error
  const hasDescription = Boolean(description || showError)
  return (
    <BaseField.Root
      {...rest}
      disabled={disabled}
      className={cx("fa-setting-row", className)}
      role="group"
      aria-labelledby={labelId}
      data-status={status && status !== "idle" ? status : undefined}
    >
      <div className="fa-setting-row-inner">
        <div className="fa-setting-row-text">
          <div className="fa-setting-row-head">
            <BaseField.Label id={labelId} className="fa-setting-row-label" nativeLabel={false} render={<div />}>
              {label}
            </BaseField.Label>
            {value !== undefined ? <span className="fa-setting-row-value">{value}</span> : null}
            {badge ? <span className="fa-setting-row-badge">{badge}</span> : null}
          </div>
          {hasDescription ? (
            <BaseField.Description id={descriptionId} className="fa-setting-row-description" data-error={showError ? "" : undefined}>
              {showError ? error : description}
            </BaseField.Description>
          ) : null}
        </div>
        {control !== undefined ? (
          <div className="fa-setting-row-control">
            {status !== undefined ? (
              <span className="fa-setting-row-status" aria-live="polite" data-status={status}>
                {status === "pending" ? <IconSpinner className="fa-setting-row-spinner" label="Saving" /> : null}
                {status === "success" ? <IconCheck className="fa-setting-row-check" label="Saved" /> : null}
                {status === "error" ? <IconClose label="Not saved" /> : null}
              </span>
            ) : null}
            <SettingRowContext.Provider value={{ labelId, descriptionId: hasDescription ? descriptionId : undefined }}>
              {control}
            </SettingRowContext.Provider>
          </div>
        ) : null}
      </div>
    </BaseField.Root>
  )
}

export interface SettingRowSkeletonProps extends Omit<ComponentProps<"div">, "children"> {
  /** The control's box: a switch, a segmented control or a button. */
  control?: "switch" | "segmented" | "button" | "none"
  description?: boolean
  /** Space reserved for the label. */
  labelWidth?: number | string
}

/** A setting row's loading shape: label and description lines and the control's box. */
export function SettingRowSkeleton({
  control = "switch",
  description = true,
  labelWidth = "40%",
  className,
  ...rest
}: SettingRowSkeletonProps) {
  return (
    <div aria-hidden {...rest} className={cx("fa-setting-row fa-setting-row-skeleton", className)}>
      <div className="fa-setting-row-inner">
        <div className="fa-setting-row-text">
          <div className="fa-setting-row-head">
            <Skeleton.Text type="body" width={labelWidth} />
          </div>
          {description ? <Skeleton.Text type="label" width="70%" /> : null}
        </div>
        {control === "none" ? null : (
          <div className="fa-setting-row-control">
            {control === "switch" ? <Skeleton.Block width="var(--switch-w)" height="var(--switch-h)" radius="full" /> : null}
            {control === "segmented" ? <Skeleton.Block width="var(--field-short)" height="var(--control-h-sm)" /> : null}
            {control === "button" ? <Skeleton.Block width="calc(var(--control-h-sm) * 2.5)" height="var(--control-h-sm)" /> : null}
          </div>
        )}
      </div>
    </div>
  )
}
