# EmojiPopover

An EmojiPicker in a popover. The picker's code and data load when it first opens; until then
the popover holds the picker's size, so nothing moves.

`import { EmojiPopover } from "glass-ux/emoji-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/emoji-popover)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `import("@base-ui/react/internals/useAnchorPositioning").Align \| undefined` | "center", "start", "end" | no | "start" | Alignment of the overlay relative to its anchor. |
| anchor | `Element \| import("@floating-ui/dom").VirtualElement \| import("react").RefObject<Element \| null> \| (() => Element \| import("@floating-ui/dom").VirtualElement \| null) \| null \| undefined` | See type | no | — | Anchor used to position floating content. |
| aria-label | `string \| undefined` | See type | no | — | Names the popup. Default "Emoji picker". |
| closeOnPick | `boolean \| undefined` | false, true | no | true | Close after a pick. Default true. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Whether it starts open when uncontrolled. |
| defaultSkinTone | `EmojiSkinTone \| undefined` | 0, 1, 2, 3, 4, 5 | no | — | The skin tone at first when uncontrolled. Default 0. |
| finalFocus | `boolean \| import("react").RefObject<HTMLElement \| null> \| ((closeType: import("@base-ui/utils/useEnhancedClickHandler").InteractionType) => void \| boolean \| HTMLElement \| null) \| undefined` | See type | no | — | Where focus returns on close. Default the trigger. |
| loadNames | `((locale: string) => Promise<Readonly<Record<string, string>>>) \| undefined` | See type | no | — | Names for the current locale, by emoji without a tone: the name shown and searched, with any keywords after it. Without this names are English, and a search matches English only. The application supplies them, so no language's data ships in the library. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state. |
| onPick | `(pick: EmojiPick) => void` | See type | yes | — | Called with the emoji a person picks by click, Enter or Space. |
| onSkinToneChange | `((tone: EmojiSkinTone) => void) \| undefined` | See type | no | — | Called with the tone a person chooses. |
| open | `boolean \| undefined` | false, true | no | — | Whether it is open, controlled. |
| recent | `readonly string[] \| undefined` | See type | no | — | Emoji to offer first, in a Recent tab. The host keeps this list; without it there is no tab. |
| side | `import("@base-ui/react/internals/useAnchorPositioning").Side \| undefined` | "top", "bottom", "left", "right", "inline-end", "inline-start" | no | — | Preferred side of the anchor; collision handling may choose another side. |
| skinTone | `EmojiSkinTone \| undefined` | 0, 1, 2, 3, 4, 5 | no | — | The skin tone, controlled: 0 for none, 1 (light) to 5 (dark). |
| skinTones | `boolean \| undefined` | false, true | no | — | Offer the skin tone menu. Sequences with two people have no tone. Default true. |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element that opens it, usually a Button. Omit it and pass `anchor` when controlling `open`. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
