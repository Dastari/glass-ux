import { useEffect, useState } from "react"
import { contrastRatio } from "../foundations/color-math.js"
import { Rules, SectionPage, Specimen } from "../kit.js"
import { IconEndpoint, IconSparkle } from "../../icons/generated/icons.js"
import { PALETTES, PALETTE_LABELS } from "../../lib/appearance/appearance.js"
import { useAppearance } from "../../lib/appearance/use-appearance.js"
import { Button } from "../../ui/button/index.js"

const TEXT_ROLES = [
  ["--fg", "Primary text"],
  ["--fg-muted", "Secondary text, labels"],
  ["--fg-subtle", "Metadata, placeholders"],
  ["--fg-disabled", "Disabled (exempt)"],
  ["--accent-text", "Accent text, links, selection"],
  ["--success-text", "Success text"],
  ["--warning-text", "Warning text"],
  ["--danger-text", "Danger text"],
  ["--info-text", "Info text"],
] as const

const SURFACE_ROLES = [
  ["--canvas", "Canvas behind all glass"],
  ["--glass-fill-panel", "Panel fill"],
  ["--glass-fill-overlay", "Overlay fill"],
  ["--glass-fill-control", "Control fill"],
  ["--fill-hover", "Hover state layer"],
  ["--fill-press", "Pressed state layer"],
  ["--fill-muted", "Tracks, wells"],
  ["--line", "Hairline"],
  ["--line-strong", "Strong hairline"],
] as const

const TONES = ["accent", "success", "warning", "danger", "info"] as const

/** Re-render when the theme changes so live values and contrast stay current. */
function useThemeVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode", "data-palette", "data-glass", "style"] })
    return () => observer.disconnect()
  }, [])
  return version
}

function readVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function ContrastBadge({ role }: { role: string }) {
  const version = useThemeVersion()
  const [ratio, setRatio] = useState<number | null>(null)
  useEffect(() => {
    setRatio(contrastRatio(readVar(role), readVar("--glass-fill-panel"), readVar("--canvas")))
  }, [role, version])
  if (ratio === null) return <span className="colour-ratio" />
  const exempt = role === "--fg-disabled"
  const pass = ratio >= 4.5
  return (
    <span className="colour-ratio" data-pass={exempt ? "exempt" : pass ? "aa" : "fail"} data-numeric>
      {ratio.toFixed(2)}:1 {exempt ? "" : pass ? "AA" : "fail"}
    </span>
  )
}

export default function ColourSection() {
  const { appearance, update } = useAppearance()
  return (
    <SectionPage>
      <Specimen title="Palettes" description="A palette is a hue, a chroma and an accent lightness. Every role below is derived from those by one set of formulas, so each palette and any custom hue get the same contrast and the same shape." layout="stack" wide>
        <div className="colour-palettes">
          {PALETTES.map((palette) => (
            <button
              key={palette}
              type="button"
              data-palette={palette}
              className="colour-palette glass-control fa-pressable"
              aria-pressed={appearance.palette === palette && appearance.accentHue === null}
              onClick={() => update({ palette, accentHue: null })}
            >
              <span className="colour-palette-bar" />
              <span className="type-label">{PALETTE_LABELS[palette]}</span>
              <span className="flex items-center gap-2">
                <span className="colour-chip" data-tone="accent">
                  <IconEndpoint size="sm" /> Online
                </span>
                <span className="type-caption text-accent-text">Selected</span>
              </span>
            </button>
          ))}
        </div>
        <label className="colour-hue">
          <span className="fa-label">Custom accent hue</span>
          <input
            type="range"
            min={0}
            max={360}
            value={appearance.accentHue ?? 25}
            onChange={(event) => update({ accentHue: Number(event.target.value) })}
          />
          <span className="type-caption text-fg-muted" data-numeric>
            {appearance.accentHue === null ? "Palette default" : `${appearance.accentHue}°`}
          </span>
          <Button size="sm" variant="ghost" onClick={() => update({ accentHue: null })}>
            Reset
          </Button>
        </label>
      </Specimen>

      <Specimen title="Text on glass" description="Each text role measured against the panel fill over the canvas, in the current mode and palette. AA requires 4.5:1." layout="stack">
        <ul className="colour-roles">
          {TEXT_ROLES.map(([role, use]) => (
            <li key={role}>
              <span className="colour-sample" style={{ color: `var(${role})` }}>
                Aa
              </span>
              <span className="min-w-0 flex-1">
                <code className="type-caption">{role}</code>
                <span className="block type-caption text-fg-muted">{use}</span>
              </span>
              <ContrastBadge role={role} />
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen title="Surfaces and state layers" description="Neutral layers are translucent so they work on every material." layout="stack">
        <ul className="colour-roles">
          {SURFACE_ROLES.map(([role, use]) => (
            <li key={role}>
              <span className="colour-swatch" style={{ background: `var(${role})` }} />
              <span className="min-w-0 flex-1">
                <code className="type-caption">{role}</code>
                <span className="block type-caption text-fg-muted">{use}</span>
              </span>
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen title="Accent and status" description="Each tone has a solid fill, a soft tint, a text colour and a line. Status colours carry meaning only." layout="stack" wide>
        <div className="colour-tones">
          {TONES.map((tone) => (
            <div key={tone} className="colour-tone">
              <span className="type-label capitalize">{tone}</span>
              <span className="colour-tone-solid" style={{ background: `var(--${tone})` }}>
                <IconSparkle size="sm" />
              </span>
              <span className="colour-chip" data-tone={tone}>
                Soft
              </span>
              <span className="type-label" style={{ color: `var(--${tone}-text)` }}>
                Text
              </span>
              <span className="colour-tone-line" style={{ borderColor: `var(--${tone}-line)` }} />
            </div>
          ))}
        </div>
      </Specimen>

      <Rules
        do={[
          "Use roles (fg-muted, accent-soft, danger-text) — never palette hues or literal colours.",
          "Use status colours for status only: online, failed, warning, info.",
          "Check new screens in both modes, every palette and Solid material.",
        ]}
        dont={[
          "Write dark: overrides or per-component colours.",
          "Put accent-text on accent-soft for long text; it is for labels and selection.",
          "Rely on colour alone — pair status colour with an icon or a word.",
        ]}
      />
    </SectionPage>
  )
}
