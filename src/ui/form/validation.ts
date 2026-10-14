/**
 * Glass UX form validation timing (R15.2): validate a field when it loses focus, then on every
 * change while it shows an error, and everything on submit.
 *
 * The schema lives once on the form (`validators: { onDynamic: schema }`). Each field
 * runs only its own slice of it, so blurring one field never lights up errors on fields
 * the user has not reached yet. Cross-field rules work too: a refinement whose issue path
 * names a field shows on that field.
 */
import {
  defaultValidationLogic,
  type AnyFormApi,
  type StandardSchemaV1,
  type StandardSchemaV1Issue,
  type ValidationLogicFn,
  type ValidationLogicValidatorsFn,
} from "@tanstack/react-form";

type Issue = StandardSchemaV1Issue;

const isStandardSchema = (value: unknown): value is StandardSchemaV1 =>
  typeof value === "object" && value !== null && "~standard" in value;

/** "contacts[0].email" → "contacts.0.email", so field names and issue paths compare. */
export const normalisePath = (path: string) =>
  path.replace(/\[(\d+)\]/g, ".$1");

export function issuePath(issue: Issue): string {
  return (issue.path ?? [])
    .map((segment: PropertyKey | { key: PropertyKey }) =>
      typeof segment === "object" ? segment.key : segment,
    )
    .map(String)
    .join(".");
}

/** The message a schema gives for one field of the form values, if any. */
export function messageFor(
  schema: StandardSchemaV1,
  values: unknown,
  fieldName: string,
): string | undefined {
  const result = schema["~standard"].validate(values);
  if (result instanceof Promise) return undefined;
  const target = normalisePath(fieldName);
  return result.issues?.find((issue) => issuePath(issue) === target)?.message;
}

/** Normalise a field's errors (strings or schema issues) to its first message. */
export function firstError(
  errors: readonly unknown[] | undefined,
): string | undefined {
  for (const error of errors ?? []) {
    if (!error) continue;
    if (typeof error === "string") return error;
    if (
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    )
      return error.message;
  }
  return undefined;
}

const fieldHasErrors = (form: AnyFormApi, fieldName: string) =>
  (form.getFieldMeta(fieldName)?.errors.length ?? 0) > 0;

/** TanStack Form validation logic implementing blur → change-once-errored → submit. */
export const blurThenChange: ValidationLogicFn = (props) => {
  const { event, form, validators } = props;
  let base: ValidationLogicValidatorsFn[] = [];
  defaultValidationLogic({
    ...props,
    runValidation: (next) => {
      base = next.validators.filter(Boolean) as ValidationLogicValidatorsFn[];
    },
  });

  // Form-level pass: the schema runs per field (below), never across untouched fields.
  if (!event.fieldName) return props.runValidation({ validators: base, form });

  const fieldName = event.fieldName;
  const due =
    event.type === "blur" ||
    event.type === "submit" ||
    (event.type === "change" && fieldHasErrors(form, fieldName));
  if (!due) return props.runValidation({ validators: base, form });

  const own = event.async ? validators?.onDynamicAsync : validators?.onDynamic;
  const schema = form.options.validators?.onDynamic;
  const slice =
    !event.async && isStandardSchema(schema)
      ? () => messageFor(schema, form.state.values, fieldName)
      : undefined;

  if (!own && !slice) return props.runValidation({ validators: base, form });

  const runOwn = (args: { value: unknown }) => {
    if (isStandardSchema(own)) {
      const result = own["~standard"].validate(args.value);
      return result instanceof Promise
        ? undefined
        : result.issues?.[0]?.message;
    }
    return typeof own === "function"
      ? (own as (input: unknown) => unknown)(args)
      : undefined;
  };
  const fn = (args: { value: unknown }) => {
    const result = runOwn(args);
    if (result) return result;
    return slice?.();
  };
  return props.runValidation({
    validators: [...base, { fn: fn as never, cause: "dynamic" }],
    form,
  });
};

/** Move focus to the first invalid field of a form, in reading order (R15.2). */
export function focusFirstInvalid(formId: string) {
  if (typeof document === "undefined") return;
  requestAnimationFrame(() => {
    const form = document.querySelector(`[data-form="${CSS.escape(formId)}"]`);
    // A section (FormGroup) is not a field: look inside it for the invalid field itself.
    const field = form?.querySelector(
      ".fa-field[data-invalid], .fa-fieldset:not([data-variant='section']):has([data-invalid])",
    );
    const editor = field?.querySelector<HTMLElement>(
      "[role='textbox'][contenteditable='true']",
    );
    const target =
      editor ??
      field?.querySelector<HTMLElement>(
        "input:not([type='hidden']):not([tabindex='-1']):not([aria-hidden='true']), textarea, button:not([tabindex='-1']), [role='slider'], [tabindex='0']",
      );
    target?.focus({ focusVisible: true } as FocusOptions);
  });
}
