import { useMessages } from "../../lib/i18n/index.js"
import { fieldMessages } from "./messages.js"
import { Field as BaseField } from "@base-ui/react/field";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import type { ComponentProps, ReactNode } from "react";
import { IconAlert } from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { numberFormat } from "../../lib/locale/intl.js";
import { useLocale } from "../../lib/locale/use-locale.js";
import { Skeleton } from "../skeleton/index.js";
import { TruncatedText } from "../truncated-text/index.js";

export type FieldOrientation = "vertical" | "horizontal";
/** The "on" colour of choice controls. Status tones only when the choice is a status (R3.3). */
export type ChoiceTone = "accent" | "success" | "warning" | "danger";
export type ChoiceSize = "sm" | "md" | "lg";
/**
 * A text-like control's content width (R15.6). full (default) fills the form column;
 * short fits about 8 characters (port, year, PIN); medium about 24rem (title, name,
 * hostname). Never widen a control to fill a row beside another.
 */
export type FieldWidth = "short" | "medium" | "full";
/** The `data-width` value for a control's width: the width itself, or undefined for full (the default). */
export const widthAttr = (width: FieldWidth | undefined) =>
  width && width !== "full" ? width : undefined;
export type FieldSize = "sm" | "md" | "lg";

export interface FieldCounter {
  value: number;
  /** Upper value or visible-item limit, as specified by the type. */
  max: number;
}

export interface FieldProps extends Omit<
  BaseField.Root.Props,
  "className" | "children" | "render"
> {
  className?: string;
  /** Names the control. Omit only when a group legend or `aria-label` names it instead. */
  label?: ReactNode;
  /** Second line under the label in a horizontal field ("Automatically download…"). */
  description?: ReactNode;
  /** The message line's resting text. Only when the format or consequence is not obvious (R2.8). */
  hint?: ReactNode;
  /** Replaces the hint in place. Setting it marks the field and its control invalid. */
  error?: ReactNode;
  /** Non-blocking warning in the reserved message slot; errors take precedence. */
  warning?: ReactNode;
  /** Right side of the message line: `{ value: 70, max: 500 }` renders "70 / 500". */
  counter?: FieldCounter;
  /** Marks the label "Optional". Prefer this over marking required fields. */
  optional?: boolean;
  /** Shows the required marker. Pass `required` to the control as well. */
  required?: boolean;
  /** Right side of the label row: a live value readout or a small link. */
  aside?: ReactNode;
  /**
   * vertical: label above the control (text fields, selects).
   * horizontal: control first, label and description beside it (switches, checkboxes).
   */
  orientation?: FieldOrientation;
  /**
   * Render the label as a native <label>. Set false for trigger controls (select,
   * combobox trigger, slider, segmented) so clicking the label focuses instead of activating.
   */
  nativeLabel?: boolean;
  /** A heading above a horizontal field ("Auto-updates"). Renders a fieldset legend. */
  legend?: ReactNode;
  /**
   * reserve: the message line always exists (default for vertical fields), so an error
   * never moves anything (R9.1). auto: only rendered when there is a hint, error or counter.
   */
  message?: "reserve" | "auto";
  children: ReactNode;
}

/**
 * A labelled control with a reserved message line. The hint, the error and the counter
 * share one caption-high line under the control, so validation never shifts the layout.
 * Base UI Field wires the label, description and aria-invalid to whatever control sits
 * inside (Input, Select, Switch, Checkbox, Slider…).
 */
