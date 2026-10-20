# ScrollArea

A scrolling region with thin glass scrollbars that appear while you hover or scroll, and
`data-scrolled-top|bottom|left|right` on the root for edge treatments. Fills its box; give
the parent a height.

`import { ScrollArea } from "glass-ux/scroll-area"`

[Live examples](https://dastari.github.io/glass-ux/components/scroll-area)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the scrolling region when it holds more than a list (makes it a landmark-free focusable region for keyboard scrolling). |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| edges | `"none" \| "hairline" \| "fade" \| undefined` | "none", "hairline", "fade" | no | "hairline" | What marks an edge with content beyond it (R5.8):   hairline  a 1px line at the scrolled edge (lists under a header, above a footer)   fade      a soft mask (strips of chips, previews)   none |
| orientation | `"horizontal" \| "vertical" \| "both" \| undefined` | "horizontal", "vertical", "both" | no | "vertical" | Which axes scroll. |
