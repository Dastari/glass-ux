import { Radio as BaseRadio } from "@base-ui/react/radio"
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group"
import { useRef, useState, type ReactNode } from "react"
import { IconMoon, IconSun, IconSystem } from "../../icons/generated/icons.js"
import {
  BACKGROUND_LABELS,
  BACKGROUNDS,
  FONT_OPTIONS,
  isLocked,
  PALETTE_LABELS,
  PALETTES,
  prepareBackgroundImage,
  useAppearance,
  type Appearance,
  type BackgroundStyle,
} from "../../lib/appearance/index.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { Button } from "../button/index.js"
import { ColorField } from "../color-picker/index.js"
import { FormGroup, FormStack } from "../form/index.js"
import { Segmented } from "../segmented/index.js"
import { Select } from "../select/index.js"
import { SettingRow } from "../setting-row/index.js"
import { Slider } from "../slider/index.js"
import { SwatchPicker } from "../swatch-picker/index.js"
import { appearanceSettingsMessages } from "./messages.js"

/**
 * The groups AppearanceSettings can show:
 *   theme       mode and palette
 *   colours     the person's own accent, second accent and canvas tint
 *   background  the canvas style, and a picture for the Picture background
 *   display     material, density and animation
 *   size        interface size
 *   shape       corner rounding and line weight
 *   fonts       interface, heading and code fonts
 */
export type AppearanceSection = "theme" | "colours" | "background" | "display" | "size" | "shape" | "fonts"

/** The default groups: everything a person usually changes. Shape and fonts are opt-in. */
export const DEFAULT_APPEARANCE_SECTIONS: readonly AppearanceSection[] = ["theme", "colours", "background", "display", "size"]

export interface AppearanceSettingsProps {
  /** Which groups to show, in this order. Default: theme, colours, background, display and size. */
  sections?: readonly AppearanceSection[]
  /** Backgrounds to offer, in order. Default: every registered background (`BACKGROUNDS`). */
  backgrounds?: readonly BackgroundStyle[]
  /** Palettes to offer. Default: every registered palette (`PALETTES`). */
  palettes?: readonly string[]
  /**
   * What a setting the application locked with `configureAppearance({ locked })` looks like:
   * `"disable"` (default) shows it, unchangeable, with "Set by your organisation"; `"hide"` leaves it out.
   */
  locked?: "disable" | "hide"
  /** Show a "Reset to defaults" button after the groups. Default true. */
  reset?: boolean
  /** Wording overrides. */
  labels?: Partial<typeof appearanceSettingsMessages.defaults>
  /** Layout only. */
  className?: string
}

/**
 * A ready-made appearance panel: every preference the appearance runtime stores, as setting
 * rows in groups, applied as soon as they change and remembered per person. Put it in a
 * SettingsDialog section, a Sheet or a page; it needs an AppearanceProvider above it.
 * Settings the application locked are shown fixed (or hidden), and lists follow
 * `definePalette` and `defineBackground`.
 */
