import { IconCode, IconGauge, IconLock } from "../../icons/generated/icons.js";
import { FactList } from "../../ui/fact-list/index.js";
import { Metric } from "../../ui/metric/index.js";
import { Button } from "../../ui/button/index.js";
import type { EntityResolver } from "../entity-chip/index.js";
import { formatNumber, THIN_SPACE } from "../format.js";
import { JsonTree } from "../json-tree/index.js";
import type {
  AiResult,
  EntityRef,
  RedactedValue,
  ResultColumn,
  ResultDetailItem,
  ResultRow,
} from "../types.js";
import { ResultFrame } from "./frame.js";

/**
 * Data classification, lowest to highest (graphql-orm-ai disclosure.rs). A tool's browser
 * preview carries a cap; anything classified above it is withheld from the browser.
 */
export const CLASSIFICATIONS = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
  "Secret",
] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export interface DisclosureRule {
  classification: Classification;
  disposition?: "Exportable" | "NeverExport";
}

/**
 * The disclosure a tool declares for its result (AiDisclosureSchema "glass-ux-ai-v1",
 * Example application crates/glass-ux-ai/src/tools.rs). The renderer reads it; the model never chooses it.
 */
export type Disclosure =
  | { shape: "scalar"; rule?: DisclosureRule; label?: string; unit?: string }
  | {
      /** Named shape of the control or marker. */
      shape: "object";
      /** The typed disclosure or validation rule applied to this value. */
      rule?: DisclosureRule;
      label?: string;
      fields: Record<string, Disclosure>;
    }
  | {
      /** Named shape of the control or marker. */
      shape: "list";
      /** The typed disclosure or validation rule applied to this value. */
      rule?: DisclosureRule;
      label?: string;
      maximumItems?: number;
      /** The typed item displayed or acted upon. */
      item: Disclosure;
    };

