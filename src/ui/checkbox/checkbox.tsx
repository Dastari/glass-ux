import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox"
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group"
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset"
import { useId, type ReactNode } from "react"
import { IconCheck, IconMinus } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { ChoiceRow, descriptionId, type ChoiceSize, type ChoiceTone } from "../field/index.js"
import { FieldOptionItem } from "../field/field.js"

export interface CheckboxProps extends Omit<BaseCheckbox.Root.Props, "className" | "render" | "nativeButton"> {
  className?: string
  /** Label beside the box. Omit when a Field (or an aria-label) names it. */
  label?: ReactNode
  /** Second line under the label. */
  description?: ReactNode
  /** Invalid outside a Field. */
  invalid?: boolean
  size?: ChoiceSize
  /** The ticked colour. Status tones only when the choice is a status (R3.3). */
  tone?: ChoiceTone
}

function CheckboxBox({ className, invalid, size = "md", tone, ...rest }: Omit<CheckboxProps, "label" | "description">) {
  return (
    <BaseCheckbox.Root
      {...rest}
      nativeButton
      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- named by Base UI (aria-labelledby) or the caller's aria-label
      render={<button type="button" />}
      className={cx("fa-check", className)}
      data-size={size}
      data-tone={tone === "accent" ? undefined : tone}
      data-invalid={invalid ? "" : undefined}
      aria-invalid={invalid || undefined}
    >
      <BaseCheckbox.Indicator
        className="fa-check-indicator"
        render={(props, state) => <span {...props}>{state.indeterminate ? <IconMinus /> : <IconCheck />}</span>}
      />
    </BaseCheckbox.Root>
  )
}

/**
 * A box that is ticked, unticked or mixed. Ticking fills it with the accent and draws the
 * ✓ on the spring curve. Give it a `label` for a stand-alone row, or put it in a
 * horizontal Field for a label, description and message line.
 */
export function Checkbox({ label, description, className, disabled, id, ...rest }: CheckboxProps) {
  const autoId = useId()
  if (!label) return <CheckboxBox {...rest} id={id} disabled={disabled} className={className} />
  const controlId = id ?? autoId
  // A labelled checkbox is its own Field item, so in a group inside a Field each keeps its id and name.
  return (
    <FieldOptionItem>
      <ChoiceRow controlId={controlId} label={label} description={description} disabled={disabled} className={className}>
        <CheckboxBox {...rest} id={controlId} aria-describedby={cx(rest["aria-describedby"], description && descriptionId(controlId)) || undefined} disabled={disabled} />
      </ChoiceRow>
    </FieldOptionItem>
  )
}

export interface CheckboxGroupProps extends Omit<BaseCheckboxGroup.Props, "className" | "render"> {
  className?: string
  /** Tone for every checkbox in the group. */
  tone?: ChoiceTone
  /** Names the group (rendered as a fieldset legend in the field-label style). */
  legend?: ReactNode
  /** Direction of layout and keyboard navigation. */
  orientation?: "vertical" | "horizontal"
  children: ReactNode
}

/**
 * Several related checkboxes sharing one value array. A checkbox with `parent` ticks or
 * clears the rest and shows the mixed state when only some are ticked (pass `allValues`).
 */
export function CheckboxGroup({ legend, orientation = "vertical", tone, className, children, ...rest }: CheckboxGroupProps) {
  const toneAttr = tone === "accent" ? undefined : tone
  if (!legend) {
    return (
      <BaseCheckboxGroup {...rest} className={cx("fa-choice-group", className)} data-orientation={orientation} data-tone={toneAttr}>
        {children}
      </BaseCheckboxGroup>
    )
  }
  return (
    <BaseFieldset.Root
      render={<BaseCheckboxGroup {...rest} />}
      className={cx("fa-choice-group", className)}
      data-orientation={orientation}
      data-tone={toneAttr}
    >
      <BaseFieldset.Legend className="fa-label fa-fieldset-legend">{legend}</BaseFieldset.Legend>
      {children}
    </BaseFieldset.Root>
  )
}
