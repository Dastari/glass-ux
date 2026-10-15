# TruncatedText

One line of text that ends in an ellipsis when it does not fit, and shows the full text
in a tooltip only when it was actually cut (R8.1). Truncated standalone text becomes
keyboard focusable; text inside a focusable control adds no nested tab stop. It lays out as a block that fills its
box, so the parent decides the width; flex parents need `min-width: 0` on the slot.

`import { TruncatedText } from "glass-ux/truncated-text"`

[Live examples](https://dastari.github.io/glass-ux/components/truncated-text)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| middle | `number \| boolean \| undefined` | See type | no | — | Truncate in the middle so both ends stay visible (hostnames, serials, paths): `true` cuts before the last segment, a number keeps that many trailing characters. |
| numeric | `boolean \| undefined` | false, true | no | — | Tabular figures for identifiers and numbers (implied by `middle`). |
| text | `string \| undefined` | See type | no | — | Full accessible tooltip text for rich nodes. Defaults to the rendered textContent. |
| tooltipSide | `"top" \| "bottom" \| undefined` | "top", "bottom" | no | "top" | Preferred side for the tooltip. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