function FieldBase({
  label,
  description,
  hint,
  error,
  warning,
  counter,
  optional = false,
  required = false,
  aside,
  orientation = "vertical",
  nativeLabel = true,
  legend,
  message,
  invalid,
  className,
  children,
  ...rest
}: FieldProps) {
  const messages = useMessages(fieldMessages)

  const hasError =
    error !== undefined && error !== null && error !== false && error !== "";
  const reserve =
    (message ?? (orientation === "vertical" ? "reserve" : "auto")) ===
    "reserve";
  const over = counter ? counter.value > counter.max : false;
  const count = numberFormat(useLocale());

  const labelNode = label ? (
    <BaseField.Label
      className="fa-label fa-field-label"
      nativeLabel={nativeLabel}
      render={nativeLabel ? undefined : <div />}
    >
      {label}
    </BaseField.Label>
  ) : null;

  const messageText = hasError ? (
    <BaseField.Error match className="fa-field-error">
      <IconAlert />
      <TruncatedText className="fa-field-message-text">{error}</TruncatedText>
    </BaseField.Error>
  ) : warning ? (
    <BaseField.Description className="fa-field-warning">
      <IconAlert />
      <TruncatedText className="fa-field-message-text">{warning}</TruncatedText>
    </BaseField.Description>
  ) : hint ? (
    <BaseField.Description className="fa-hint fa-field-hint">
      <TruncatedText className="fa-field-message-text">{hint}</TruncatedText>
    </BaseField.Description>
  ) : null;

  const messageLine =
    reserve || messageText || counter ? (
      <div className="fa-field-message">
        <div className="fa-field-message-slot" aria-live="polite">
          {messageText}
        </div>
        {counter ? (
          <span
            className="fa-field-counter"
            data-over={over ? "" : undefined}
            data-numeric
          >
            {count.format(counter.value)} / {count.format(counter.max)}
          </span>
        ) : null}
      </div>
    ) : null;

  const head =
    labelNode || aside ? (
      <div className="fa-field-head">
        {labelNode}
        {required ? (
          <span className="fa-field-required" aria-hidden>
            *
          </span>
        ) : null}
        {optional ? <span className="fa-field-optional">{messages.optional}</span> : null}
        {aside ? <span className="fa-field-aside">{aside}</span> : null}
      </div>
    ) : null;

  const root = (
    <BaseField.Root
      {...rest}
      invalid={hasError ? true : invalid}
      className={cx("fa-field", legend ? undefined : className)}
      data-orientation={orientation}
    >
      {orientation === "horizontal" ? (
        <>
          <div className="fa-field-control">{children}</div>
          <div className="fa-field-text">
            {head}
            {description ? (
              <BaseField.Description className="fa-hint fa-field-description">
                {description}
              </BaseField.Description>
            ) : null}
          </div>
          {messageLine}
        </>
      ) : (
        <>
          {head}
          {children}
          {messageLine}
        </>
      )}
    </BaseField.Root>
  );

  if (!legend) return root;
  return (
    <BaseFieldset.Root
      className={cx("fa-fieldset", className)}
      data-variant="field"
    >
      <BaseFieldset.Legend className="fa-label fa-fieldset-legend">
        {legend}
      </BaseFieldset.Legend>
      {root}
    </BaseFieldset.Root>
  );
}

export interface FieldsetProps extends Omit<
  BaseFieldset.Root.Props,
  "className" | "render"
> {
  className?: string;
  /** Group heading. `section` renders it as an overline; `field` as a field label. */
  legend: ReactNode;
  variant?: "section" | "field";
}

/**
 * Groups related fields under one legend. Use `section` (overline) to split a long form
 * into parts, and `field` to label a set of checkboxes or radios like a single field.
 */
function Fieldset({
  legend,
  variant = "section",
  className,
  children,
  ...rest
}: FieldsetProps) {
  return (
    <BaseFieldset.Root
      {...rest}
      className={cx("fa-fieldset", className)}
      data-variant={variant}
    >
      <BaseFieldset.Legend
        className={cx(
          "fa-fieldset-legend",
          variant === "section" ? "fa-overline" : "fa-label",
        )}
      >
        {legend}
      </BaseFieldset.Legend>
      {children}
    </BaseFieldset.Root>
  );
}

