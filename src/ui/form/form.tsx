import { useMessages } from "../../lib/i18n/index.js"
import { formMessages } from "./messages.js"
import { RichTextField } from "../rich-text/index.js";
import {
  createFormHook,
  useStore,
  type AnyFormApi,
} from "@tanstack/react-form";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx.js";
import { feedbackHold } from "../../lib/motion.js";
import { AddressField } from "../address-field/index.js";
import { Autocomplete } from "../autocomplete/index.js";
import {
  Button,
  type ButtonProps,
  type ButtonStatus,
} from "../button/index.js";
import { ByteSizeField } from "../byte-size-field/index.js";
import { Checkbox } from "../checkbox/index.js";
import {
  Combobox,
  type ComboboxOption,
  type OptionItem,
  type OptionSource,
} from "../combobox/index.js";
import { CoordinatesField } from "../coordinates-field/index.js";
import { CountryField } from "../country-select/index.js";
import { DateTimeField, TimeField } from "../date-picker/fields.js";
import { DurationField } from "../duration-field/index.js";
import { EmailField } from "../email-field/index.js";
import {
  Field,
  type FieldWidth,
} from "../field/index.js";
import { DomainField, HostnameField } from "../hostname-field/index.js";
import { Input, type InputProps } from "../input/index.js";
import { IpField } from "../ip-field/index.js";
import { MacAddressField } from "../mac-field/index.js";
import { MoneyField } from "../money-field/index.js";
import { MultiSelect } from "../multi-select/index.js";
import { NumberField, type NumberFieldProps } from "../number-field/index.js";
import { OtpField } from "../otp-field/index.js";
import { PasswordField } from "../password-field/index.js";
import { PercentField } from "../percent-field/index.js";
import { MobileField, PhoneField } from "../phone-field/index.js";
import { PortField } from "../port-field/index.js";
import { Radio, RadioCard, RadioGroup } from "../radio/index.js";
import { Segmented, type SegmentedOption } from "../segmented/index.js";
import { Select, type SelectOptions } from "../select/index.js";
import { SettingRow } from "../setting-row/index.js";
import { Slider, type SliderProps } from "../slider/index.js";
import { Switch } from "../switch/index.js";
import { TagInput, type TagInputProps } from "../tag-input/index.js";
import { Textarea } from "../textarea/index.js";
import { TimeZoneField } from "../time-zone-select/index.js";
import { UrlField } from "../url-field/index.js";
import {
  fieldContext,
  formContext,
  useBoundField,
  useFieldContext,
  useFormContext,
  type FieldChrome,
} from "./context.js";
import { blurThenChange, focusFirstInvalid } from "./validation.js";
import { numberFormat } from "../../lib/locale/intl.js";
import { useLocale } from "../../lib/locale/use-locale.js";

export { fieldContext, formContext, useFieldContext, useFormContext };
// Layout pieces live apart so importing them does not pull in the form kit (useAppForm).
export { FormActions, FormGroup, FormStack, type FormGroupProps, type FormStackProps } from "./layout.js";

/** Field chrome every bound field accepts (label, hint, optional…). */
type Chrome = FieldChrome;

/** Error, invalid, dirty and touched for the Field wrapping a bound control. */
const useFieldState = useBoundField;

// ── Bound fields ─────────────────────────────────────────────────────────────

export interface TextFieldProps
  extends
    Chrome,
    Pick<
      InputProps,
      | "type"
      | "placeholder"
      | "icon"
      | "unit"
      | "size"
      | "width"
      | "autoComplete"
      | "maxLength"
      | "readOnly"
      | "inputMode"
      | "spellCheck"
    > {
  /** Show "n / maxLength" on the message line. */
  counter?: boolean;
}

function TextField({
  label,
  hint,
  warning,
  optional,
  required,
  aside,
  className,
  disabled,
  counter,
  maxLength,
  ...control
}: TextFieldProps) {
  const { field, error, root } = useFieldState<string>();
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      warning={warning}
      optional={optional}
      required={required}
      aside={aside}

      className={className}
      disabled={disabled}
      counter={
        counter && maxLength
          ? { value: field.state.value.length, max: maxLength }
          : undefined
      }
    >
      <Input
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );
}

