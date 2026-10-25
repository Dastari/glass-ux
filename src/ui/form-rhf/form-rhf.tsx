import {
  useId,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  FormProvider,
  useController,
  type Control,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type SubmitHandler,
  type UseControllerProps,
  type UseControllerReturn,
  type UseFormReturn,
} from "react-hook-form";
import {
  AddressField,
  type AddressFieldProps,
} from "../address-field/index.js";
import {
  AddressEditor,
  type AddressParts,
  type PartBinding,
} from "../address-field/address-field.js";
import type { AddressValue } from "../address-field/address.js";
import { FieldBindingContext, type FieldBinding } from "../form/binding.js";
import { focusFirstInvalid } from "../form/validation.js";

/** RHF validation settings: first blur, then change; submitted errors revalidate on change. */
export const rhfFormBehaviour = {
  mode: "onTouched",
  reValidateMode: "onChange",
  shouldFocusError: true,
} as const;

/** Value-control props, checked-control props and field chrome returned by useRhfField. */
export interface RhfFieldBinding<
  T extends FieldValues,
  N extends FieldPath<T>,
> extends UseControllerReturn<T, N> {
  /** Spread on a bare value control such as EmailInput or MoneyInput. */
  controlProps: {
    name: N;
    value: FieldPathValue<T, N>;
    onValueChange: (value: FieldPathValue<T, N>) => void;
    onBlur: () => void;
    ref: UseControllerReturn<T, N>["field"]["ref"];
    invalid: boolean;
    disabled?: boolean;
  };
  /** Spread on Checkbox or Switch for a boolean field. */
  checkedProps: {
    name: N;
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
    onBlur: () => void;
    ref: UseControllerReturn<T, N>["field"]["ref"];
    invalid: boolean;
    disabled?: boolean;
  };
  /** Spread on the Field surrounding a bare control to reuse the shared error line. */
  fieldProps: { name: N; error?: string; dirty: boolean; touched: boolean };
}

/**
 * Connect a bare Glass UX control to RHF without converting typed values into DOM events.
 * Spread controlProps on Input, Select, MoneyInput, DateField or another value control;
 * spread fieldProps on its surrounding Field. Checkbox and Switch use checkedProps.
 * @example
 * const { controlProps, fieldProps } = useRhfField({ control, name: "email" });
 * // <Field {...fieldProps} label="Email"><EmailInput {...controlProps} /></Field>
 */
export function useRhfField<
  T extends FieldValues,
  N extends FieldPath<T>,
  O = T,
>(options: UseControllerProps<T, N, O>): RhfFieldBinding<T, N> {
  const { field, fieldState, formState } = useController(options);
  return {
    field,
    fieldState,
    formState,
    controlProps: {
      name: field.name,
      value: field.value,
      onValueChange: (value: FieldPathValue<T, N>) => field.onChange(value),
      onBlur: field.onBlur,
      ref: field.ref,
      invalid: fieldState.invalid,
      disabled: field.disabled,
    },
    checkedProps: {
      name: field.name,
      checked: field.value as boolean,
      onCheckedChange: (value: boolean) => field.onChange(value),
      onBlur: field.onBlur,
      ref: field.ref,
      invalid: fieldState.invalid,
      disabled: field.disabled,
    },
    fieldProps: {
      name: field.name,
      error: fieldState.error?.message,
      dirty: fieldState.isDirty,
      touched: fieldState.isTouched,
    },
  };
}

/** Props for an RHF controller around an existing Glass UX bound field. */
export type RhfFieldProps<
  T extends FieldValues,
  N extends FieldPath<T>,
  P extends object,
  O = T,
> = UseControllerProps<T, N, O> & {
  /** Existing bound component, such as EmailField, IpField, PortField or MoneyField. */
  component: ComponentType<P>;
} & Omit<P, keyof UseControllerProps<T, N, O> | "component">;

const focusSelector =
  "input:not([type='hidden']):not([tabindex='-1']),textarea,button:not([tabindex='-1']),[role='slider'],[contenteditable='true'],[tabindex='0']";

/** Bind an existing typed field to RHF, preserving its label, normalisation and reserved error line. */
export function RhfField<
  T extends FieldValues,
  N extends FieldPath<T>,
  P extends object,
  O = T,
