/**
 * The form kit's React contexts and the helper every bound field uses. Kept apart from
 * form.tsx so a control's own bound field (src/ui/<control>/…) can read the field context
 * while form.tsx registers that field in `useAppForm` — without an import cycle.
 */
import { createFormHookContexts } from "@tanstack/react-form";
import { useContext, useRef } from "react";
import { FieldBindingContext } from "./binding.js";
import type { FieldProps } from "../field/index.js";
import { firstError } from "./validation.js";

/**
 * TanStack Form's hook contexts for this kit: `fieldContext` and `formContext` carry the bound
 * field and form; `useFieldContext` and `useFormContext` read them inside a field or form component.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  /* @__PURE__ */ createFormHookContexts();

/** Field chrome every bound field accepts (label, hint, optional…). */
export type FieldChrome = Pick<
  FieldProps,
  | "label"
  | "warning"
  | "hint"
  | "optional"
  | "required"
  | "aside"
  | "className"
  | "disabled"
>;

/**
 * The bound field, its first error, and the props for the `Field` that wraps its control:
 *
 *   const { field, error, root } = useBoundField<string>()
 *   return <Field {...root} label={label}><Input value={field.state.value} … /></Field>
 */
export function useBoundField<T>() {
  const adapted = useContext(FieldBindingContext);
  const native = useContext(fieldContext);
  if (!adapted && !native) throw new Error("A bound field needs an AppField or RhfField provider");
  // AddressField's nested TanStack fields use the native form; optional adapters render
  // that compound editor with their own per-part controllers.
  const field = (adapted ?? native) as ReturnType<typeof useFieldContext<T>>;
  const meta = field.state.meta;
  const error = firstError(meta.errors);
  return {
    field,
    error,
    root: {
      name: field.name,
      error,
      dirty: meta.isDirty,
      touched: meta.isTouched,
    },
  };
}

/**
 * A bound text field's value as its control shows it, and the handler for the control's
 * changes. A `null` or `undefined` form value (an optional database column) shows as empty and
 * stays as it is until the person types; clearing a field that started blank puts that blank
 * back, so an untouched optional value is never saved as an empty string.
 *
 *   const text = useTextValue(field)
 *   return <Input value={text.value} onValueChange={text.onValueChange} … />
 */
export function useTextValue(field: { state: { value: unknown }; handleChange: (value: never) => void }) {
  const raw = field.state.value;
  const blank = useRef<string | null | undefined>(raw == null ? (raw as null | undefined) : "");
  const value = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  const onValueChange = (next: string) => (field.handleChange as (value: string | null | undefined) => void)(next === "" ? blank.current : next);
  return { value, onValueChange };
}

