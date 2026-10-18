# Tooltip

A short label for a control, shown on hover and keyboard focus after 500ms. It composes
with other triggers in either direction:

  <Tooltip content="More actions"><Menu.Trigger render={<Button … />} /></Tooltip>
  <Menu.Trigger render={<Tooltip content="More actions"><Button … /></Tooltip>} />

The trigger keeps its own accessible name; the tooltip repeats it visually.

`import { Tooltip } from "glass-ux/tooltip"`

[Live examples](https://dastari.github.io/glass-ux/components/tooltip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| undefined` | "center", "start", "end" | no | "center" | Alignment of the overlay relative to its anchor. |
| arrow | `boolean \| undefined` | false, true | no | true | A pointer towards the trigger. On by default: tooltips label small, similar targets. |
| children | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>>` | See type | yes | — | The element the tooltip describes. No wrapper is added: the trigger's props and ref are merged onto it, so it must forward its ref and spread props (every design-system control does). A disabled control must stay hoverable — render it with aria-disabled (Base UI `focusableWhenDisabled`) rather than the native disabled attribute. |
| content | `ReactNode` | See type | yes | — | One line: the control's name, or why it is disabled. Never interactive content (R13.5). |
| describe | `boolean \| undefined` | false, true | no | — | Link the open tooltip to the trigger with aria-describedby. Default: only when the content is text that differs from the trigger's aria-label (a reason, extra detail) — a tooltip that repeats the name would be announced twice. |
| enabled | `boolean \| undefined` | false, true | no | true | Set false to suppress the tooltip (for example while text is not truncated). |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state when the tooltip shows (hover or focus, after the delay) or hides. Pair with `open` to control it. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| shortcut | `string \| undefined` | See type | no | — | A keyboard shortcut drawn after the text in keycaps ("mod+k"). |
| side | `"top" \| "bottom" \| "left" \| "right" \| undefined` | "top", "bottom", "left", "right" | no | "top" | Preferred side of the anchor; collision handling may choose another side. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