export function AppearanceSettings({
  sections = DEFAULT_APPEARANCE_SECTIONS,
  backgrounds = BACKGROUNDS,
  palettes = PALETTES,
  locked = "disable",
  reset = true,
  labels,
  className,
}: AppearanceSettingsProps) {
  const t = useMessages(appearanceSettingsMessages, { labels })
  const { appearance, update, reset: resetAll } = useAppearance()

  /** A row for one knob: hidden or fixed when the application locked it. */
  const row = (key: keyof Appearance | Array<keyof Appearance>, render: (fixed: boolean) => ReactNode) => {
    const keys = Array.isArray(key) ? key : [key]
    const fixed = keys.every((k) => isLocked(k))
    if (fixed && locked === "hide") return null
    return render(fixed)
  }
  const note = (fixed: boolean, description: ReactNode) => (fixed ? t.locked : description)

  const groups: Record<AppearanceSection, () => ReactNode> = {
    theme: () => (
      <FormGroup key="theme" label={t.theme}>
        {row("mode", (fixed) => (
          <SettingRow
            label={t.mode}
            description={note(fixed, t.modeDescription)}
            disabled={fixed}
            control={
              <Segmented<Appearance["mode"]>
                aria-label={t.mode}
                disabled={fixed}
                value={appearance.mode}
                onValueChange={(mode) => update({ mode })}
                options={[
                  { value: "light", label: t.light, icon: <IconSun /> },
                  { value: "dark", label: t.dark, icon: <IconMoon /> },
                  { value: "system", label: t.system, icon: <IconSystem /> },
                ]}
              />
            }
          />
        ))}
        {row("palette", (fixed) => (
          <SettingRow
            label={t.palette}
            description={note(fixed, t.paletteDescription)}
            disabled={fixed}
            control={
              <SwatchPicker
                aria-label={t.palette}
                disabled={fixed}
                value={appearance.accentColor ? null : appearance.palette}
                onValueChange={(palette) => update({ palette, accentHue: null, accentColor: null, accentColor2: null, canvasTint: null })}
                options={palettes.map((palette) => ({ value: palette, label: PALETTE_LABELS[palette] ?? palette, palette }))}
              />
            }
          />
        ))}
      </FormGroup>
    ),
    colours: () => {
      const rows = (
        [
          ["accentColor", t.accent, t.accentDescription],
          ["accentColor2", t.accent2, t.accent2Description],
          ["canvasTint", t.tint, t.tintDescription],
        ] as const
      ).map(([key, label, description]) =>
        row(key, (fixed) => (
          <SettingRow
            key={key}
            label={label}
            description={note(fixed, description)}
            disabled={fixed}
            control={
              <ColorField
                aria-label={label}
                width="short"
                clearable
                placeholder={t.colourDefault}
                disabled={fixed || (key === "accentColor2" && !appearance.accentColor)}
                value={appearance[key] ?? null}
                onValueChange={(value) => update({ [key]: value })}
              />
            }
          />
        )),
      )
      return rows.some(Boolean) ? (
        <FormGroup key="colours" label={t.custom}>
          {rows}
        </FormGroup>
      ) : null
    },
    background: () =>
      row(["background", "backgroundImage"], (fixed) => (
        <FormGroup key="background" label={t.background}>
          <BackgroundTiles
            label={t.background}
            value={appearance.background ?? "silk"}
            options={backgrounds}
            disabled={fixed || isLocked("background")}
            onValueChange={(background) => update({ background })}
          />
          {appearance.background === "image" ? (
            <PictureRow
              t={t}
              disabled={fixed || isLocked("backgroundImage")}
              hasPicture={Boolean(appearance.backgroundImage)}
              onPicture={(backgroundImage) => update({ background: "image", backgroundImage })}
            />
          ) : null}
        </FormGroup>
      )),
    display: () => (
      <FormGroup key="display" label={t.display}>
        {row("glass", (fixed) => (
          <SettingRow
            label={t.material}
            description={note(fixed, t.materialDescription)}
            disabled={fixed}
            control={
              <Segmented<Appearance["glass"]>
                aria-label={t.material}
                disabled={fixed}
                value={appearance.glass}
                onValueChange={(glass) => update({ glass })}
                options={[
                  { value: "full", label: t.glass },
                  { value: "reduced", label: t.frosted },
                  { value: "solid", label: t.solid },
                ]}
              />
            }
          />
        ))}
        {row("density", (fixed) => (
          <SettingRow
            label={t.density}
            description={note(fixed, t.densityDescription)}
            disabled={fixed}
            control={
              <Segmented<Appearance["density"]>
                aria-label={t.density}
                disabled={fixed}
                value={appearance.density}
                onValueChange={(density) => update({ density })}
                options={[
                  { value: "comfortable", label: t.comfortable },
                  { value: "compact", label: t.compact },
                ]}
              />
            }
          />
        ))}
        {row("motion", (fixed) => (
          <SettingRow
            label={t.motion}
            description={note(fixed, t.motionDescription)}
            disabled={fixed}
            control={
              <Segmented<Appearance["motion"]>
                aria-label={t.motion}
                disabled={fixed}
                value={appearance.motion}
                onValueChange={(motion) => update({ motion })}
                options={[
                  { value: "system", label: t.motionSystem },
                  { value: "full", label: t.animated },
                  { value: "reduced", label: t.still },
                ]}
              />
            }
          />
        ))}
      </FormGroup>
    ),
    size: () =>
      row("uiScale", (fixed) => (
        <FormGroup key="size" label={t.size}>
          <SettingRow
            label={t.size}
            description={note(fixed, t.sizeDescription)}
            disabled={fixed}
            control={
              <Slider
                className="fa-appearance-slider"
                aria-label={t.size}
                disabled={fixed}
                min={0.875}
                max={1.25}
                step={0.125}
                marks
                value={appearance.uiScale}
                format={(value) => `${Math.round(value * 100)}%`}
                onValueChange={(value) => update({ uiScale: value as number })}
              />
            }
          />
        </FormGroup>
      )),
    shape: () => (
      <FormGroup key="shape" label={t.shape}>
        {row("radiusScale", (fixed) => (
          <SettingRow
            label={t.radius}
            description={fixed ? t.locked : undefined}
            disabled={fixed}
            control={
              <Slider
                className="fa-appearance-slider"
                aria-label={t.radius}
                disabled={fixed}
                min={0}
                max={1.5}
                step={0.25}
                marks
                value={appearance.radiusScale}
                format={(value) => `${Math.round(value * 100)}%`}
                onValueChange={(value) => update({ radiusScale: value as number })}
              />
            }
          />
        ))}
        {row("borderWidth", (fixed) => (
          <SettingRow
            label={t.lineWeight}
            description={fixed ? t.locked : undefined}
            disabled={fixed}
            control={
              <Slider
                className="fa-appearance-slider"
                aria-label={t.lineWeight}
                disabled={fixed}
                min={0.5}
                max={2}
                step={0.5}
                marks
                value={appearance.borderWidth}
                format={(value) => `${value} px`}
                onValueChange={(value) => update({ borderWidth: value as number })}
              />
            }
          />
        ))}
      </FormGroup>
    ),
    fonts: () => (
      <FormGroup key="fonts" label={t.fonts}>
        {(
          [
            ["fontSans", t.fontSans, FONT_OPTIONS.sans],
            ["fontDisplay", t.fontDisplay, [{ id: "match", label: t.fontMatch }, ...FONT_OPTIONS.display]],
            ["fontMono", t.fontMono, FONT_OPTIONS.mono],
          ] as const
        ).map(([key, label, options]) =>
          row(key, (fixed) => (
            <SettingRow
              key={key}
              label={label}
              description={fixed ? t.locked : undefined}
              disabled={fixed}
              control={
                <Select
                  aria-label={label}
                  width="medium"
                  disabled={fixed}
                  value={appearance[key]}
                  onValueChange={(value) => value && update({ [key]: value })}
                  options={options.map((option) => ({ value: option.id, label: option.label }))}
                />
              }
            />
          )),
        )}
      </FormGroup>
    ),
  }

  return (
    <FormStack className={cx("fa-appearance-settings", className)}>
      {sections.map((section) => groups[section]())}
      {reset ? (
        <div className="fa-appearance-reset">
          <Button variant="secondary" size="sm" onClick={resetAll}>
            {t.reset}
          </Button>
        </div>
      ) : null}
    </FormStack>
  )
}