export interface TextareaFieldProps extends Chrome {
  placeholder?: string;
  /** Hard limit; the counter shows "n / max" and turns danger past it. */
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
  readOnly?: boolean;
}

function TextareaField({
  label,
  hint,
  optional,
  required,
  aside,
  className,
  disabled,
  maxLength,
  ...control
}: TextareaFieldProps) {
  const { field, root } = useFieldState<string>();
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      optional={optional}
      required={required}
      aside={aside}

      className={className}
      disabled={disabled}
      counter={
        maxLength
          ? { value: field.state.value.length, max: maxLength }
          : undefined
      }
    >
      <Textarea
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
      />
    </Field>
  );
}

export interface SelectFieldProps<V extends string = string> extends Chrome {
  options: SelectOptions<V>;
  /** Available width or named width tier. */
  width?: FieldWidth;
  placeholder?: string;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
}

function SelectField<V extends string = string>({
  label,
  hint,
  optional,
  required,
  aside,
  className,
  disabled,
  ...control
}: SelectFieldProps<V>) {
  const { field, error, root } = useFieldState<V | null>();
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
      nativeLabel={false}
    >
      <Select<V>
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

export interface ComboboxFieldProps<V extends string = string> extends Chrome {
  /** A static list… */
  options?: Array<ComboboxOption<V>>;
  /** …or an async source. */
  source?: OptionSource<V>;
  /** Available width or named width tier. */
  width?: FieldWidth;
  placeholder?: string;
  icon?: ReactNode;
  /** Shows loading feedback in the space reserved for the content. */
  loading?: boolean;
  /** Show the Clear button. Default: on unless `required`. */
  clearable?: boolean;
}

export interface MultiSelectFieldProps<
  V extends string = string,
> extends Omit<ComboboxFieldProps<V>, "clearable"> {
  /** Chips wrap onto more lines in a form (default). */
  wrap?: boolean;
}

function ComboboxField<V extends string = string>({
  label,
  hint,
  optional,
  required,
  aside,
  className,
  disabled,
  ...control
}: ComboboxFieldProps<V>) {
  const { field, error, root } = useFieldState<V | null>();
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
    >
      <Combobox<V>
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

function MultiSelectField<V extends string = string>({
  label,
  hint,
  optional,
  required,
  aside,
  className,
  disabled,
  wrap = true,
  ...control
}: MultiSelectFieldProps<V>) {
  const { field, error, root } = useFieldState<V[]>();
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
    >
      <MultiSelect<V>
        {...control}
        wrap={wrap}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

export interface AutocompleteFieldProps<
  V extends string = string,
> extends Chrome {
  options?: Array<OptionItem<V>>;
  /** The typed source adapter or asset definition consumed by this component. */
  source?: OptionSource<V>;
  /** Available width or named width tier. */
  width?: FieldWidth;
  placeholder?: string;
  icon?: ReactNode;
  /** Lets the component fill a box with a definite size. */
  fill?: "label" | "value";
}

/** Free text with suggestions (hostnames, paths, search terms). */
function AutocompleteField<V extends string = string>({
  label,
  hint,
  optional,
  required,
  aside,
  className,
  disabled,
  ...control
}: AutocompleteFieldProps<V>) {
  const { field, error, root } = useFieldState<string>();
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
    >
      <Autocomplete<V>
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

export interface TagInputFieldProps
  extends
    Chrome,
    Pick<
      TagInputProps,
      | "suggestions"
      | "source"
      | "allowCreate"
      | "normalize"
      | "validate"
      | "max"
      | "placeholder"
      | "icon"
      | "width"
      | "wrap"
    > {}

/**
 * Free-entry chips bound to a string[] field. The message line shows the schema's error,
 * or the first chip that fails `validate` (“avery@: Enter an email such as …”).
 */
function TagInputField({
  label,
  hint,
  optional,
  required,
  aside,
  className,
  disabled,
  ...control
}: TagInputFieldProps) {
  const { field, error, root } = useFieldState<string[]>();
  const [chipError, setChipError] = useState<string>();
  const shown = error ?? chipError;
  return (
    <Field
      {...root}
      error={shown}
      label={label}
      hint={hint}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
    >
      <TagInput
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        onErrorChange={setChipError}
        disabled={disabled}
        invalid={Boolean(shown)}
      />
    </Field>
  );
}

export interface SwitchRowProps {
  /** Names the setting ("Keep agent up to date"). */
  label: ReactNode;
  /** What turning it on does. */
  description?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * A boolean as a switch in a setting row (R15.4). Inside a form it saves with the form;
 * for a setting that applies at once, use SettingRow with `status` directly.
 */
function SwitchRow({
  label,
  description,
  badge,
  disabled,
  className,
}: SwitchRowProps) {
  const { field } = useFieldState<boolean>();
  return (
    <SettingRow
      label={label}
      description={description}
      badge={badge}
      disabled={disabled}
      className={className}
      control={
        <Switch
          name={field.name}
          checked={field.state.value}
          onCheckedChange={(checked) => field.handleChange(checked)}
          onBlur={field.handleBlur}
          disabled={disabled}
        />
      }
    />
  );
}

export interface CheckboxFieldProps {
  /** The statement being confirmed ("I have notified the site contact"). */
  label: ReactNode;
  description?: ReactNode;
  /** Supporting text in the field’s reserved message slot. Validation errors take precedence. */
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Explicit consent: a checkbox with its statement and a message line for the error
 * (R15.4 — never a lone checkbox for a setting).
 */
function CheckboxField({
  label,
  description,
  hint,
  disabled,
  className,
}: CheckboxFieldProps) {
  const { field, error, root } = useFieldState<boolean>();
  return (
    <Field
      {...root}
      orientation="horizontal"
      message="reserve"
      label={label}
      description={description}
      hint={hint}
      className={className}
      disabled={disabled}
    >
      <Checkbox
        name={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

export interface SegmentedRowProps<V extends string = string> {
  label: ReactNode;
  description?: ReactNode;
  /** Two to four short options (R15.5). */
  options: Array<SegmentedOption<V>>;
  disabled?: boolean;
  className?: string;
}

/** Two to four always-visible modes as a segmented control in a setting row. */
function SegmentedRow<V extends string = string>({
  label,
  description,
  options,
  disabled,
  className,
}: SegmentedRowProps<V>) {
  const { field, error } = useFieldState<V>();
  return (
    <SettingRow
      label={label}
      description={description}
      disabled={disabled}
      className={className}
      status={error ? "error" : undefined}
      error={error}
      control={
        <Segmented<V>
          size="sm"
          options={options}
          value={field.state.value}
          onValueChange={(value) => field.handleChange(value)}
          onBlur={() => field.handleBlur()}
          disabled={disabled}
          invalid={Boolean(error)}
        />
      }
    />
  );
}

export interface RadioGroupFieldProps<
  V extends string = string,
> extends Chrome {
  options: Array<{
    value: V;
    label: string;
    description?: string;
    icon?: ReactNode;
    disabled?: boolean;
  }>;
  variant?: "list" | "cards";
  /** Direction of layout and keyboard navigation. */
  orientation?: "vertical" | "horizontal";
}

function RadioGroupField<V extends string = string>({
  label,
  hint,
  className,
  disabled,
  options,
  variant = "list",
  orientation,
}: RadioGroupFieldProps<V>) {
  const { field, error, root } = useFieldState<V>();
  return (
    <Field {...root} hint={hint} className={className} disabled={disabled}>
      <RadioGroup<V>
        legend={label}
        variant={variant}
        orientation={orientation}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value as V)}
        disabled={disabled}
        invalid={Boolean(error)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            field.handleBlur();
        }}
      >
        {options.map((option) =>
          variant === "cards" ? (
            <RadioCard<V>
              key={option.value}
              value={option.value}
              title={option.label}
              description={option.description}
              icon={option.icon}
              disabled={option.disabled}
            />
          ) : (
            <Radio<V>
              key={option.value}
              value={option.value}
              label={option.label}
              description={option.description}
              disabled={option.disabled}
            />
          ),
        )}
      </RadioGroup>
    </Field>
  );
}

export interface NumberFieldBoundProps
  extends
    Chrome,
    Pick<
      NumberFieldProps,
      | "min"
      | "max"
      | "step"
      | "largeStep"
      | "format"
      | "unit"
      | "scrubLabel"
      | "size"
      | "width"
      | "placeholder"
      | "readOnly"
      | "steppers"
    > {}

function NumberInputField({
  label,
  hint,
  optional,
  required,
  aside,
  className,
  disabled,
  ...control
}: NumberFieldBoundProps) {
  const { field, error, root } = useFieldState<number | null>();
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
    >
      <NumberField
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  );
}

export interface SliderFieldProps
  extends
    Chrome,
    Pick<
      SliderProps,
      "min" | "max" | "step" | "largeStep" | "format" | "unit" | "marks" | "locale"
    > {
  /** Show the current value at the end of the label row (default). */
  showValue?: boolean;
}

function SliderField({
  label,
  hint,
  optional,
  required,
  className,
  disabled,
  showValue = true,
  ...control
}: SliderFieldProps) {
  const { field, root } = useFieldState<number>();
  const number = numberFormat(useLocale(control.locale));
  const show =
    control.format ??
    ((value: number) =>
      control.unit
        ? `${number.format(value)} ${control.unit}`
        : number.format(value));
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      optional={optional}
      required={required}

      className={className}
      disabled={disabled}
      nativeLabel={false}
      aside={showValue ? show(field.state.value) : undefined}
    >
      <Slider
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) =>
          field.handleChange(Array.isArray(value) ? (value[0] ?? 0) : value)
        }
        onBlur={field.handleBlur}
        disabled={disabled}
      />
    </Field>
  );
}

// ── Form-level pieces ────────────────────────────────────────────────────────

interface FormStatus {
  /** Current operation or connection status. */
  status: ButtonStatus;
}
const FormStatusContext = createContext<FormStatus>({ status: "idle" });

export interface SubmitButtonProps extends Omit<
  ButtonProps,
  "type" | "status" | "onClick"
> {}

/**
 * The form's Save. Disabled until something changes; then pending → ✓ Saved in place
 * (R15.3). It reports the form's own submission, so Enter in a field shows it too.
 */
function SubmitButton({
  children: childrenProp,
  pendingLabel: pendingLabelProp,
  successLabel: successLabelProp,
  errorLabel: errorLabelProp,
  variant = "primary",
  disabled,
  ...rest
}: SubmitButtonProps) {
  const messages = useMessages(formMessages)
  const children = childrenProp ?? messages.saveChanges
  const pendingLabel = pendingLabelProp ?? messages.saving
  const successLabel = successLabelProp ?? messages.saved
  const errorLabel = errorLabelProp ?? messages.notSaved

  const form = useFormContext();
  const { status } = useContext(FormStatusContext);
  const unchanged = useStore(form.store, (state) => state.isDefaultValue);
  return (
    <Button
      {...rest}
      type="submit"
      variant={variant}
      status={status}
      pendingLabel={pendingLabel}
      successLabel={successLabel}
      errorLabel={errorLabel}
      disabled={disabled || (unchanged && status === "idle")}
    >
      {children}
    </Button>
  );
}

export interface CancelButtonProps extends Omit<
  ButtonProps,
  "type" | "onClick"
> {
  /** Called after the form reverts (close the dialog here). */
  onCancel?: () => void;
}

/** Reverts every field to its saved value (R15.4). */
function CancelButton({
  children: childrenProp,
  onCancel,
  variant = "secondary",
  disabled,
  ...rest
}: CancelButtonProps) {
  const messages = useMessages(formMessages)
  const children = childrenProp ?? messages.cancel

  const form = useFormContext();
  const unchanged = useStore(form.store, (state) => state.isDefaultValue);
  return (
    <Button
      {...rest}
      type="button"
      variant={variant}
      disabled={disabled || (unchanged && !onCancel)}
      onClick={() => {
        form.reset();
        onCancel?.();
      }}
    >
      {children}
    </Button>
  );
}

/**
 * TanStack Form's hooks bound to the kit: `useAppForm` creates a form whose `AppField` offers
 * every bound field (TextField, AddressField…) and whose `AppForm` offers SubmitButton and
 * CancelButton; `withForm` and `withFieldGroup` build form sections that receive such a form.
 */
export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextareaField,
    RichTextField,
    SelectField,
    ComboboxField,
    MultiSelectField,
    AutocompleteField,
    TagInputField,
    SwitchRow,
    CheckboxField,
    SegmentedRow,
    RadioGroupField,
    NumberField: NumberInputField,
    SliderField,
    // Typed inputs (docs/components): each also exported from its own folder with a schema helper.
    AddressField,
    PhoneField,
    MobileField,
    EmailField,
    UrlField,
    PasswordField,
    OtpField,
    CoordinatesField,
    IpField,
    MacAddressField,
    PortField,
    HostnameField,
    DomainField,
    DurationField,
    ByteSizeField,
    MoneyField,
    PercentField,
    CountryField,
    TimeZoneField,
    TimeField,
    DateTimeField,
  },
  formComponents: {
    SubmitButton,
    CancelButton,
  },
});

