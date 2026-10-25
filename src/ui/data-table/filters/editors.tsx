import { useDataTableMessages } from "../use-messages.js";
/**
 * The filter editors (R16.7): one per kind, all in the same shape. A condition select
 * (only when the column offers more than one), then the value control, one per row
 * (R15.2), then Clear and, for typed values, Apply. Enter applies and closes. Checkbox
 * lists, the yes/no control and date presets apply as you choose.
 */
import { useState } from "react";
import { Input } from "../../input/index.js";
import { NumberField } from "../../number-field/index.js";
import { Segmented } from "../../segmented/index.js";
import { DateEditor } from "./date-editor.js";
import {
  ConditionSelect,
  EditorFooter,
  EditorForm,
  ListInput,
  splitPasted,
  UUID,
  type EditorProps,
} from "./editor-parts.js";
import { OptionsEditor } from "./options-editor.js";
import { operatorLabels } from "./summary.js";
import type {
  BooleanFilterSpec,
  BooleanFilterValue,
  FilterSpec,
  NumberFilterSpec,
  NumberFilterValue,
  NumberOp,
  TextFilterSpec,
  TextFilterValue,
  TextOp,
  UuidFilterSpec,
  UuidFilterValue,
  UuidOp,
} from "./types.js";

export type { EditorProps };

/* ── Text ────────────────────────────────────────────────────────────────────── */

const isEmptyOp = (op: string): op is "isEmpty" | "isNotEmpty" =>
  op === "isEmpty" || op === "isNotEmpty";
const isListOp = (op: string): op is "in" | "notIn" =>
  op === "in" || op === "notIn";

export function TextEditor({
  spec,
  label,
  value,
  onChange,
  onCommit,
  onFlush,
}: EditorProps<TextFilterSpec, TextFilterValue>) {
  const m = useDataTableMessages();
  const [op, setOp] = useState<TextOp>(
    value?.op ?? spec.operators[0] ?? "contains",
  );
  const [text, setText] = useState(
    value && "value" in value ? value.value : "",
  );
  const [values, setValues] = useState<string[]>(
    value && "values" in value ? value.values : [],
  );

  const draft = (): TextFilterValue | null => {
    if (isEmptyOp(op)) return { op };
    if (isListOp(op)) return values.length ? { op, values } : null;
    return text.trim() ? { op, value: text.trim() } : null;
  };

  return (
    <EditorForm draft={draft} onCommit={onCommit} onFlush={onFlush}>
      <ConditionSelect
        ops={spec.operators}
        labels={operatorLabels(m).text}
        value={op}
        onChange={(next) => {
          setOp(next);
          if (isEmptyOp(next)) onChange({ op: next });
          else if (isListOp(next) && !values.length && text.trim())
            setValues(splitPasted(text));
        }}
      />
      {isListOp(op) ? (
        <ListInput values={values} onChange={setValues} label={label} />
      ) : isEmptyOp(op) ? null : (
        <Input
          size="sm"
          value={text}
          onValueChange={setText}
          placeholder={spec.placeholder}
          aria-label={m.text(label)}
        />
      )}
      <EditorFooter
        applied={value !== undefined}
        onClear={() => onCommit(undefined)}
        apply={!isEmptyOp(op)}
      />
    </EditorForm>
  );
}

/* ── UUID ────────────────────────────────────────────────────────────────────── */

export function UuidEditor({
  spec,
  label,
  value,
  onChange,
  onCommit,
  onFlush,
}: EditorProps<UuidFilterSpec, UuidFilterValue>) {
  const m = useDataTableMessages();
  const [op, setOp] = useState<UuidOp>(value?.op ?? spec.operators[0] ?? "eq");
  const [text, setText] = useState(
    value && "value" in value ? value.value : "",
  );
  const [values, setValues] = useState<string[]>(
    value && "values" in value ? value.values : [],
  );
  const [touched, setTouched] = useState(false);
  const validText = UUID.test(text.trim());

  const draft = (): UuidFilterValue | null => {
    if (isEmptyOp(op)) return { op };
    if (isListOp(op)) {
      const valid = values.filter((entry) => UUID.test(entry));
      return valid.length ? { op, values: valid } : null;
    }
    setTouched(true);
    return validText ? { op, value: text.trim().toLowerCase() } : null;
  };

  return (
    <EditorForm draft={draft} onCommit={onCommit} onFlush={onFlush}>
      <ConditionSelect
        ops={spec.operators}
        labels={operatorLabels(m).uuid}
        value={op}
        onChange={(next) => {
          setOp(next);
          if (isEmptyOp(next)) onChange({ op: next });
        }}
      />
      {isListOp(op) ? (
        <ListInput
          values={values}
          onChange={setValues}
          label={label}
          validate={(entry) => (UUID.test(entry) ? null : m.invalidId)}
        />
      ) : isEmptyOp(op) ? null : (
        <Input
          size="sm"
          value={text}
          onValueChange={setText}
          onBlur={() => setTouched(true)}
          invalid={touched && text.trim() !== "" && !validText}
          placeholder={
            spec.placeholder ?? "9f331510-fcb9-5b11-a296-57ec9a7bcf7a"
          }
          aria-label={m.identifier(label)}
        />
      )}
      <EditorFooter
        applied={value !== undefined}
        onClear={() => onCommit(undefined)}
        apply={!isEmptyOp(op)}
      />
    </EditorForm>
  );
}