/** Background tiles: a radio group whose options preview the background, artwork included. */
function BackgroundTiles({
  label,
  value,
  options,
  disabled,
  onValueChange,
}: {
  label: string
  value: BackgroundStyle
  options: readonly BackgroundStyle[]
  disabled: boolean
  onValueChange: (value: BackgroundStyle) => void
}) {
  return (
    <BaseRadioGroup<BackgroundStyle>
      className="fa-appearance-backgrounds"
      aria-label={label}
      value={value}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next)}
    >
      {options.map((background) => (
        <BaseRadio.Root key={background} value={background} className="fa-appearance-background fa-pressable" nativeButton render={<button type="button" />}>
          <span className="fa-appearance-background-preview canvas-ambient" data-background={background} aria-hidden>
            <span className="canvas-silk" data-background={background} data-contained />
          </span>
          <span className="fa-appearance-background-label">{BACKGROUND_LABELS[background] ?? background}</span>
        </BaseRadio.Root>
      ))}
    </BaseRadioGroup>
  )
}

/** The Picture background's picture: choose a file (downsized before it is stored) or remove it. */
function PictureRow({
  t,
  disabled,
  hasPicture,
  onPicture,
}: {
  t: typeof appearanceSettingsMessages.defaults
  disabled: boolean
  hasPicture: boolean
  onPicture: (url: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState(false)
  return (
    <SettingRow
      label={t.picture}
      description={error ? undefined : disabled ? t.locked : t.pictureDescription}
      error={error ? t.pictureError : undefined}
      status={error ? "error" : undefined}
      disabled={disabled}
      control={
        <span className="fa-appearance-picture">
          <Button size="sm" variant="secondary" disabled={disabled} onClick={() => input.current?.click()}>
            {t.choosePicture}
          </Button>
          {hasPicture ? (
            <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onPicture(null)}>
              {t.removePicture}
            </Button>
          ) : null}
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (!file) return
              try {
                onPicture(await prepareBackgroundImage(file))
                setError(false)
              } catch {
                setError(true)
              }
            }}
          />
        </span>
      }
    />
  )
}
