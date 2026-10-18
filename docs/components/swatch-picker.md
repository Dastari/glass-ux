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
      options={PALETTES.map((palette) => ({
        value: palette,
        label: PALETTE_LABELS[palette],
        palette,
      }))}
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

## Collapse (R7)

Like `Segmented`, the picker measures the box it is given and shows the widest form that
fits:

| Form (`data-form`) | When                     | What it shows                                                                                                                     |
| ------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `full`             | every swatch fits        | every swatch on one line                                                                                                          |
| `menu`             | the swatches do not fit  | one lit button with the chosen swatch and a chevron. Its menu lists every swatch with its name and a check on the chosen one       |

- **`collapse`** decides what happens when the swatches do not fit:
  - `"auto"` (default) folds to the menu;
  - `"menu"` always shows the menu, for a host that has already measured;
  - `"none"` never folds: the swatches wrap onto more lines (the behaviour before 0.7).
- **`SegmentedCollapseContext`** sets `collapse` for every Segmented and SwatchPicker inside
  a host. A `collapse` prop on the picker wins.
- The menu button has the same width whatever the value (it shows no text), so choosing a
  colour never moves the controls beside it. With `value={null}` it shows an empty ring.
- The measuring is shared with Segmented (`useFitForm` in `glass-ux/lib/fit-form`): the
  natural width comes from an off-screen track; the room is the parent's content width, or the
  picker's own width when a flex row squeezes it; a form that overflowed is not tried again
  until the parent grows past the room it failed in, so the picker never flips back and forth.

### In a toolbar

A flex row that lets its children overflow never gives a control a smaller box, so nothing
folds. Use the `fa-fit-row` recipe: its children keep their width unless they carry a fit
class, and the row's shortfall goes to the lowest number first.

```tsx
<div className="fa-fit-row" role="region" aria-label="Appearance controls">
  <Segmented size="sm" iconOnly aria-label="Mode" … />            {/* never shrinks */}
  <SwatchPicker size="sm" className="fa-fit-1" aria-label="Palette" … />
  <Segmented size="sm" className="fa-fit-2" aria-label="Density" … />
  <Segmented size="sm" className="fa-fit-3" aria-label="Animations" … />
  <Select size="sm" className="fa-fit-5 my-select" aria-label="Background" … />
</div>
```

- A container-aware control (SwatchPicker, Segmented) that is squeezed folds to its next form
  and stops shrinking, so the shortfall moves on to the next number.
- A control that truncates instead (a Select) needs its own `min-width`.
- The row must take its width from its container, not from its content (`flex: 1 1 0` in a
  header, or a definite width); otherwise a folded control has no room to unfold into.
- Where even the folded controls cannot fit, replace the row with one button that opens them
  (the design site uses a container query and an Appearance popover).

## Behaviour

- **The same API in both forms.** `value`, `defaultValue` and `onValueChange` do not change.
  The group (`role="group"`) keeps its accessible name ("Palette"). The menu button is named
  with the group and the colour ("Palette: Ocean"); its tooltip shows the colour's name.
- **Keyboard.** In the full form, arrow keys move between swatches and Space or Enter
  chooses. In the menu form, Enter, Space or ArrowDown opens the menu, arrows move, Enter
  chooses, and Esc closes it and returns focus to the button.
- **Touch.** The menu button keeps a `--target-min` touch target on coarse pointers without
  growing the track.

Use a `Select` for a long or named list (fonts), and a slider or colour field for a free colour.
