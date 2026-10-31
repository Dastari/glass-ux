import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset"
import { Radio as BaseRadio } from "@base-ui/react/radio"
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group"
import { useId, type ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { ChoiceRow, descriptionId, type ChoiceSize, type ChoiceTone } from "../field/index.js"
import { FieldOptionItem } from "../field/field.js"

export interface RadioProps<V extends string = string>
  extends Omit<BaseRadio.Root.Props<V>, "className" | "render" | "nativeButton"> {
  className?: string
  /** Label beside the circle. */
  label?: ReactNode
  description?: ReactNode
  size?: ChoiceSize
  tone?: ChoiceTone
}

function RadioCircle<V extends string>({ className, size = "md", tone, ...rest }: Omit<RadioProps<V>, "label" | "description">) {
  return (
    <BaseRadio.Root
      {...rest}
      nativeButton
      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- named by Base UI (aria-labelledby) or the caller's aria-label
      render={<button type="button" />}
      className={cx("fa-radio", className)}
      data-size={size}
      data-tone={tone === "accent" ? undefined : tone}
    >
      <BaseRadio.Indicator className="fa-radio-indicator" />
    </BaseRadio.Root>
  )
}

/**
 * One option of a RadioGroup. The chosen circle fills with the accent around a dot.
 * Each option is its own Field item, so inside a Field every radio keeps its own id and name.
 */
export function Radio<V extends string = string>({ label, description, className, disabled, id, ...rest }: RadioProps<V>) {
  const autoId = useId()
  const controlId = id ?? autoId
  if (!label)
    return (
      <FieldOptionItem>
        <RadioCircle {...rest} id={controlId} disabled={disabled} className={className} />
      </FieldOptionItem>
    )
  return (
    <FieldOptionItem>
      <ChoiceRow controlId={controlId} label={label} description={description} disabled={disabled} className={className}>
        <RadioCircle {...rest} id={controlId} aria-describedby={cx(rest["aria-describedby"], description && descriptionId(controlId)) || undefined} disabled={disabled} />
      </ChoiceRow>
    </FieldOptionItem>
  )
}

export interface RadioGroupProps<V extends string = string>
  extends Omit<BaseRadioGroup.Props<V>, "className" | "render"> {
  className?: string
  /** Names the group (a fieldset legend in the field-label style). */
  legend?: ReactNode
  /** list: rows of radios. cards: RadioCard tiles that reflow by container width. */
  variant?: "list" | "cards"
  /** Direction of layout and keyboard navigation. */
  orientation?: "vertical" | "horizontal"
  /** Invalid outside a Field. */
  invalid?: boolean
  /** Tone for every option in the group. */
  tone?: ChoiceTone
  children: ReactNode
}

/** One choice from a few visible options. Arrow keys move and select; Tab leaves the group. */
export function RadioGroup<V extends string = string>({
  legend,
  variant = "list",
  orientation = "vertical",
  invalid,
  tone,
  className,
  children,
  ...rest
}: RadioGroupProps<V>) {
  const classes = cx(variant === "cards" ? "fa-radio-cards" : "fa-choice-group", className)
  const data = {
    "data-orientation": orientation,
    "data-invalid": invalid ? "" : undefined,
    "data-tone": tone === "accent" ? undefined : tone,
  }
  if (!legend) {
    return (
      <BaseRadioGroup<V> {...rest} className={classes} aria-invalid={invalid || undefined} {...data}>
        {children}
      </BaseRadioGroup>
    )
  }
  return (
    <BaseFieldset.Root
      render={<BaseRadioGroup<V> {...rest} aria-invalid={invalid || undefined} />}
      className={classes}
      {...data}
    >
      <BaseFieldset.Legend className="fa-label fa-fieldset-legend">{legend}</BaseFieldset.Legend>
      {children}
    </BaseFieldset.Root>
  )
}

export interface RadioCardProps<V extends string = string>
  extends Omit<BaseRadio.Root.Props<V>, "className" | "render" | "nativeButton" | "children" | "title"> {
  className?: string
  title: ReactNode
  /** One line that says what choosing this does ("View and control the device"). */
  description?: ReactNode
  /** Optional icon tile. Pass the icon without a size. */
  icon?: ReactNode
  tone?: ChoiceTone
}

/**
 * A radio as a tile: title, description and the radio circle. Used where each option
 * needs a sentence, typically in a dialog ("Interactive session · View and control the
 * device"). Chosen = accent-soft fill with an accent edge.
 */
export function RadioCard<V extends string = string>({ title, description, icon, tone, className, ...rest }: RadioCardProps<V>) {
  const id = useId()
  return (
    <FieldOptionItem>
    <BaseRadio.Root
      {...rest}
      id={rest.id ?? id}
      nativeButton
      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- named by its title (aria-labelledby)
      render={<button type="button" />}
      className={cx("fa-radio-card fa-lit", className)}
      data-tone={tone === "accent" ? undefined : tone}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
    >
      <span className="fa-radio fa-radio-card-circle" aria-hidden>
        <BaseRadio.Indicator className="fa-radio-indicator" />
      </span>
      {icon ? (
        <span className="fa-tile-icon fa-radio-card-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="fa-radio-card-text">
        <span id={`${id}-title`} className="fa-radio-card-title">
          {title}
        </span>
        {description ? (
          <span id={`${id}-description`} className="fa-radio-card-description">
            {description}
          </span>
        ) : null}
      </span>
    </BaseRadio.Root>
    </FieldOptionItem>
  )
}
