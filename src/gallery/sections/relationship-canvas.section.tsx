import { useCallback, useMemo, useRef, useState } from "react"
import { IconBolt, IconKey, IconPlus, IconTable } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import {
  RelationshipCanvas,
  type RelationshipCanvasActions,
  type RelationshipCard,
  type RelationshipEdge,
  type RelationshipPositions,
  type RelationshipRow,
} from "../../ui/relationship-canvas/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { Panel } from "../../ui/surface/index.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Usage } from "./inputs.kit.js"

/** A field as a row: a key in the warning colour, the type in the trailing text, `?` when optional. */
const field = (id: string, type: string, { key = false, optional = false } = {}): RelationshipRow => ({
  id,
  label: id,
  detail: `${type}${optional ? "?" : ""}`,
  icon: key ? <IconKey /> : undefined,
  tone: key ? "warning" : undefined,
})
const table = (id: string, title: string, rows: RelationshipRow[]): RelationshipCard => ({ id, title, icon: <IconTable />, rows })
const relation = (id: string, from: [string, string], to: [string, string], label: string, cardinality: "one" | "many" = "one"): RelationshipEdge => ({
  id,
  from: { card: from[0], row: from[1] },
  to: { card: to[0], row: to[1] },
  label,
  cardinality,
})

/** A fictional publishing schema: a cycle (author ↔ post), a self-link (a comment's parent) and a join table. */
const ACTIVE: RelationshipCard[] = [
  table("author", "Author", [field("id", "uuid", { key: true }), field("name", "text"), field("email", "text", { optional: true }), field("featured_post", "uuid", { optional: true }), field("joined", "timestamptz")]),
  table("post", "Post", [field("id", "uuid", { key: true }), field("author", "uuid"), field("title", "text"), field("body", "text", { optional: true }), field("published", "timestamptz", { optional: true })]),
  table("comment", "Comment", [field("id", "uuid", { key: true }), field("post", "uuid"), field("author", "uuid"), field("parent", "uuid", { optional: true }), field("body", "text")]),
  table("tag", "Tag", [field("id", "int8", { key: true }), field("name", "text")]),
  table("post_tag", "Post tag", [field("post", "uuid", { key: true }), field("tag", "int8", { key: true })]),
]
const ACTIVE_EDGES: RelationshipEdge[] = [
  relation("post-author", ["post", "author"], ["author", "id"], "author"),
  relation("author-featured", ["author", "featured_post"], ["post", "id"], "featured"),
  relation("comment-post", ["comment", "post"], ["post", "id"], "post"),
  relation("comment-author", ["comment", "author"], ["author", "id"], "author"),
  relation("comment-parent", ["comment", "parent"], ["comment", "id"], "parent"),
  relation("post_tag-post", ["post_tag", "post"], ["post", "id"], "tags", "many"),
  relation("post_tag-tag", ["post_tag", "tag"], ["tag", "id"], "posts", "many"),
]
/** The draft adds a collection: a series that posts belong to. */
const DRAFT: RelationshipCard[] = [
  ...ACTIVE.map((card) => (card.id === "post" ? { ...card, rows: [...card.rows, field("series", "uuid", { optional: true })] } : card)),
  table("series", "Series", [field("id", "uuid", { key: true }), field("title", "text"), field("editor", "uuid")]),
]
const DRAFT_EDGES: RelationshipEdge[] = [
  ...ACTIVE_EDGES,
  relation("post-series", ["post", "series"], ["series", "id"], "series"),
  relation("series-editor", ["series", "editor"], ["author", "id"], "editor"),
]

