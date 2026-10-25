# HoverCard

A hover card: `content` and a trigger child, or the parts `Root`, `Trigger` and `Popup` from Base UI's preview card.

`import { HoverCard } from "glass-ux/hover-card"`

[Live examples](https://dastari.github.io/glass-ux/components/hover-card)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `import("@base-ui/react/internals/useAnchorPositioning").Align \| undefined` | "center", "start", "end" | no | — | Alignment along that side. Default centre. |
| children | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>>` | See type | yes | — | The element that opens the card on hover and keyboard focus, normally a link. It must forward its ref and props. |
| closeDelay | `number \| undefined` | See type | no | HOVER_CARD_CLOSE_DELAY_MS | Milliseconds before closing once the pointer leaves. Default 150. |
| content | `ReactNode` | See type | yes | — | The card's content: a summary of what the trigger points to. Never the only way to reach an action. |
| delay | `number \| undefined` | See type | no | HOVER_CARD_DELAY_MS | Milliseconds before opening. Default 400. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called when the open state changes, including keyboard dismissal and outside interaction. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| side | `import("@base-ui/react/internals/useAnchorPositioning").Side \| undefined` | "top", "bottom", "left", "right", "inline-end", "inline-start" | no | — | Preferred side of the trigger; collision handling may choose another. Default bottom. |
| size | `HoverCardSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
