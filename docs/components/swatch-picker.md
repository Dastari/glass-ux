# Swatch picker

`glass-ux/swatch-picker` · [Live component catalogue](https://dastari.github.io/glass-ux/)


One colour from a small set, where the colours themselves are the choice: a palette, an
organisation's tint. Round swatches sit in the segmented control's recessed track (same heights:
sm 32, md 40), each named by a tooltip and its accessible name. The chosen swatch takes a canvas
gap and the page's accent ring. It is a toggle group: one tab stop, arrow keys move between
swatches. In a `SettingRow` the row's label names it, like `Segmented`.

```tsx
<SettingRow
  label="Palette"
  description={PALETTE_LABELS[appearance.palette]}
  control={
    <SwatchPicker<Palette>
      value={appearance.palette}
      onValueChange={(palette) => update({ palette, accentHue: null })}
      options={PALETTES.map((palette) => ({ value: palette, label: PALETTE_LABELS[palette], palette }))}
    />
  }
/>
```

- **`palette`** on an option makes the swatch a palette island (`data-palette`): it paints that
  palette's accent gradient in the current mode, so it needs no second colour for dark mode.
- **`colour`** paints a token instead (`var(--identity-3)`). Never pass a raw colour.
- **`value={null}`** shows no choice, for when a custom colour is in use (the profile's custom
  accent hue).
- Show the chosen colour's name as the row's description when people need to say it out loud.

Use a `Select` for a long or named list (fonts), and a slider or colour field for a free colour.
