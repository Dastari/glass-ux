import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"

const ROLES: Array<[string, string]> = [
  ["--radius-item", "Menu, list and nav rows"],
  ["--radius-control", "Buttons, fields"],
  ["--radius-tile", "Tiles and cards in a panel"],
  ["--radius-overlay", "Menus, popovers, toasts"],
  ["--radius-surface", "Panels, panes, windows"],
  ["--radius-dialog", "Dialogs"],
  ["--radius-full", "Badges, avatars, pills"],
]

export default function ShapeSection() {
  return (
    <SectionPage>
      <Specimen title="Radius roles" description="A component picks a role, never a number. --radius-scale multiplies them all (pills excepted)." layout="grid" wide>
        {ROLES.map(([token, use]) => (
          <div key={token} className="shape-role">
            <span className="shape-box glass-control" style={{ borderRadius: `var(${token})` }} />
            <code className="type-caption">{token}</code>
            <span className="type-caption text-fg-muted">{use}</span>
          </div>
        ))}
      </Specimen>

      <Specimen title="Nested corners" description="Inner radius = outer radius − inset, so concentric corners stay parallel.">
        <div className="shape-nest glass-panel">
          <div className="shape-nest-inner glass-control">
            <span className="type-caption text-fg-muted">overlay − inset = item</span>
          </div>
        </div>
      </Specimen>

      <Specimen title="Hairlines" description="One width for every border and divider. Dividers are a last resort: space and grouping come first." layout="stack">
        <div className="shape-lines">
          <span className="shape-line" style={{ borderTopColor: "var(--line)" }} />
          <span className="shape-line" style={{ borderTopColor: "var(--line-strong)" }} />
          <span className="shape-line" style={{ borderTopColor: "var(--accent-line)" }} />
        </div>
      </Specimen>

      <Rules
        do={["Match the radius role to the element's role.", "Let a glass edge define a shape instead of a heavy border."]}
        dont={["Mix radii within one element.", "Add a divider under a heading or between fields."]}
      />
      <TokenTable
        tokens={[
          ["--radius-scale", "Multiplies every radius"],
          ["--radius-compact", "xs controls; the floor of nested corners"],
          ["--radius-chip", "Code, keycaps, flags and links inside text"],
          ["--radius-line", "Highlighted rows in code, logs, JSON and tables"],
          ["--radius-mark", "Data cells, entity marks, the plot area"],
          ["--radius-skeleton", "Skeleton bars and blocks"],
          ["--radius-media", "Images and attachment thumbnails"],
          ["--radius-tail", "A message bubble's speaker corner"],
          ["--radius-icon", "Icon boxes the height of a small control"],
          ["--radius-tile-icon", "The tile icon"],
          ["--radius-thumb", "Miniatures: snap layouts, swatches"],
          ["--radius-elbow", "The bend of a routed connector"],
          ["--border-width", "Every hairline"],
          ["--focus-ring-width", "Keyboard focus ring"],
          ["--focus-halo", "Text-entry focus halo"],
        ]}
      />
    </SectionPage>
  )
}
