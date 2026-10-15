# Slider

Use `Slider` for approximate values such as volume, quality or zoom. Use a number field
when someone needs to enter an exact value. A single number renders one thumb; an array
renders a range. Name each range thumb with `thumbLabels`.

```tsx
const [volume, setVolume] = useState(40)

<Slider
  value={volume}
  onValueChange={(next) => setVolume(next as number)}
  min={0}
  max={100}
  step={1}
  unit="%"
  aria-label="Volume"
/>
```

`onValueChange` follows interaction. `onValueCommitted` fires when the user releases a
drag or commits a keyboard step. Arrow keys step, Page and Shift keys take larger steps,
and Home/End select the minimum/maximum. Disabled sliders keep their value and do not
accept interaction. Put the current value in the surrounding `Field` label row when
it must remain visible without focus.

Sliders work in retained, initially hidden tabs and dialogs. The component measures
when the container becomes visible and follows later resizing; applications do not
need to remount it or dispatch a synthetic resize event. During server rendering the
Root, Control and Track keep their layout structure. Thumbs and native inputs initialize
after the client Control attaches, so measurement can observe its actual container.

See the [Slider component page](https://dastari.github.io/glass-ux/components/slider)
for live examples, complete source and every typed property and valid option.
