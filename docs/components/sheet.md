# Sheet

A pane from a screen edge: the inspector (`right`), the section drawer (`left`), or a short
list of choices (`bottom`). `start` and `end` follow the reading direction. Esc, the scrim, a
close control or a swipe toward the edge closes it, and focus returns to the trigger.

```tsx
<Sheet.Root side="right">
  <Sheet.Trigger render={<Button>Details</Button>} />
  <Sheet.Popup size="md">
    <Sheet.Header icon={<IconEndpoint />} title="NST-C106" subtitle="HP EliteOne 1000 G2" />
    <Sheet.Body>…</Sheet.Body>
    <Sheet.Footer>
      <Sheet.Close render={<Button>Close</Button>} />
    </Sheet.Footer>
  </Sheet.Popup>
</Sheet.Root>
```

## Snap points

A bottom sheet can rest at several heights. Give `snapPoints` as fractions of the viewport
height (`0.5`; `1` is the full height), pixels (`240`, `"240px"`) or rems (`"10rem"`). The
sheet opens at `defaultSnapPoint` (the first point when omitted) and returns to it each time
it closes; control it with `snapPoint` and `onSnapPointChange`.

```tsx
const points = ["10rem", 0.5, 1]
const [point, setPoint] = useState<SheetSnapPoint | null>(points[0])

<Sheet.Root
  side="bottom"
  snapPoints={points}
  snapPointLabels={["Peek", "Half", "Full"]}
  snapPoint={point}
  onSnapPointChange={(next) => setPoint(next)}
>
```

- **Drag** the handle or the content: the sheet follows and settles on the nearest point; a
  fast flick carries past points, and a drag below the lowest closes it.
  `snapToSequentialPoints` settles by distance alone.
- **Keyboard**: the handle is a vertical slider named "Sheet height". Arrow and Page keys
  step, Home and End pick the lowest and highest, and Enter, Space or a click raises it one
  point (from the highest back to the lowest). Its value reads `snapPointLabels`, or
  "Height 2 of 3".
- **Body**: below the highest point the body does not scroll, so a drag or wheel on it raises
  the sheet first; at the highest point the body scrolls, and on touch a pull down from its top lowers
  the sheet. Focus reaching a control below the visible part raises the sheet to its highest
  point.
- The sheet fills the viewport's height and shows the part the active point allows; the body
  and footer end at the visible edge. The scrim fades as the sheet lowers from its highest
  point, but a modal sheet keeps the page inert at every point.
- `onSnapPointChange` receives `null` while a swipe closes the sheet. `details.cancel()`
  keeps the current point. Side sheets ignore snap points.

## Non-modal

`modal={false}` opens the sheet beside a usable page: no scrim, the page keeps scrolling and
taking clicks, focus is not trapped, and Esc still closes it. A press outside, or focus
moving to the page, leaves it open (`disablePointerDismissal` defaults to true here). For an
inspector that follows a selection, pass `initialFocus={false}` so focus stays in the list.

```tsx
<Sheet.Root modal={false} open={open} onOpenChange={setOpen}>
  <Sheet.Popup size="sm" initialFocus={false}>…</Sheet.Popup>
</Sheet.Root>
```

## Nested sheets

A `Sheet.Root` inside another sheet's popup stacks on it. The parent keeps the only scrim,
recedes (moves toward the page, shrinks and dims) and takes no input until the front sheet
closes; it follows the front sheet back while that one is swiped away. A bottom parent grows
to at least the front sheet's height so its top edge shows above it. Esc and a close control
close the front sheet first, and focus returns to the control in the parent that opened it.
Stack at most two sheets (R13.3); open a window for anything deeper.

## Motion

Sheets slide on `--duration-slow` and `--ease-enter` and leave on `--ease-exit`. Under Still
or reduced motion every transition is instant, including snapping between points and the
parent's recede.

See the [Sheet component page](https://dastari.github.io/glass-ux/components/sheet) for live
examples and every typed property.
