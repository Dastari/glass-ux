# TooltipPopup

Portal + positioner + the inverted glass bubble.

`import { TooltipPopup } from "glass-ux/tooltip"`

[Live examples](https://dastari.github.io/glass-ux/components/tooltip-popup)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `NonNullable<"center" \| "start" \| "end" \| undefined>` | "center", "start", "end" | yes | — | Alignment of the overlay relative to its anchor. |
| anchor | `Element \| import("react").RefObject<Element \| null> \| import("@floating-ui/dom").VirtualElement \| (() => Element \| import("@floating-ui/dom").VirtualElement \| null) \| null \| undefined` | See type | no | — | Anchor used to position floating content. |
| arrow | `boolean` | false, true | yes | — | Whether floating content displays a positioning arrow. |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| side | `NonNullable<"top" \| "bottom" \| "left" \| "right" \| undefined>` | "top", "bottom", "left", "right" | yes | — | Preferred side of the anchor; collision handling may choose another side. |
