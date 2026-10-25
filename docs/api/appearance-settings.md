# AppearanceSettings

A ready-made appearance panel: every preference the appearance runtime stores, as setting
rows in groups, applied as soon as they change and remembered per person. Put it in a
SettingsDialog section, a Sheet or a page; it needs an AppearanceProvider above it.
Settings the application locked are shown fixed (or hidden), and lists follow
`definePalette` and `defineBackground`.

`import { AppearanceSettings } from "glass-ux/appearance-settings"`

[Live examples](https://dastari.github.io/glass-ux/components/appearance-settings)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| backgrounds | `readonly BackgroundStyle[] \| undefined` | See type | no | BACKGROUNDS | Backgrounds to offer, in order. Default: every registered background (`BACKGROUNDS`). |
| className | `string \| undefined` | See type | no | — | Layout only. |
| labels | `Partial<{ readonly theme: "Theme"; readonly mode: "Mode"; readonly modeDescription: "Light, dark, or the same as this device."; readonly light: "Light"; readonly dark: "Dark"; readonly system: "Match system"; readonly palette: "Palette"; readonly paletteDescription: "The accent and the colours behind the glass."; readonly custom: "Your colours"; readonly accent: "Accent colour"; readonly accentDescription: "Buttons, links and selection. Adjusted so text on it stays readable."; readonly accent2: "Second accent"; readonly accent2Description: "Gradients and highlights beside the accent."; readonly tint: "Canvas tint"; readonly tintDescription: "Tints the greys and the colours behind the glass."; readonly colourDefault: "Default"; readonly background: "Background"; readonly backgroundDescription: "What the glass sits on."; readonly picture: "Picture"; readonly pictureDescription: "Your own image behind the glass, under a light veil."; readonly choosePicture: "Choose a picture…"; readonly removePicture: "Remove picture"; readonly pictureError: "That file is not a picture this browser can open."; readonly display: "Display"; readonly material: "Material"; readonly materialDescription: "How much of the background shows through panels."; readonly glass: "Glass"; readonly frosted: "Frosted"; readonly solid: "Solid"; readonly density: "Density"; readonly densityDescription: "Spacing in lists, tables and forms."; readonly comfortable: "Comfortable"; readonly compact: "Compact"; readonly motion: "Animation"; readonly motionDescription: "Still turns off movement everywhere."; readonly motionSystem: "Match system"; readonly animated: "Animated"; readonly still: "Still"; readonly size: "Interface size"; readonly sizeDescription: "Text, controls and spacing together."; readonly shape: "Shape"; readonly radius: "Corner rounding"; readonly lineWeight: "Line weight"; readonly fonts: "Fonts"; readonly fontSans: "Interface font"; readonly fontDisplay: "Heading font"; readonly fontMono: "Code font"; readonly fontMatch: "Same as interface"; readonly locked: "Set by your organisation"; readonly reset: "Reset to defaults"; }> \| undefined` | See type | no | — | Wording overrides. |
| locked | `"disable" \| "hide" \| undefined` | "disable", "hide" | no | "disable" | What a setting the application locked with `configureAppearance({ locked })` looks like: `"disable"` (default) shows it, unchangeable, with "Set by your organisation"; `"hide"` leaves it out. |
| palettes | `readonly string[] \| undefined` | See type | no | PALETTES | Palettes to offer. Default: every registered palette (`PALETTES`). |
| reset | `boolean \| undefined` | false, true | no | true | Show a "Reset to defaults" button after the groups. Default true. |
| sections | `readonly AppearanceSection[] \| undefined` | See type | no | DEFAULT_APPEARANCE_SECTIONS | Which groups to show, in this order. Default: theme, colours, background, display and size. |