>({
  component: Component,
  control,
  name,
  rules,
  defaultValue,
  shouldUnregister,
  disabled,
  exact,
  ...props
}: RhfFieldProps<T, N, P, O>) {
  const result = useRhfField({
    control,
    name,
    rules,
    defaultValue,
    shouldUnregister,
    disabled,
    exact,
  });
  const { field, fieldState } = result;
  const binding: FieldBinding<unknown> = {
    name: field.name,
    state: {
      value: field.value,
      meta: {
        errors: fieldState.error ? [fieldState.error] : [],
        isDirty: fieldState.isDirty,
        isTouched: fieldState.isTouched,
        isBlurred: fieldState.isTouched,
      },
    },
    handleChange: field.onChange,
    handleBlur: field.onBlur,
  };
  return (
    <div
      className="fa-rhf-field"
      ref={(node) => field.ref(node?.querySelector(focusSelector) ?? null)}
    >
      <FieldBindingContext.Provider value={binding}>
        {(Component as unknown) === AddressField ? (
          <RhfAddress
            control={control}
            name={name}
            value={field.value as AddressValue}
            error={fieldState.error?.message}
            {...(props as unknown as AddressFieldProps)}
            disabled={disabled}
          />
        ) : (
          <Component {...(props as P)} disabled={disabled} />
        )}
      </FieldBindingContext.Provider>
    </div>
  );
}

function useAddressPart<T extends FieldValues, O>(
  control: Control<T, any, O> | undefined,
  base: FieldPath<T>,
  part: keyof AddressParts,
): PartBinding<unknown> {
  const { field, fieldState } = useController({
    control,
    name: `${base}.${part}` as FieldPath<T>,
  });
  return {
    value: field.value,
    name: field.name,
    onChange: field.onChange,
    onBlur: field.onBlur,
    error: fieldState.error?.message,
  };
}

function RhfAddress<T extends FieldValues, O>({
  control,
  name,
  value,
  error,
  ...props
}: AddressFieldProps & {
  control?: Control<T, any, O>;
  name: FieldPath<T>;
  value: AddressValue;
  error?: string;
}) {
  const parts = {
    line1: useAddressPart(control, name, "line1"),
    line2: useAddressPart(control, name, "line2"),
    locality: useAddressPart(control, name, "locality"),
    region: useAddressPart(control, name, "region"),
    postcode: useAddressPart(control, name, "postcode"),
    country: useAddressPart(control, name, "country"),
  } as AddressParts;
  const location = useController({
    control,
    name: `${name}.location` as FieldPath<T>,
  }).field;
  const pinned = useController({
    control,
    name: `${name}.pinned` as FieldPath<T>,
  }).field;
  const change = (next: AddressValue) => {
    // Update registered parts rather than replacing their parent controller's value:
    // RHF otherwise treats the nested error object as the parent's own error and clears it.
    for (const part of Object.keys(parts) as Array<keyof AddressParts>) {
      if (parts[part].value !== next[part])
        (parts[part].onChange as (value: AddressValue[typeof part]) => void)(
          next[part],
        );
    }
    if (location.value !== next.location) location.onChange(next.location);
    if (pinned.value !== next.pinned) pinned.onChange(next.pinned);
  };
  // An empty editor keeps its collapsed geometry on validation. Its lookup row presents
  // the first nested issue; entering manually deliberately reveals each part's own slot.
  const collapsedError = Object.values(parts).find((part) => part.error)?.error;
  return (
    <AddressEditor
      {...props}
      value={value}
      onValueChange={change}
      parts={parts}
      error={error}
      emptyError={collapsedError}
    />
  );
}

/** A native form using RHF submission with the shared first-invalid-field focus behaviour. */
export interface RhfFormProps<
  T extends FieldValues,
  C = unknown,
  O extends FieldValues = T,
> extends Omit<ComponentProps<"form">, "onSubmit" | "onError" | "children"> {
  /** RHF instance created with useForm, usually spreading rhfFormBehaviour. */
  form: UseFormReturn<T, C, O>;
  /** Called with validated (and resolver-transformed) values. */
  onSubmit: SubmitHandler<O>;
  /** Receives an exception thrown by onSubmit. Render save feedback in the initiating control. */
  onError?: (error: unknown) => void;
  /** FormStack, bound fields and submit controls. */
  children?: ReactNode;
}

/** Provide RHF context, prevent native validation and focus the first invalid Glass UX field after submission. */
export function RhfForm<
  T extends FieldValues,
  C = unknown,
  O extends FieldValues = T,
>({ form, onSubmit, onError, children, ...props }: RhfFormProps<T, C, O>) {
  const id = useId();
  return (
    <FormProvider {...form}>
      <form
        {...props}
        noValidate
        data-form={id}
        onSubmit={(event) => {
          event.stopPropagation();
          void form
            .handleSubmit(onSubmit, () => focusFirstInvalid(id))(event)
            .catch((error) => onError?.(error));
        }}
      >
        {children}
      </form>
    </FormProvider>
  );
}
