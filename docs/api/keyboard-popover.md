# KeyboardPopover

A floating ("hover") on-screen keyboard anchored to its target, such as a search field.
Non-modal: focus stays in the target, and pressing keys never takes it. Prefers the side
below the target, flips above when there is no room and shifts to stay on screen.

Escape, the hide key and a pointer pressed outside both the target and the keyboard
close it. It is a non-modal dialog named by the keyboard messages, built on Base UI's
popover and positioned like Popover (`--popup-offset`, the collision padding).

`import { KeyboardPopover } from "glass-ux/on-screen-keyboard"`

[Live examples](https://dastari.github.io/glass-ux/components/keyboard-popover)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| undefined` | "center", "start", "end" | no | "center" | Its alignment with the target; it shifts to stay on screen. Default "center". |
| arrow | `boolean \| undefined` | false, true | no | false | Draw an arrow pointing at the target. Default false: like Popover, it grows out of the target instead. |
| captureTyping | `boolean \| undefined` | false, true | no | — | Physical keys typed while focus is on the keyboard edit the text or target. Default true. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Whether it starts shown when uncontrolled. Default false. |
| defaultValue | `string \| undefined` | See type | no | — | The initial text when uncontrolled and without a target. Default "". |
| disabled | `boolean \| undefined` | false, true | no | — | Every key is disabled. |
| enterKind | `EnterKind \| undefined` | "search", "enter", "done", "go", "next", "send" | no | — | The Enter key's label and colour. Default: the target's `enterkeyhint`, else "enter". |
| glass | `"full" \| "solid" \| "reduced" \| undefined` | "full", "solid", "reduced" | no | — | This popup's own material level: `full` (Glass), `reduced` (Frosted) or `solid`. Default: the page's. |
| layout | `KeyboardLayout \| BuiltInLayoutId \| undefined` | See type | no | — | The layout shown: a layout or a built-in identifier. Default: the first of `layouts`, else the locale's layout (`layoutForLocale`). A new value replaces the shown layout. |
| layouts | `readonly (KeyboardLayout \| BuiltInLayoutId)[] \| undefined` | See type | no | — | The layouts the globe key cycles through. Omit, or give one, for no globe key. |
| locale | `string \| undefined` | See type | no | — | Overrides the locale for the default layout, `decimal` and `alphabet`. |
| onEnter | `((details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called when Enter is pressed. Unless prevented, an input target gets an Enter keydown and then its form is submitted (requestSubmit); a textarea or contenteditable target gets a new line. |
| onKeyPress | `((key: NormalizedKey, details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called for every press, before the keyboard acts; `details.preventDefault()` skips the action. |
| onLayoutChange | `((layout: KeyboardLayout) => void) \| undefined` | See type | no | — | Called with the layout the globe key moved to. |
| onNavigateOut | `((direction: NavigationDirection) => void) \| undefined` | See type | no | — | Called when an arrow key is pressed at the keyboard's edge, with the screen direction: move focus to the results beside it. |
| onOpenChange | `((open: boolean, details: KeyboardOpenChangeDetails) => void) \| undefined` | See type | no | — | Called with the next open state and why: Escape, the hide key, or a pointer pressed outside both the target and the keyboard. |
| onValueChange | `((value: string, details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called with the new text after each edit when the keyboard owns the text (no `target`). |
| open | `boolean \| undefined` | false, true | no | — | Whether the keyboard is shown. Pair with `onOpenChange` to control it. |
| panelClassName | `string \| undefined` | See type | no | — | A class for the popup (the keyboard takes `className`). |
| panelRef | `Ref<HTMLDivElement> \| undefined` | See type | no | — | The popup element, while it is mounted. |
| showAlternates | `boolean \| undefined` | false, true | no | — | Press and hold (500 ms, or a held Enter) offers accented alternates. Default true. |
| side | `"top" \| "bottom" \| undefined` | "top", "bottom" | no | "bottom" | The side of the target it prefers; it flips when there is no room. Default "bottom". |
| size | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | "md" | Key size: sm for narrow panels, md (default) about a control's height, lg for TVs viewed from across a room. |
| target | `OnScreenKeyboardTarget` | See type | yes | — | The input, textarea or contenteditable element the keyboard types into and is anchored to, or a ref to it. |
| value | `string \| undefined` | See type | no | — | The text, when the keyboard owns it (no `target`). Pair with `onValueChange`. |
| variant | `"keys" \| "grid" \| undefined` | "keys", "grid" | no | — | keys: separate keycaps (the default for typing layouts); grid: flat tiles (the default for grid layouts: the alphabet, number pads). |
| wrap | `boolean \| undefined` | false, true | no | — | Arrow keys continue from the far side at an edge, instead of calling `onNavigateOut`. Default false. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
