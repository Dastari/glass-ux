# KeyboardDrawer

An on-screen keyboard docked to the bottom of the viewport (or a `container`), for
kiosks and touch screens. Non-modal: no scrim, no focus trap, and pointer presses on it
never take focus from the input it types into, so the page stays usable around it.

It slides up and down on the motion tokens (at once under Still or reduced motion),
keeps its last row above the home indicator (safe area), spans a phone's width and is
centred with a maximum width on larger screens. Its material follows the appearance
settings (Glass, Frosted, Solid, Flat); `glass` sets this drawer's own level.

While open it sets `--keyboard-inset-height` (its height in px) on `scrollRoot` —
`document.documentElement` by default — so a layout can pad its scroll container's
content with `var(--keyboard-inset-height, 0px)`, and scrolls `target` into view above
itself (only as far as needed). Without that padding a field at the very end of a
scroller cannot rise above the drawer.
Escape (in the target or on the keyboard) and the hide key close it.

To open it when a field gains focus, use OnScreenKeyboardProvider and KeyboardTarget.

`import { KeyboardDrawer } from "glass-ux/on-screen-keyboard"`

[Live examples](https://dastari.github.io/glass-ux/components/keyboard-drawer)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| captureTyping | `boolean \| undefined` | false, true | no | — | Physical keys typed while focus is on the keyboard edit the text or target. Default true. |
| container | `ElementOrRef` | See type | no | — | Dock to the bottom of this element instead of the viewport, and render into it. It must be a containing block (`position: relative`) that does not scroll itself, such as a window's or a kiosk frame's outer element. Default: the viewport (rendered into the full-screen element when there is one, else the body). |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Whether the drawer starts shown when uncontrolled. Default false. |
| defaultValue | `string \| undefined` | See type | no | — | The initial text when uncontrolled and without a target. Default "". |
| disabled | `boolean \| undefined` | false, true | no | — | Every key is disabled. |
| enterKind | `EnterKind \| undefined` | "search", "enter", "done", "go", "next", "send" | no | — | The Enter key's label and colour. Default: the target's `enterkeyhint`, else "enter". |
| glass | `"full" \| "solid" \| "reduced" \| undefined` | "full", "solid", "reduced" | no | — | The drawer's own material level: `full` (Glass), `reduced` (Frosted) or `solid`. Default: the page's. |
| layout | `KeyboardLayout \| BuiltInLayoutId \| undefined` | See type | no | — | The layout shown: a layout or a built-in identifier. Default: the first of `layouts`, else the locale's layout (`layoutForLocale`). A new value replaces the shown layout. |
| layouts | `readonly (KeyboardLayout \| BuiltInLayoutId)[] \| undefined` | See type | no | — | The layouts the globe key cycles through. Omit, or give one, for no globe key. |
| locale | `string \| undefined` | See type | no | — | Overrides the locale for the default layout, `decimal` and `alphabet`. |
| onEnter | `((details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called when Enter is pressed. Unless prevented, an input target gets an Enter keydown and then its form is submitted (requestSubmit); a textarea or contenteditable target gets a new line. |
| onKeyPress | `((key: NormalizedKey, details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called for every press, before the keyboard acts; `details.preventDefault()` skips the action. |
| onLayoutChange | `((layout: KeyboardLayout) => void) \| undefined` | See type | no | — | Called with the layout the globe key moved to. |
| onNavigateOut | `((direction: NavigationDirection) => void) \| undefined` | See type | no | — | Called when an arrow key is pressed at the keyboard's edge, with the screen direction: move focus to the results beside it. |
| onOpenChange | `((open: boolean, details: KeyboardOpenChangeDetails) => void) \| undefined` | See type | no | — | Called with the next open state and why: Escape (in the target or on the keyboard) or the hide key. |
| onValueChange | `((value: string, details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called with the new text after each edit when the keyboard owns the text (no `target`). |
| open | `boolean \| undefined` | false, true | no | — | Whether the drawer is shown. Pair with `onOpenChange` to control it. |
| panelClassName | `string \| undefined` | See type | no | — | A class for the drawer panel (the keyboard takes `className`). |
| panelRef | `Ref<HTMLDivElement> \| undefined` | See type | no | — | The drawer panel element, while it is mounted. |
| scrollRoot | `ElementOrRef` | See type | no | — | The element that receives `--keyboard-inset-height` (the drawer's height, in px) while the drawer is open; it inherits to everything inside. Default: `container`, else `document.documentElement`. In a Glass UX layout the document never scrolls, so pad the scroll container's content with it, and the last fields can scroll above the drawer: `padding-block-end: var(--keyboard-inset-height, 0px)`. |
| showAlternates | `boolean \| undefined` | false, true | no | — | Press and hold (500 ms, or a held Enter) offers accented alternates. Default true. |
| size | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | "md" | Key size: sm for narrow panels, md (default) about a control's height, lg for TVs viewed from across a room. |
| target | `OnScreenKeyboardTarget \| undefined` | See type | no | — | An input, textarea or contenteditable element to type into, or a ref to one. The keyboard edits it at its caret and fires `input` events, so React-controlled inputs update. Pointer presses never take focus from it. |
| value | `string \| undefined` | See type | no | — | The text, when the keyboard owns it (no `target`). Pair with `onValueChange`. |
| variant | `"keys" \| "grid" \| undefined` | "keys", "grid" | no | — | keys: separate keycaps (the default for typing layouts); grid: flat tiles (the default for grid layouts: the alphabet, number pads). |
| wrap | `boolean \| undefined` | false, true | no | — | Arrow keys continue from the far side at an edge, instead of calling `onNavigateOut`. Default false. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
