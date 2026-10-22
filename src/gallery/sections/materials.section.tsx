import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconEndpoint } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { Segmented } from "../../ui/segmented/index.js"

const LIT: Array<[string, string]> = [
  ["glass-control", "Control fill"],
  ["glass-card", "Card"],
]
const MODES = [
  { value: "control", label: "Control" },
  { value: "view", label: "View only" },
  { value: "files", label: "Files" },
]

const LAYERS: Array<[string, string]> = [
  ["glass-chrome", "Sidebar, top bar, dock"],
  ["glass-panel", "Panels, panes, windows"],
  ["glass-overlay", "Dialogs, menus, toasts"],
  ["glass-float", "Toolbars over media"],
]
const FILLS: Array<[string, string]> = [
  ["glass-control", "Fields, secondary buttons"],
  ["glass-inset", "Wells, table headers"],
]

export default function MaterialsSection() {
  return (
    <SectionPage>
      <Specimen title="Layer materials" description="Layers blur what is behind them. A lit top edge, a shaded lower edge and a soft inner lens glow give them thickness. A layer never sits inside another layer." backdrop wide>
        <div className="materials-grid">
          {LAYERS.map(([material, use]) => (
            <div key={material} className={`materials-card ${material}`}>
              <span className="fa-tile-icon">
                <IconEndpoint />
              </span>
              <code className="type-label">{material}</code>
              <span className="type-caption materials-use">{use}</span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Light" description="Lit glass reflects a fine pointer: a soft bloom follows it across buttons, segments, select triggers, choice cards and these tiles, and the rim nearest it catches a glint, tinted in light mode so it reads on white glass. It brightens on press. Under Still it rests at the top edge; Solid removes it.">
        <div className="materials-lit">
          {LIT.map(([material, use]) => (
            <div key={material} className={`materials-lit-tile fa-lit ${material}`}>
              <code className="type-label">{material} fa-lit</code>
              <span className="type-caption text-fg-muted">{use}</span>
            </div>
          ))}
        </div>
        <div className="materials-lit-controls">
          <Button variant="primary">Connect</Button>
          <Button variant="secondary">View only</Button>
          <Segmented options={MODES} defaultValue="control" aria-label="Session mode" />
        </div>
      </Specimen>

      <Specimen title="Fill materials" description="Fills never blur, so they nest anywhere — inside panels, dialogs and windows.">
        <div className="materials-fills glass-panel">
          {FILLS.map(([material, use]) => (
            <div key={material} className={`materials-fill ${material}`}>
              <code className="type-label">{material}</code>
              <span className="type-caption text-fg-muted">{use}</span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Elevation" description="Shadows mean height: controls, panels, overlays, dialogs. The accent glow belongs to primary buttons.">
        <div className="materials-elevation">
          {[1, 2, 3, 4].map((level) => (
            <span key={level} className="materials-shadow" style={{ boxShadow: `var(--shadow-${level})` }}>
              <code className="type-caption">--shadow-{level}</code>
            </span>
          ))}
          <Button variant="primary">Accent glow</Button>
        </div>
      </Specimen>

      <Specimen title="Over imagery" description="The float material keeps controls legible over a remote desktop or a chart." backdrop>
        <div className="glass-float materials-toolbar">
          <Button variant="ghost" size="sm" icon={<IconEndpoint />} aria-label="Remote control" />
          <span className="type-label">NST-C106 · 1920 × 1080 · 28 ms</span>
        </div>
      </Specimen>

      <Rules
        do={[
          "Use the material classes; they read every glass token.",
          "Add fa-lit to a positioned, interactive fill to let it catch the pointer's light.",
          "Keep every screen usable in Solid (Settings or reduce transparency).",
          "Put glass over the ambient canvas or imagery so it has something to bend.",
        ]}
        dont={[
          "Write backdrop-filter, fills or rims in a component.",
          "Nest a blurred layer inside another (a card with blur inside a panel).",
          "Use shadows for decoration.",
        ]}
      />
      <TokenTable
        tokens={[
          ["--glass-blur-panel", "Panel blur"],
          ["--glass-blur-overlay", "Overlay blur"],
          ["--glass-saturate", "Backdrop saturation"],
          ["--glass-fill-panel", "Panel tint"],
          ["--glass-edge", "Outer hairline"],
          ["--glass-rim-top", "Top highlight"],
          ["--glass-rim-bottom", "Shaded lower edge"],
          ["--glass-lens", "Inner lens glow (none in Solid)"],
          ["--specular", "Pointer highlight (none in Solid)"],
          ["--specular-rim", "Rim glint nearest the pointer (none in Solid)"],
          ["--shadow-2", "Panel elevation"],
        ]}
      />
    </SectionPage>
  )
}
