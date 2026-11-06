import { Switch as BaseSwitch } from "@base-ui/react/switch"
import { useId, type ReactNode } from "react"
import { IconCheck, IconClose } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Tooltip } from "../tooltip/index.js"
import { ChoiceRow, descriptionId, type ChoiceSize, type ChoiceTone } from "../field/index.js"

export type SwitchSize = ChoiceSize

export interface SwitchProps extends Omit<BaseSwitch.Root.Props, "className" | "render" | "nativeButton"> {
  className?: string
  size?: SwitchSize
  /** The "on" colour. Status tones only when the setting itself is a status (R3.3). */
  tone?: ChoiceTone
  /** ✓ / ✕ inside the bead (md and lg). */
  icons?: boolean
  /** Invalid outside a Field. */
  invalid?: boolean
  /** Label beside the switch. Omit when a Field (or an aria-label) names it. */
  label?: ReactNode
  /** Second line: what turning it on does. */
  description?: ReactNode
  /** Why it is disabled: turns it off, keeps it in the Tab order, and shows this as its tooltip and description. */
  disabledReason?: string
  /** Keep a disabled switch in the Tab order, so its state and name can be reached. Default false. */
  focusableWhenDisabled?: boolean
}

function SwitchTrack({ size = "md", tone, icons = false, invalid, className, disabled, disabledReason, focusableWhenDisabled, ...rest }: Omit<SwitchProps, "label" | "description">) {
  // A disabled button leaves the Tab order and takes no pointer events, so one that stays
  // reachable is read-only and says it is disabled.
  const isDisabled = Boolean(disabled || disabledReason)
  const reachable = isDisabled && Boolean(disabledReason || focusableWhenDisabled)
  const track = (
    <BaseSwitch.Root
      {...rest}
      disabled={isDisabled && !reachable}
      readOnly={reachable || rest.readOnly}
      aria-disabled={reachable || undefined}
      aria-readonly={reachable ? undefined : rest.readOnly || undefined}
      aria-description={disabledReason}
      data-disabled={reachable ? "" : undefined}
      nativeButton
      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- named by Base UI (aria-labelledby) or the caller's aria-label
      render={<button type="button" />}
      className={cx("fa-switch", className)}
      data-size={size}
      data-tone={tone === "accent" ? undefined : tone}
      data-invalid={invalid ? "" : undefined}
      aria-invalid={invalid || undefined}
    >
      <BaseSwitch.Thumb className="fa-switch-thumb">
        {icons && size !== "sm" ? (
          <>
            <IconClose className="fa-switch-icon" data-icon="close" />
            <IconCheck className="fa-switch-icon" data-icon="check" />
          </>
        ) : null}
      </BaseSwitch.Thumb>
    </BaseSwitch.Root>
  )
  return disabledReason ? <Tooltip content={disabledReason}>{track}</Tooltip> : track
}

/**
 * On or off, applied immediately. The track takes the accent when on and the glass thumb
 * travels on the spring curve. Use a Checkbox instead when the choice only applies after
 * a Save.
 */
export function Switch({ label, description, className, disabled: disabledProp, id, ...rest }: SwitchProps) {
  const autoId = useId()
  const disabled = disabledProp || Boolean(rest.disabledReason)
  if (!label) return <SwitchTrack {...rest} id={id} disabled={disabled} className={className} />
  const controlId = id ?? autoId
  return (
    <ChoiceRow controlId={controlId} label={label} description={description} disabled={disabled} className={className}>
      <SwitchTrack {...rest} id={controlId} aria-describedby={cx(rest["aria-describedby"], description && descriptionId(controlId)) || undefined} disabled={disabled} />
    </ChoiceRow>
  )
}
