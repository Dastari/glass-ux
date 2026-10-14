import { Switch as BaseSwitch } from "@base-ui/react/switch"
import { useId, type ReactNode } from "react"
import { IconCheck, IconClose } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
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
}

function SwitchTrack({ size = "md", tone, icons = false, invalid, className, ...rest }: Omit<SwitchProps, "label" | "description">) {
  return (
    <BaseSwitch.Root
      {...rest}
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
}

/**
 * On or off, applied immediately. The track takes the accent when on and the glass thumb
 * travels on the spring curve. Use a Checkbox instead when the choice only applies after
 * a Save.
 */
export function Switch({ label, description, className, disabled, id, ...rest }: SwitchProps) {
  const autoId = useId()
  if (!label) return <SwitchTrack {...rest} id={id} disabled={disabled} className={className} />
  const controlId = id ?? autoId
  return (
    <ChoiceRow controlId={controlId} label={label} description={description} disabled={disabled} className={className}>
      <SwitchTrack {...rest} id={controlId} aria-describedby={description ? descriptionId(controlId) : undefined} disabled={disabled} />
    </ChoiceRow>
  )
}