export interface FieldSkeletonProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  /** The control the field holds; the placeholder takes exactly its box. */
  control?: "input" | "textarea" | "switch" | "checkbox";
  size?: FieldSize;
  /** Textarea rows (minRows). */
  rows?: number;
  /** Width of the label line. */
  labelWidth?: number | string;
  /** Direction of layout and keyboard navigation. */
  orientation?: FieldOrientation;
}

const CONTROL_HEIGHT: Record<FieldSize, string> = {
  sm: "var(--control-h-sm)",
  md: "var(--control-h-md)",
  lg: "var(--control-h-lg)",
};

/** Same formula as the textarea: one row is exactly one control height. */
const textareaHeight = (rows: number) =>
  `calc(${rows} * var(--type-body-line) + var(--control-h-md) - var(--type-body-line))`;

/**
 * The loading shape of a Field: a label-role text line, a block of the control's exact
 * height and the reserved message line — the same boxes as the loaded field (R9.3).
 */
function FieldSkeleton({
  control = "input",
  size = "md",
  rows = 3,
  labelWidth = "40%",
  orientation = control === "switch" || control === "checkbox"
    ? "horizontal"
    : "vertical",
  className,
  ...rest
}: FieldSkeletonProps) {
  if (orientation === "horizontal") {
    return (
      <div
        aria-hidden
        {...rest}
        className={cx("fa-field fa-field-skeleton", className)}
        data-orientation="horizontal"
      >
        <div className="fa-field-control">
          {control === "checkbox" ? (
            <Skeleton.Block
              width="var(--check-size)"
              height="var(--check-size)"
              radius="item"
            />
          ) : (
            <Skeleton.Block
              width="var(--switch-w)"
              height="var(--switch-h)"
              radius="full"
            />
          )}
        </div>
        <div className="fa-field-text">
          <Skeleton.Text type="label" width={labelWidth} />
          <Skeleton.Text type="caption" width="80%" />
        </div>
      </div>
    );
  }
  return (
    <div
      aria-hidden
      {...rest}
      className={cx("fa-field fa-field-skeleton", className)}
      data-orientation="vertical"
    >
      <div className="fa-field-head">
        <Skeleton.Text type="label" width={labelWidth} />
      </div>
      <Skeleton.Block
        width="100%"
        height={
          control === "textarea" ? textareaHeight(rows) : CONTROL_HEIGHT[size]
        }
        radius="control"
      />
      <div className="fa-field-message" />
    </div>
  );
}

export interface ChoiceRowProps {
  /** The control's id (the label points at it). */
  controlId: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** The checkbox, radio or switch. Give it `id={controlId}` and `aria-describedby={descriptionId(controlId)}`. */
  children: ReactNode;
}

/** The id ChoiceRow gives a control's description: `${controlId}-description`, for `aria-describedby`. */
export const descriptionId = (controlId: string) => `${controlId}-description`;

/**
 * A checkbox, radio or switch with its own label and description beside it (the
 * controls' `label` prop). A native label points at the control, so clicking the text
 * toggles it; works inside or outside a Field.
 */
export function ChoiceRow({
  controlId,
  label,
  description,
  disabled,
  className,
  children,
}: ChoiceRowProps) {
  return (
    <div
      className={cx("fa-choice", className)}
      data-disabled={disabled ? "" : undefined}
    >
      <span className="fa-choice-control">{children}</span>
      <span className="fa-choice-text">
        <label htmlFor={controlId} className="fa-choice-label">
          {label}
        </label>
        {description ? (
          <span
            id={descriptionId(controlId)}
            className="fa-hint fa-choice-description"
          >
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** Field namespace: `<Field label …>` plus the parts for custom layouts. */
export const Field = Object.assign(FieldBase, {
  Root: BaseField.Root,
  Label: BaseField.Label,
  Description: BaseField.Description,
  Error: BaseField.Error,
  Item: BaseField.Item,
  Skeleton: FieldSkeleton,
});

export { Fieldset, FieldSkeleton };