/** A tool's browser preview (AiToolCallResultPreviewView) plus how to title it. */
export interface ToolPreview {
  id: string;
  /** Stable ToolId: "sample.endpoint_list". */
  toolId: string;
  /** "Endpoints offline for more than a day". */
  title: string;
  /** The data line: "Glass UX · Northstar Studio". */
  source?: string;
  /** Preview JSON; null when the server withheld it (above the preview cap). */
  value: unknown;
  disclosure?: Disclosure;
  /** The highest class the browser may show (AiBrowserResultPreviewPolicy). Default Internal. */
  previewCap?: Classification;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const humanise = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
const rank = (classification?: Classification) =>
  classification ? CLASSIFICATIONS.indexOf(classification) : 0;
const withheld = (classification?: Classification): RedactedValue => ({
  redacted: true,
  reason: classification
    ? `Withheld · ${classification}`
    : "Withheld from the browser",
});

/** Infer a disclosure from the value when none was sent (development tools). */
export function inferDisclosure(value: unknown, depth = 0): Disclosure {
  if (Array.isArray(value))
    return { shape: "list", item: inferDisclosure(value[0], depth + 1) };
  if (isRecord(value) && depth < 6)
    return {
      shape: "object",
      fields: Object.fromEntries(
        Object.entries(value).map(([key, field]) => [
          key,
          inferDisclosure(field, depth + 1),
        ]),
      ),
    };
  return { shape: "scalar" };
}

function scalarText(value: unknown, unit?: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    const text = formatNumber(value, Number.isInteger(value) ? 0 : 1);
    return unit
      ? unit === "%"
        ? `${text}%`
        : `${text}${THIN_SPACE}${unit}`
      : text;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return `${formatNumber(value.length)} ${value.length === 1 ? "item" : "items"}`;
  if (isRecord(value))
    return `${formatNumber(Object.keys(value).length)} fields`;
  return String(value);
}

interface Located {
  /** The root field name, used to recognise entities ("SampleAssetSummary"). */
  typename?: string;
  value: unknown;
  disclosure: Disclosure;
  total?: number;
}

/**
 * Step through the GraphQL envelope to the data: a single root field (`{ SampleTicket: {…} }`),
 * a connection (`Edges[].Node` with `PageInfo.TotalCount`) or a page (`Items` + `TotalCount`).
 */
function locate(
  value: unknown,
  disclosure: Disclosure,
  typename?: string,
): Located {
  if (disclosure.shape === "object" && isRecord(value)) {
    const keys = Object.keys(disclosure.fields);
    if (keys.length === 1)
      return locate(value[keys[0]!], disclosure.fields[keys[0]!]!, keys[0]);
    const edges = disclosure.fields.Edges;
    if (
      edges?.shape === "list" &&
      Array.isArray(value.Edges) &&
      edges.item.shape === "object" &&
      edges.item.fields.Node
    ) {
      const total = (value.PageInfo as { TotalCount?: number } | undefined)
        ?.TotalCount;
      return {
        typename,
        value: value.Edges.map((edge) => (isRecord(edge) ? edge.Node : edge)),
        disclosure: { ...edges, item: edges.item.fields.Node },
        total,
      };
    }
    const items = disclosure.fields.Items;
    if (items?.shape === "list" && Array.isArray(value.Items)) {
      return {
        typename,
        value: value.Items,
        disclosure: items,
        total:
          typeof value.TotalCount === "number" ? value.TotalCount : undefined,
      };
    }
  }
  return { typename, value, disclosure };
}

/**
 * Resolve a tool preview into the renderer that fits it. The order is the contract
 * (docs/ai-ui.md §Generic results):
 *
 *   0. withheld    no preview, or the result is classified above the preview cap →
 *                  the withheld treatment ("No browser-safe preview")
 *   1. entity      a recognised Glass UX type (ToolId + root field) → entity card or entity list
 *   2. list        → compact table: scalar fields become columns in declared order, the
 *                    first recognised entity column becomes chips, fields above the cap redact
 *   3. object      → key–value detail tiles; nested objects and lists summarise as a count
 *   4. scalar      → a value tile (a count, a state)
 *   5. otherwise   → the JSON tree
 */
export function resolvePreview(
  preview: ToolPreview,
  resolver: EntityResolver,
): AiResult {
  const base = { id: preview.id, title: preview.title, source: preview.source };
  const cap = rank(preview.previewCap ?? "Internal");
  if (preview.value === null || preview.value === undefined) {
    return {
      ...base,
      type: "value",
      label: preview.title,
      value: null,
      redacted: {
        redacted: true,
        reason:
          "No browser-safe preview: the result is above this tool’s preview class",
      },
    };
  }
  const root = preview.disclosure ?? inferDisclosure(preview.value);
  if (rank(root.rule?.classification) > cap)
    return {
      ...base,
      type: "value",
      label: preview.title,
      value: null,
      redacted: withheld(root.rule?.classification),
    };
  const { typename, value, disclosure, total } = locate(preview.value, root);
  const hidden = (field: Disclosure) => rank(field.rule?.classification) > cap;
  const recognise = (entry: unknown) =>
    isRecord(entry) && resolver.recognise
      ? resolver.recognise(entry, typename)
      : null;

  if (disclosure.shape === "list" && Array.isArray(value)) {
    const item = disclosure.item;
    const items = value.slice(0, disclosure.maximumItems ?? 25);
    const entities = items.map(recognise);
    if (item.shape !== "object") {
      return {
        ...base,
        type: "table",
        total: total ?? value.length,
        columns: [{ key: "value", header: item.label ?? "Value", priority: 1 }],
        rows: items.map((entry) => ({ value: scalarText(entry) })),
      };
    }
    const fields = Object.entries(item.fields).filter(
      ([, field]) => field.shape === "scalar",
    );
    if (entities.length > 0 && entities.every(Boolean) && fields.length <= 2) {
      return {
        ...base,
        type: "entities",
        entities: entities as EntityRef[],
        total: total ?? value.length,
      };
    }
    const columns: ResultColumn[] = fields
      .slice(0, 6)
      .map(([key, field], index) => {
        const sample = (
          items.find(isRecord) as Record<string, unknown> | undefined
        )?.[key];
        return {
          key,
          header: field.label ?? humanise(key),
          priority: Math.min(5, index + 1) as ResultColumn["priority"],
          type:
            index === 0 && entities[0]
              ? "entity"
              : typeof sample === "number"
                ? "number"
                : undefined,
          unit: field.shape === "scalar" ? field.unit : undefined,
        };
      });
    const rows: ResultRow[] = items.map((entry, rowIndex) => {
      const record = isRecord(entry) ? entry : {};
      return Object.fromEntries(
        columns.map((column, columnIndex) => {
          const field = item.fields[column.key]!;
          if (hidden(field))
            return [column.key, withheld(field.rule?.classification)];
          if (columnIndex === 0 && entities[rowIndex])
            return [column.key, entities[rowIndex]!];
          const cell = record[column.key];
          return [
            column.key,
            typeof cell === "number" ? cell : scalarText(cell),
          ];
        }),
      );
    });
    return {
      ...base,
      type: "table",
      columns,
      rows,
      total: total ?? value.length,
    };
  }

  if (disclosure.shape === "object" && isRecord(value)) {
    const entity = recognise(value);
    const entries = Object.entries(disclosure.fields);
    const flat = entries.flatMap(
      ([key, field]): Array<[string, Disclosure, unknown]> =>
        field.shape === "object" && isRecord(value[key])
          ? Object.entries(field.fields).map(([inner, innerField]) => [
              inner,
              innerField,
              (value[key] as Record<string, unknown>)[inner],
            ])
          : [[key, field, value[key]]],
    );
    if (entity) {
      return {
        ...base,
        type: "entity",
        entity,
        facts: flat
          .filter(
            ([key, field]) =>
              field.shape === "scalar" &&
              !hidden(field) &&
              !["Id", "Name"].includes(key),
          )
          .slice(0, 8)
          .map(([key, field, fieldValue]) => ({
            label: field.label ?? humanise(key),
            value: scalarText(
              fieldValue,
              field.shape === "scalar" ? field.unit : undefined,
            ),
          })),
      };
    }
    const items: ResultDetailItem[] = flat.map(([key, field, fieldValue]) =>
      hidden(field)
        ? {
            label: field.label ?? humanise(key),
            value: "",
            redacted: withheld(field.rule?.classification),
          }
        : {
            label: field.label ?? humanise(key),
            value: scalarText(
              fieldValue,
              field.shape === "scalar" ? field.unit : undefined,
            ),
            numeric: typeof fieldValue === "number",
          },
    );
    return { ...base, type: "detail", items };
  }

  if (
    disclosure.shape === "scalar" &&
    (typeof value !== "object" || value === null)
  ) {
    return {
      ...base,
      type: "value",
      label: disclosure.label ?? preview.title,
      value:
        typeof value === "number" || typeof value === "string"
          ? value
          : scalarText(value),
      unit: disclosure.unit,
    };
  }

  return { ...base, type: "json", value };
}

/** The withheld treatment: the value is not in the browser; revealing it is a permission. */
export function Redacted({
  value,
  onReveal,
}: {
  value: RedactedValue;
  /** Called when reveal occurs. The callback type specifies its arguments. */
  onReveal?: () => void;
}) {
  return (
    <span className="fa-ai-redacted">
      <IconLock className="fa-ai-redacted-icon" />
      <span className="fa-ai-redacted-mask" aria-hidden>
        ••••••
      </span>
      <span className="sr-only">Hidden.</span>
      <Button
        variant="ghost"
        size="sm"
        className="fa-ai-redacted-reveal"
        disabledReason={onReveal ? undefined : value.reason}
        onClick={onReveal}
      >
        Reveal
      </Button>
    </span>
  );
}

type ValueResult = Extract<AiResult, { type: "value" }>;
type JsonResult = Extract<AiResult, { type: "json" }>;

/** A single figure or short text from a tool (a count, a state), or a withheld preview. */
export function ResultValue({ result }: { result: ValueResult }) {
  const text =
    result.value === null
      ? "—"
      : typeof result.value === "number"
        ? scalarText(result.value, result.unit)
        : result.value;
  return (
    <ResultFrame
      result={result}
      icon={result.redacted ? <IconLock /> : <IconGauge />}
      copyText={result.redacted ? undefined : text}
    >
      <div className="fa-ai-value">
        {result.redacted ? (
          <>
            <Redacted value={result.redacted} />
            <span className="fa-ai-value-detail">{result.redacted.reason}</span>
          </>
        ) : typeof result.value === "number" || result.value === null ? (
          <div className="fa-ai-value-metric">
            <Metric
              label={result.label}
              value={result.value}
              unit={result.unit}
            />
          </div>
        ) : (
          <FactList facts={[{ label: result.label, value: result.value }]} />
        )}
        {result.detail ? (
          <span className="fa-ai-value-detail">{result.detail}</span>
        ) : null}
      </div>
    </ResultFrame>
  );
}

/** The last resort: the preview as a JSON tree. */
export function ResultJson({ result }: { result: JsonResult }) {
  return (
    <ResultFrame
      result={result}
      icon={<IconCode />}
      copyText={JSON.stringify(result.value, null, 2)}
    >
      <JsonTree
        value={result.value}
        label={result.title}
        truncated={result.truncated ? "Truncated by the server." : undefined}
      />
    </ResultFrame>
  );
}
