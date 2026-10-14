/**
 * The form kit's React contexts and the helper every bound field uses. Kept apart from
 * form.tsx so a control's own bound field (src/ui/<control>/…) can read the field context
 * while form.tsx registers that field in `useAppForm` — without an import cycle.
 */
import { createFormHookContexts } from "@tanstack/react-form"
import type { FieldProps } from "../field/index.js"
import { firstError } from "./validation.js"

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()

/** Field chrome every bound field accepts (label, hint, optional…). */
export type FieldChrome = Pick<FieldProps, "label" | "hint" | "optional" | "required" | "aside" | "className" | "disabled">

/**
 * The bound field, its first error, and the props for the `Field` that wraps its control:
 *
 *   const { field, error, root } = useBoundField<string>()
 *   return <Field {...root} label={label}><Input value={field.state.value} … /></Field>
 */
export function useBoundField<T>() {
  const field = useFieldContext<T>()
  const meta = field.state.meta
  const error = firstError(meta.errors)
  return {
    field,
    error,
    root: {
      name: field.name,
      error,
      dirty: meta.isDirty,
      touched: meta.isTouched,
    },
  }
}