function SchemaDemo() {
  const [source, setSource] = useState<"active" | "draft">("active")
  const [positions, setPositions] = useState<RelationshipPositions>({})
  const [selected, setSelected] = useState<string | null>(null)
  const actions = useRef<RelationshipCanvasActions>(null)
  const [opened, setOpened] = useState<string | null>(null)
  return (
    <div className="flex h-150 w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          size="sm"
          aria-label="Schema"
          value={source}
          onValueChange={(value) => setSource(value as "active" | "draft")}
          options={[
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="type-caption text-fg-muted" aria-live="polite">
            {opened ? `Opened ${opened}` : ""}
          </span>
          <Button variant="primary" icon={<IconPlus />}>
            New collection
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1" data-testid="relationship-schema">
        <RelationshipCanvas
          label={`Schema, ${source === "active" ? "Active" : "Draft"}`}
          cards={source === "active" ? ACTIVE : DRAFT}
          edges={source === "active" ? ACTIVE_EDGES : DRAFT_EDGES}
          positions={positions}
          onPositionsChange={setPositions}
          selectedId={selected}
          onSelectedIdChange={setSelected}
          onOpen={(card) => setOpened(card.title)}
          frameKey={source}
          actionsRef={actions}
          emptyText="No collections to draw yet."
        />
      </div>
    </div>
  )
}

/** Not a schema: a workflow's steps, with inputs and outputs as rows and edges from output to input. */
const port = (id: string, label: string, detail: string, output = false): RelationshipRow => ({ id, label, detail, icon: output ? <IconBolt /> : undefined, tone: output ? "accent" : undefined })
const STEPS: RelationshipCard[] = [
  { id: "upload", title: "Upload received", badge: null, rows: [port("file", "file", "Blob", true), port("owner", "owner", "User", true)] },
  { id: "scan", title: "Scan for malware", badge: null, rows: [port("in", "file", "Blob"), port("clean", "clean", "Blob", true), port("verdict", "verdict", "Verdict", true)] },
  { id: "thumb", title: "Make thumbnails", badge: null, rows: [port("in", "image", "Blob"), port("small", "small", "Image", true), port("large", "large", "Image", true)] },
  { id: "notify", title: "Notify owner", badge: null, rows: [port("who", "recipient", "User"), port("what", "verdict", "Verdict"), port("preview", "preview", "Image")] },
]
const FLOW: RelationshipEdge[] = [
  { id: "1", from: { card: "upload", row: "file" }, to: { card: "scan", row: "in" } },
  { id: "2", from: { card: "scan", row: "clean" }, to: { card: "thumb", row: "in" } },
  { id: "3", from: { card: "upload", row: "owner" }, to: { card: "notify", row: "who" } },
  { id: "4", from: { card: "scan", row: "verdict" }, to: { card: "notify", row: "what" } },
  { id: "5", from: { card: "thumb", row: "small" }, to: { card: "notify", row: "preview" } },
]

function WorkflowDemo() {
  const describe = useCallback((card: RelationshipCard) => `Step: ${card.title}`, [])
  return (
    <Panel className="h-110 w-full">
      <RelationshipCanvas label="Upload workflow" cards={STEPS} edges={FLOW} describeCard={describe} framed={false} movable={false} />
    </Panel>
  )
}

export default function RelationshipCanvasSection() {
  const few = useMemo(() => ACTIVE.slice(0, 2), [])
  const fewEdges = useMemo(() => ACTIVE_EDGES.filter((edge) => few.some((card) => card.id === edge.from.card) && few.some((card) => card.id === edge.to.card)), [few])
  return (
    <SectionPage>
      <Specimen
        title="A schema"
        description="Tables as cards, fields as rows, relations from field to field. Drag a card by its header (or Shift and an arrow key) to move it; Auto layout puts referenced tables to the left. Select a card to draw its relations in the accent. The wheel pans; Ctrl or Command with the wheel zooms."
        wide
      >
        <SchemaDemo />
      </Specimen>

      <Specimen title="Any records with ports" description="A workflow's steps: outputs link to the inputs that take them. Fixed positions (movable off) inside a Panel, so the canvas drops its own frame." wide>
        <WorkflowDemo />
      </Specimen>

      <Specimen title="Loading and empty" description="The skeleton holds the canvas's box until the cards arrive; an empty diagram says so in the same box.">
        <div className="h-80 w-140 max-w-full">
          <RelationshipCanvas label="Schema" cards={undefined} />
        </div>
        <div className="h-80 w-100 max-w-full">
          <RelationshipCanvas label="Schema" cards={[]} emptyText="No collections to draw yet." />
        </div>
      </Specimen>

      <ContainerLab description="The canvas fills its box: under 20rem by 16rem only Fit stays (scroll and pinch still zoom), and a row-sized box keeps only the diagram.">
        {() => <RelationshipCanvas label="Schema" cards={few} edges={fewEdges} />}
      </ContainerLab>

      <Usage
        code={`
import { RelationshipCanvas } from "glass-ux/relationship-canvas"

<RelationshipCanvas
  label="Schema"
  cards={tables.map((table) => ({
    id: table.id,
    title: table.name,
    icon: <IconTable />,
    rows: table.fields.map((field) => ({
      id: field.id,
      label: field.name,
      detail: field.nullable ? \`\${field.type}?\` : field.type,
      icon: field.primaryKey ? <IconKey /> : undefined,
      tone: field.primaryKey ? "warning" : undefined,
    })),
  }))}
  edges={relations.map((relation) => ({
    id: relation.id,
    from: { card: relation.table, row: relation.field },
    to: { card: relation.target, row: relation.targetField },
    label: relation.name,
    cardinality: relation.many ? "many" : "one",
  }))}
  positions={layout}
  onPositionsChange={saveLayout}
  onOpen={(card) => openTable(card.id)}
/>`}
      />

      <TokenTable
        tokens={[
          ["--fa-relationship-card-w", "a card's width"],
          ["--fa-relationship-header-h / -row-h", "the header, one row"],
          ["--fa-relationship-list-pad", "above the first row and below the last"],
          ["--fa-relationship-gap-x / -gap-y", "between Auto layout's columns, between cards"],
          ["--line / --line-strong", "the frame and the dot grid / edges and arrowheads"],
          ["--accent / --accent-ring", "the selected card's edges and ring (selection, not data)"],
          ["--warning-text", "a key row's icon, by convention"],
        ]}
      />

      <Rules
        do={[
          "Give the canvas a definite height: it is a fill component.",
          "Persist positions from onPositionsChange; cards without one are placed by the automatic layout.",
          "Keep the detail short and in the data's own notation: uuid, text?, int8.",
          "Use TopologyCanvas for a tree of devices; use this when records link to several others, to themselves or round a cycle.",
        ]}
        dont={[
          "Treat a drag as a data change: positions are visual. Create or delete relations through the application's own actions.",
          "Put controls inside a card; open the record with onOpen and edit it there.",
          "Draw hundreds of cards: past a few dozen, offer a list or a filtered view.",
        ]}
      />
    </SectionPage>
  )
}
