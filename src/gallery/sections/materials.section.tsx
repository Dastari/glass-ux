import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconEndpoint } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"

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
      <Specimen title="Layer materials" description="Layers blur what is behind them. A layer never sits inside another layer." backdrop wide>
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
          <Button variant="ghost" size="sm" icon={<IconEndpoint />} aria-label="Remote control" data-mode="dark" />
          <span className="type-label">NST-C106 · 1920 × 1080 · 28 ms</span>
        </div>
      </Specimen>

      <Rules
        do={[
          "Use the material classes; they read every glass token.",
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
          ["--shadow-2", "Panel elevation"],
        ]}
      />
    </SectionPage>
  )
}