/**
 * Options every Glass UX form spreads into `useAppForm`: blur-then-change validation against
 * the form's schema, and focus on the first invalid field when a submit is refused.
 *
 *   const form = useAppForm({ ...formBehaviour, defaultValues, validators: { onDynamic: schema }, onSubmit })
 */
export const formBehaviour = {
  validationLogic: blurThenChange,
  onSubmitInvalid: ({ formApi }: { formApi: AnyFormApi }) =>
    focusFirstInvalid(formApi.formId),
};

/** What Form needs from a form instance (any `useAppForm` result fits). */
export interface FormInstance {
  formId: string;
  /** Controlled view state, including loading, empty and error states. */
  state: { isSubmitSuccessful: boolean; values: unknown };
  AppForm: ComponentType<PropsWithChildren>;
  handleSubmit: () => Promise<void>;
  validateAllFields: (cause: "submit") => Promise<unknown>;
  reset: (values?: never) => void;
}

export interface FormProps extends Omit<
  ComponentProps<"form">,
  "onSubmit" | "onError"
> {
  /** Form instance whose values, validation and submission state are observed. */
  form: FormInstance;
  /** A failed save (onSubmit threw). The button shows ✕; put the reason in a toast here. */
  onError?: (error: unknown) => void;
}

/**
 * The <form> element for a `useAppForm` instance. Submitting (button or Enter) validates
 * every field, focuses the first invalid one, or saves: the SubmitButton shows pending →
 * ✓ in place, and the form takes the saved values as its new baseline. Pass the saved
 * record back as `defaultValues` (it normally comes from the server).
 */
export function Form({
  form,
  onError,
  className,
  children,
  ...rest
}: FormProps) {
  const [status, setStatus] = useState<ButtonStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const hold = (next: ButtonStatus) => {
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), feedbackHold());
  };

  const submit = async () => {
    if (status === "pending") return;
    clearTimeout(timer.current);
    setStatus("pending");
    try {
      await form.validateAllFields("submit");
      await form.handleSubmit();
      if (form.state.isSubmitSuccessful) {
        form.reset(form.state.values as never);
        hold("success");
      } else {
        setStatus("idle");
      }
    } catch (error) {
      hold("error");
      onError?.(error);
    }
  };

  return (
    <form.AppForm>
      <FormStatusContext.Provider value={{ status }}>
        <form
          noValidate
          {...rest}
          className={cx("fa-form", className)}
          data-form={form.formId}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void submit();
          }}
        >
          {children}
        </form>
      </FormStatusContext.Provider>
    </form.AppForm>
  );
}