/* ── Number ──────────────────────────────────────────────────────────────────── */

export function NumberEditor({
  spec,
  label,
  value,
  onChange,
  onCommit,
  onFlush,
}: EditorProps<NumberFilterSpec, NumberFilterValue>) {
  const m = useDataTableMessages();
  const [op, setOp] = useState<NumberOp>(
    value?.op ?? spec.operators[0] ?? "gt",
  );
  const [single, setSingle] = useState<number | null>(
    value && "value" in value ? value.value : null,
  );
  const [min, setMin] = useState<number | null>(
    value && "min" in value
      ? value.min
      : value && "value" in value
        ? value.value
        : null,
  );
  const [max, setMax] = useState<number | null>(
    value && "max" in value ? value.max : null,
  );
  const reversed =
    op === "between" && min !== null && max !== null && min > max;

  const draft = (): NumberFilterValue | null => {
    if (isEmptyOp(op)) return { op };
    if (op === "between")
      return min !== null && max !== null && min <= max
        ? { op, min, max }
        : null;
    return single !== null ? { op, value: single } : null;
  };

  const field = (
    fieldValue: number | null,
    set: (next: number | null) => void,
    name: string,
    placeholder?: string,
  ) => (
    <NumberField
      size="sm"
      value={fieldValue}
      onValueChange={set}
      min={spec.min}
      max={spec.max}
      step={spec.step ?? 1}
      unit={spec.unit}
      steppers={false}
      invalid={reversed}
      placeholder={placeholder}
      aria-label={name}
    />
  );

  return (
    <EditorForm draft={draft} onCommit={onCommit} onFlush={onFlush}>
      <ConditionSelect
        ops={spec.operators}
        labels={operatorLabels(m).number}
        value={op}
        onChange={(next) => {
          setOp(next);
          if (isEmptyOp(next)) onChange({ op: next });
          else if (next === "between" && min === null) setMin(single);
          else if (next !== "between" && single === null) setSingle(min);
        }}
      />
      {op === "between" ? (
        <>
          {field(min, setMin, m.fromField(label), m.from)}
          {field(max, setMax, m.toField(label), m.to)}
        </>
      ) : isEmptyOp(op) ? null : (
        field(single, setSingle, m.value(label))
      )}
      <EditorFooter
        applied={value !== undefined}
        onClear={() => onCommit(undefined)}
        apply={!isEmptyOp(op)}
      />
    </EditorForm>
  );
}

/* ── Boolean ─────────────────────────────────────────────────────────────────── */

type BooleanChoice = "any" | "true" | "false" | "isEmpty";

export function BooleanEditor({
  spec,
  label,
  value,
  onChange,
  onCommit,
}: EditorProps<BooleanFilterSpec, BooleanFilterValue>) {
  const m = useDataTableMessages();
  const current: BooleanChoice = !value
    ? "any"
    : value.op === "eq"
      ? value.value
        ? "true"
        : "false"
      : value.op === "isEmpty"
        ? "isEmpty"
        : "any";
  const options: Array<{ value: BooleanChoice; label: string }> = [
    { value: "any", label: "Any" },
    { value: "true", label: spec.labels.true },
    { value: "false", label: spec.labels.false },
    ...(spec.nullable
      ? [{ value: "isEmpty" as const, label: spec.labels.empty ?? m.unknown }]
      : []),
  ];
  return (
    <div className="fa-dt-filter-form">
      <Segmented<BooleanChoice>
        block
        size="sm"
        aria-label={label}
        options={options}
        value={current}
        onValueChange={(next) =>
          onChange(
            next === "any"
              ? undefined
              : next === "isEmpty"
                ? { op: "isEmpty" }
                : { op: "eq", value: next === "true" },
          )
        }
      />
      <EditorFooter
        applied={value !== undefined}
        onClear={() => onCommit(undefined)}
      />
    </div>
  );
}

/* ── Dispatcher ──────────────────────────────────────────────────────────────── */

/** Renders the editor for a column's filter kind (text, number, date, boolean, options, uuid or the column's custom editor). */
export function FilterEditor(props: EditorProps<FilterSpec, unknown>) {
  const { spec } = props;
  switch (spec.kind) {
    case "text":
      return (
        <TextEditor
          {...(props as EditorProps<TextFilterSpec, TextFilterValue>)}
        />
      );
    case "number":
      return (
        <NumberEditor
          {...(props as EditorProps<NumberFilterSpec, NumberFilterValue>)}
        />
      );
    case "date":
      return <DateEditor {...(props as Parameters<typeof DateEditor>[0])} />;
    case "boolean":
      return (
        <BooleanEditor
          {...(props as EditorProps<BooleanFilterSpec, BooleanFilterValue>)}
        />
      );
    case "options":
      return (
        <OptionsEditor {...(props as Parameters<typeof OptionsEditor>[0])} />
      );
    case "uuid":
      return (
        <UuidEditor
          {...(props as EditorProps<UuidFilterSpec, UuidFilterValue>)}
        />
      );
    case "custom": {
      const Custom = spec.editor;
      return (
        <div className="fa-dt-filter-form">
          <Custom
            value={props.value}
            onChange={props.onChange}
            onCommit={(next?: unknown) =>
              props.onCommit(next === undefined ? props.value : next)
            }
            label={props.label}
          />
          <EditorFooter
            applied={props.value !== undefined}
            onClear={() => props.onCommit(undefined)}
          />
        </div>
      );
    }
  }
}
