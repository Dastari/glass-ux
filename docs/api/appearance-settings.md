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
| labels | `Partial<{ theme: string; mode: string; modeDescription: string; light: string; dark: string; system: string; palette: string; paletteDescription: string; custom: string; accent: string; accentDescription: string; secondAccent: string; secondAccentDescription: string; tint: string; tintDescription: string; colourDefault: string; background: string; backgroundDescription: string; picture: string; pictureDescription: string; choosePicture: string; removePicture: string; pictureError: string; display: string; material: string; materialDescription: string; glass: string; frosted: string; solid: string; density: string; densityDescription: string; comfortable: string; compact: string; motion: string; motionDescription: string; motionSystem: string; animated: string; still: string; size: string; sizeDescription: string; shape: string; radius: string; lineWeight: string; fonts: string; fontSans: string; fontDisplay: string; fontMono: string; fontMatch: string; locked: string; reset: string; backgroundSilk: string; backgroundMesh: string; backgroundCurrents: string; backgroundWaves: string; backgroundContours: string; backgroundFacets: string; backgroundGrid: string; backgroundPixels: string; backgroundCircuit: string; backgroundNetwork: string; backgroundSkyline: string; backgroundHarbour: string; backgroundForest: string; backgroundHills: string; backgroundGarden: string; backgroundPlain: string; backgroundImage: string; paletteOcean: string; paletteAurora: string; paletteEmerald: string; paletteSunset: string; paletteGraphite: string; paletteRuby: string; paletteLagoon: string; paletteIndigo: string; paletteRose: string; paletteMoss: string; paletteSand: string; paletteSlate: string; }> \| undefined` | See type | no | — | Wording overrides. |
| locked | `"disable" \| "hide" \| undefined` | "disable", "hide" | no | "disable" | What a setting the application locked with `configureAppearance({ locked })` looks like: `"disable"` (default) shows it, unchangeable, with "Set by your organisation"; `"hide"` leaves it out. |
| palettes | `readonly string[] \| undefined` | See type | no | PALETTES | Palettes to offer. Default: every registered palette (`PALETTES`). |
| reset | `boolean \| undefined` | false, true | no | true | Show a "Reset to defaults" button after the groups. Default true. |
| sections | `readonly AppearanceSection[] \| undefined` | See type | no | DEFAULT_APPEARANCE_SECTIONS | Which groups to show, in this order. Default: theme, colours, background, display and size. |
