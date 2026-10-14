import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Button } from "../../ui/button/index.js"

const STEPS = ["1", "2", "3", "4", "5", "6", "8", "10", "12", "16"]
const GAPS: Array<[string, string]> = [
  ["--gap-inline", "Icon to label"],
  ["--gap-controls", "Adjacent buttons"],
  ["--gap-tiles", "Tiles in a grid"],
  ["--gap-panels", "Panels and panes"],
  ["--gap-fields", "Form fields"],
  ["--gap-section", "Sections in a panel"],
]
const BREAKPOINTS: Array<[string, string, string]> = [
  ["md", "768", "Tablet: sidebar becomes a rail"],
  ["lg", "1024", "Desktop shell"],
  ["3xl", "1920", "Design target; inspector stays open"],
  ["4xl", "2560", "Wide: list, detail and inspector together"],
  ["5xl", "3440", "Ultra-wide: tiled windows"],
]

export default function SpaceSection() {
  return (
    <SectionPage>
      <Specimen title="Grid" description="Every space is a whole number of 4px units. Half steps (2, 6, 10px) exist only inside components." layout="stack">
        <div className="space-steps">
          {STEPS.map((step) => (
            <div key={step} className="space-step">
              <code className="type-caption w-16">--space-{step}</code>
              <span className="space-bar" style={{ width: `var(--space-${step})` }} />
              <span className="type-caption text-fg-muted" data-numeric>
                {Number(step) * 4}px
              </span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Semantic gaps" description="Layout code names the relationship, not the number." layout="stack">
        <div className="space-steps">
          {GAPS.map(([token, use]) => (
            <div key={token} className="space-step">
              <code className="type-caption w-32">{token}</code>
              <span className="space-bar" data-tone="accent" style={{ width: `var(${token})` }} />
              <span className="type-caption text-fg-muted">{use}</span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Control heights" description="Three heights shared by buttons, fields, selects and segmented controls. Compact density and touch pointers change them in one place.">
        <div className="space-heights">
          {(["sm", "md", "lg"] as const).map((size) => (
            <div key={size} className="space-height">
              <span className="space-height-box" style={{ height: `var(--control-h-${size})` }} />
              <Button size={size}>Control {size}</Button>
              <code className="type-caption text-fg-muted">--control-h-{size}</code>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Breakpoints" description="Only the shell reads the viewport. Components read their container (container sizes 3xs–8xl)." layout="stack">
        <ul className="space-breakpoints">
          {BREAKPOINTS.map(([name, px, use]) => (
            <li key={name}>
              <code className="type-label w-12">{name}</code>
              <span className="type-label w-16" data-numeric>
                {px}
              </span>
              <span className="type-body text-fg-muted">{use}</span>
            </li>
          ))}
        </ul>
      </Specimen>

      <Rules
        do={[
          "Use gap-* and p-panel / p-tile / p-dialog in layout code.",
          "Lay panels out in auto-fill grids so they reflow by container width.",
          "Spend extra width on more content: columns, panes, windows.",
        ]}
        dont={[
          "Centre a narrow column on a wide screen.",
          "Use margins between siblings; use the parent's gap.",
          "Read the viewport inside a component; use @container.",
        ]}
      />
      <TokenTable
        tokens={[
          ["--unit", "One grid unit"],
          ["--page-gutter", "Shell gutter"],
          ["--inset-panel", "Panel padding"],
          ["--inset-dialog", "Dialog padding"],
          ["--sidebar-w", "Sidebar"],
          ["--topbar-h", "Top bar"],
          ["--inspector-w", "Inspector pane"],
        ]}
      />
    </SectionPage>
  )
}
