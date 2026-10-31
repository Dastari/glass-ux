# OnScreenKeyboard

An on-screen keyboard for kiosks, TVs driven by a remote's arrow keys, touch screens where
the native keyboard is unsuitable, and search panels (the alphabet grid).

Standalone it owns a text value (controlled or uncontrolled); with `target` it types into
an input, textarea or contenteditable element at its caret, firing `input` events so
React-controlled inputs update, without taking focus from it. Layouts are data
({@link KeyboardLayout}): built-in layouts cover the major scripts, including Hangul
syllable composition and kana marks; the globe key cycles `layouts`.

Keyboard: one tab stop; arrow keys move by the keys' positions on screen (so wide keys and
right-to-left layouts behave as they look); Home and End go to the row's ends; Enter or
Space presses the focused key; holding Enter, or holding a key with the pointer, offers
accented alternates; physical typing edits the text while focus is on the keyboard;
Escape calls `onEscape`. Layer, layout and Caps Lock changes are announced politely.

`import { OnScreenKeyboard } from "glass-ux/on-screen-keyboard"`

[Live examples](https://dastari.github.io/glass-ux/components/on-screen-keyboard)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| autoFocus | `boolean \| undefined` | false, true | no | false | Focus the first key on mount (TV interfaces). |
| captureTyping | `boolean \| undefined` | false, true | no | true | Physical keys typed while focus is on the keyboard edit the text or target. Default true. |
| defaultValue | `string \| undefined` | See type | no | — | The initial text when uncontrolled and without a target. Default "". |
| disabled | `boolean \| undefined` | false, true | no | false | Every key is disabled. |
| enterKind | `EnterKind \| undefined` | "search", "enter", "done", "go", "next", "send" | no | — | The Enter key's label and colour. Default: the target's `enterkeyhint`, else "enter". |
| layout | `KeyboardLayout \| BuiltInLayoutId \| undefined` | See type | no | — | The layout shown: a layout or a built-in identifier. Default: the first of `layouts`, else the locale's layout (`layoutForLocale`). A new value replaces the shown layout. |
| layouts | `readonly (KeyboardLayout \| BuiltInLayoutId)[] \| undefined` | See type | no | — | The layouts the globe key cycles through. Omit, or give one, for no globe key. |
| locale | `string \| undefined` | See type | no | — | Overrides the locale for the default layout, `decimal` and `alphabet`. |
| onEnter | `((details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called when Enter is pressed. Unless prevented, an input target gets an Enter keydown and then its form is submitted (requestSubmit); a textarea or contenteditable target gets a new line. |
| onEscape | `(() => void) \| undefined` | See type | no | — | Called when Escape is pressed on the keyboard. |
| onHide | `(() => void) \| undefined` | See type | no | — | Shows a hide key and is called when it is pressed. Typing layouts put it on the bottom row; a grid layout (a number pad) puts it in a blank cell, and shows none without one. |
| onKeyPress | `((key: NormalizedKey, details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called for every press, before the keyboard acts; `details.preventDefault()` skips the action. |
| onLayoutChange | `((layout: KeyboardLayout) => void) \| undefined` | See type | no | — | Called with the layout the globe key moved to. |
| onNavigateOut | `((direction: NavigationDirection) => void) \| undefined` | See type | no | — | Called when an arrow key is pressed at the keyboard's edge, with the screen direction: move focus to the results beside it. |
| onValueChange | `((value: string, details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called with the new text after each edit when the keyboard owns the text (no `target`). |
| showAlternates | `boolean \| undefined` | false, true | no | true | Press and hold (500 ms, or a held Enter) offers accented alternates. Default true. |
| size | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | "md" | Key size: sm for narrow panels, md (default) about a control's height, lg for TVs viewed from across a room. |
| target | `OnScreenKeyboardTarget \| undefined` | See type | no | — | An input, textarea or contenteditable element to type into, or a ref to one. The keyboard edits it at its caret and fires `input` events, so React-controlled inputs update. Pointer presses never take focus from it. |
| value | `string \| undefined` | See type | no | — | The text, when the keyboard owns it (no `target`). Pair with `onValueChange`. |
| variant | `"keys" \| "grid" \| undefined` | "keys", "grid" | no | — | keys: separate keycaps (the default for typing layouts); grid: flat tiles (the default for grid layouts: the alphabet, number pads). |
| wrap | `boolean \| undefined` | false, true | no | false | Arrow keys continue from the far side at an edge, instead of calling `onNavigateOut`. Default false. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
