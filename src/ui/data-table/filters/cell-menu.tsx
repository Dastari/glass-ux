import { IconEyeOff, IconFilter } from "../../../icons/generated/icons.js"
import { Menu } from "../../menu/index.js"
import type { FilterController, FilterColumnEntry } from "./controller.js"
import { optionLabel } from "./summary.js"
import type { BooleanFilterValue, FilterSpec, OptionsFilterValue, TextFilterValue, UuidFilterValue } from "./types.js"

/** A right-clicked cell's value, ready to filter by. */
export interface CellFilter {
  column: FilterColumnEntry
  /** "Windows 11 Pro", "Online", "empty". */
  valueLabel: string
  only: unknown
  exclude: unknown | null
}

const isBlank = (value: unknown) => value === null || value === undefined || value === ""

function onlyAndExclude(spec: FilterSpec, raw: unknown, current: unknown): { only: unknown; exclude: unknown | null } | null {
  const ops = "operators" in spec ? (spec.operators as readonly string[]) : []
  if (isBlank(raw)) {
    if (!spec.nullable) return null
    return { only: { op: "isEmpty" }, exclude: { op: "isNotEmpty" } }
  }
  const value = String(raw)
  switch (spec.kind) {
    case "options": {
      const previous = current as OptionsFilterValue | undefined
      const excluded = previous?.op === "notIn" ? [...new Set([...previous.values, value])] : [value]
      return {
        only: ops.includes("in") ? ({ op: "in", values: [value] } satisfies OptionsFilterValue) : null,
        exclude: ops.includes("notIn") ? ({ op: "notIn", values: excluded } satisfies OptionsFilterValue) : null,
      }
    }
    case "text":
    case "uuid": {
      const only = ops.includes("eq") ? { op: "eq", value } : ops.includes("in") ? { op: "in", values: [value] } : null
      const exclude = ops.includes("ne") ? { op: "ne", value } : ops.includes("notIn") ? { op: "notIn", values: [value] } : null
      return only ? { only: only as TextFilterValue | UuidFilterValue, exclude: exclude as TextFilterValue | UuidFilterValue | null } : null
    }
    case "boolean":
      return typeof raw === "boolean"
        ? { only: { op: "eq", value: raw } satisfies BooleanFilterValue, exclude: { op: "eq", value: !raw } satisfies BooleanFilterValue }
        : null
    default:
      return null
  }
}

/**
 * "Only this value" / "Exclude this value" for a right-clicked cell (R16.7), for options,
 * exact text, yes/no and id columns. Null when the column cannot filter by a value.
 */
export function cellFilter(controller: FilterController, columnId: string, raw: unknown): CellFilter | null {
  const column = controller.column(columnId)
  if (!column) return null
  const actions = onlyAndExclude(column.spec, raw, controller.valueOf(columnId))
  if (!actions || actions.only === null) return null
  const { spec } = column
  const valueLabel = isBlank(raw)
    ? "empty"
    : spec.kind === "boolean"
      ? raw
        ? spec.labels.true
        : spec.labels.false
      : spec.kind === "options" || spec.kind === "uuid"
        ? optionLabel(spec, String(raw))
        : String(raw)
  return { column, valueLabel, only: actions.only, exclude: actions.exclude }
}

/** The two rows, as their own group above the row's actions (R12 keeps its own order). */
export function CellFilterItems({ target, controller }: { target: CellFilter; controller: FilterController }) {
  return (
    <Menu.Group aria-label={`Filter by ${target.column.label}`}>
      <Menu.Item icon={<IconFilter />} trail={target.valueLabel} onClick={() => controller.setFilter(target.column.id, target.only)}>
        Only this value
      </Menu.Item>
      {target.exclude ? (
        <Menu.Item icon={<IconEyeOff />} onClick={() => controller.setFilter(target.column.id, target.exclude)}>
          Exclude this value
        </Menu.Item>
      ) : null}
    </Menu.Group>
  )
}
