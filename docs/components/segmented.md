# Segmented control

`glass-ux/segmented` · [Live component catalogue](https://dastari.github.io/glass-ux/)

the phone More sheet and the breadcrumb's trail, the design site's toolbar, setting rows
(R15.3), data-table filter editors and device and people list views.

Two to five mutually exclusive modes. A recessed glass track with a lit pill that slides to the
chosen segment.

```tsx
<Segmented
  aria-label="Module"
  size="sm"
  value={module}
  onValueChange={switchModule}
  options={[{ value: "rmm", label: "RMM" }, { value: "psa", label: "PSA" }, { value: "chat", label: "CHAT" }]}
/>
```

## Collapse (R7)

The control measures the box it is given and shows the widest form that fits:

| Form (`data-form`) | When | What it shows |
| --- | --- | --- |
| `full` | every label fits | every segment with its icon and label |
| `icons` | the labels do not fit, every option has an icon and the icons fit | the icons, each named by its label (name and tooltip) |
| `menu` | nothing else fits | one button drawn as the chosen pill: its icon, label and a chevron ("RMM ▾"). Its menu lists the options with a check on the chosen one |

- **`collapse`** decides what happens when the options do not fit:
  - `"auto"` (default) is the ladder above;
  - `"menu"` always shows the menu, for a host that has already measured (the top bar on a
    phone);
  - `"none"` never collapses: the segments scroll sideways inside the track (the old
    behaviour).
- **`SegmentedCollapseContext`** lets a host set `collapse` for every control inside it. The
  top bar provides `"menu"` around its module slot when it folds under 34rem. A `collapse` prop
  on the control wins.
- `block` controls fill their box and share it equally, so they never collapse.
- `iconOnly` starts at icons and still folds to the menu when even the icons do not fit.

The measurement:

- the natural widths come from an off-screen row, so they are known in every form;
- the room is the parent's content width, or the control's own width when it overflows inside a
  flex row;
- a form that overflowed is not tried again until the parent grows past the room it failed in,
  so the control never flips back and forth.

`fitSegmented({ room, full, icons })` and `nextSegmentedForm(shown, …)` are the pure parts,
unit-tested in `segmented.test.ts`.

## Behaviour

- **The same API in every form.** `value`, `defaultValue` and `onValueChange` do not change.
  The group (`role="group"`) keeps its accessible name ("Module"). In the menu form the button
  is named with the group and the choice ("Module: RMM"), so the visible text is in the name.
- **Keyboard.** In full and icon forms, arrow keys move between segments and Space or Enter
  chooses. In the menu form, Enter, Space or ArrowDown opens the menu, arrows move, Enter
  chooses, and Esc closes it and returns focus to the button.
- **Touch.** The menu button keeps a `--target-min` touch target on coarse pointers without
  growing the track.
- **Tones.** `tone` tints the chosen pill, and the menu button with it.

**Parts:** `Segmented`, `SegmentedCollapseContext`, `fitSegmented`, `nextSegmentedForm`,
`SegmentedOption`, `SegmentedForm`, `SegmentedCollapse`.
