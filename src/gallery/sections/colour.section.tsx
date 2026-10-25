import { useEffect, useRef, useState } from "react"
import { contrastRatio } from "../foundations/color-math.js"
import { Rules, SectionPage, Specimen } from "../kit.js"
import { IconEndpoint, IconSparkle } from "../../icons/generated/icons.js"
import { PALETTES, PALETTE_LABELS, prepareBackgroundImage, useAppearance, type Appearance } from "../../lib/appearance/index.js"
import { Button } from "../../ui/button/index.js"
import { SCENE_IMAGES } from "../fixtures/scenes.js"

/** Each custom colour, and the role a colour input starts from until one is chosen. */
const CUSTOM_COLOURS = [
  ["accentColor", "Accent", "--accent"],
  ["accentColor2", "Second accent", "--accent-2"],
  ["canvasTint", "Canvas tint", "--ambient-1"],
] as const satisfies ReadonlyArray<readonly [keyof Appearance, string, string]>

/** A colour input's value before anything is painted: black. */
const NO_COLOUR = "#000000" // tokens:allow a colour input needs a hex value

/** A role's current colour as `#rrggbb`, read back from a 1 × 1 canvas (colour inputs take only hex). */
function roleHex(role: string) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return NO_COLOUR
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(role).trim()
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

/** Custom colours: each one is a colour input over the palette, with a way back to it. */
function CustomColours() {
  const { appearance, update } = useAppearance()
  useThemeVersion()
  return (
    <div className="colour-custom">
      {CUSTOM_COLOURS.map(([key, label, role]) => {
        const value = appearance[key] ?? null
        const fallback = typeof document === "undefined" ? NO_COLOUR : roleHex(role)
        return (
          <label key={key} className="colour-hue">
            <span className="fa-label colour-custom-label">{label}</span>
            <input type="color" className="colour-custom-input" value={value ?? fallback} onChange={(event) => update({ [key]: event.target.value })} />
            <span className="type-caption text-fg-muted" data-numeric>
              {value ?? "Palette default"}
            </span>
            <Button size="sm" variant="ghost" disabled={value === null} onClick={() => update({ [key]: null })}>
              Reset
            </Button>
          </label>
        )
      })}
    </div>
  )
}

/** A picture as the page canvas: a sample scene, or a file the browser downsizes first. */
function PictureBackground() {
  const { appearance, update } = useAppearance()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const choose = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      update({ background: "image", backgroundImage: await prepareBackgroundImage(file) })
    } catch {
      setError("That file is not a picture this browser can open.")
    }
  }
  return (
    <div className="colour-picture">
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(SCENE_IMAGES).map(([name, url]) => (
          <Button key={name} size="sm" variant="secondary" aria-pressed={appearance.background === "image" && appearance.backgroundImage === url} onClick={() => update({ background: "image", backgroundImage: url })}>
            {name[0]!.toUpperCase() + name.slice(1)}
          </Button>
        ))}
        <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
          Choose a picture…
        </Button>
        <input ref={input} type="file" accept="image/*" hidden onChange={(event) => void choose(event.target.files?.[0])} />
        <Button size="sm" variant="ghost" disabled={appearance.background !== "image"} onClick={() => update({ background: "silk", backgroundImage: null })}>
          Back to Silk
        </Button>
      </div>
      {error ? <p className="type-caption text-danger-text">{error}</p> : null}
    </div>
  )
}

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
              aria-pressed={appearance.palette === palette && appearance.accentHue === null && !appearance.accentColor}
              onClick={() => update({ palette, accentHue: null, accentColor: null, accentColor2: null, canvasTint: null })}
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

      <Specimen title="Custom colours" description="An accent, a second accent and a canvas tint, layered over the palette. The accent's lightness moves until text on it and accent text reach AA; the tint's hue colours the greys and the canvas." layout="stack">
        <CustomColours />
      </Specimen>

      <Specimen title="Picture background" description="The Picture background shows a person's own image under a veil of the canvas colour, so glass and text stay readable. Uploads are downsized before they are stored." layout="stack">
        <PictureBackground />
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
