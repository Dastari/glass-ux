# OnScreenKeyboardProvider

Links an on-screen keyboard to the inputs inside its KeyboardTargets, without changing
those inputs' components: any input, textarea or contenteditable element, including
the library's fields. One keyboard serves them all, shown as a drawer or a popover.

With `show="focus"` focusing a linked input opens the keyboard for it; focusing another
linked input moves the keyboard to it without closing; focus on the keyboard keeps it
open; and focus leaving both closes it, one frame later so a move between inputs does
not flicker. Tapping the focused input again reopens it after the hide key. Closing never
moves focus. Disabled and read-only inputs are not served.

`replaceNative` keeps the device's own keyboard closed while an input is served (see
the prop). `useOnScreenKeyboard()` opens and closes it from code; KeyboardToggle is the
button for it.

`import { OnScreenKeyboardProvider } from "glass-ux/on-screen-keyboard"`

[Live examples](https://dastari.github.io/glass-ux/components/on-screen-keyboard-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| undefined` | "center", "start", "end" | no | — | Popover only: alignment with the input. Default "center". |
| arrow | `boolean \| undefined` | false, true | no | — | Popover only: draw an arrow. Default false. |
| captureTyping | `boolean \| undefined` | false, true | no | — | Physical keys typed while focus is on the keyboard edit the text or target. Default true. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| container | `import("./containers.js").ElementOrRef` | See type | no | — | Drawer only: dock to this element instead of the viewport. See KeyboardDrawer `container`. |
| disabled | `boolean \| undefined` | false, true | no | — | Every key is disabled. |
| enterKind | `EnterKind \| undefined` | "search", "enter", "done", "go", "next", "send" | no | — | The Enter key's label and colour. Default: the target's `enterkeyhint`, else "enter". |
| glass | `"full" \| "solid" \| "reduced" \| undefined` | "full", "solid", "reduced" | no | — | The drawer's or popup's own material level. Default: the page's. |
| layout | `KeyboardLayout \| BuiltInLayoutId \| undefined` | See type | no | — | The layout for inputs whose KeyboardTarget sets none and whose `inputmode` or `type` asks for none (number pads for numeric, decimal and tel; email; url). Default: the first of `layouts`, else the locale's layout. |
| layouts | `readonly (KeyboardLayout \| BuiltInLayoutId)[] \| undefined` | See type | no | — | The layouts the globe key cycles through. Omit, or give one, for no globe key. |
| locale | `string \| undefined` | See type | no | — | Overrides the locale for the default layout, `decimal` and `alphabet`. |
| onEnter | `((details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called when Enter is pressed. Unless prevented, an input target gets an Enter keydown and then its form is submitted (requestSubmit); a textarea or contenteditable target gets a new line. |
| onKeyPress | `((key: NormalizedKey, details: KeyPressDetails) => void) \| undefined` | See type | no | — | Called for every press, before the keyboard acts; `details.preventDefault()` skips the action. |
| onLayoutChange | `((layout: KeyboardLayout) => void) \| undefined` | See type | no | — | Called with the layout the globe key moved to. |
| onNavigateOut | `((direction: NavigationDirection) => void) \| undefined` | See type | no | — | Called when an arrow key is pressed at the keyboard's edge, with the screen direction: move focus to the results beside it. |
| onOpenChange | `((open: boolean, details: KeyboardOpenChangeDetails & { target: HTMLElement \| null; }) => void) \| undefined` | See type | no | — | Called with the next open state, why, and the input it serves. |
| presentation | `"popover" \| "drawer" \| undefined` | "popover", "drawer" | no | "drawer" | `drawer` (default): KeyboardDrawer at the bottom edge. `popover`: KeyboardPopover anchored to the input. |
| replaceNative | `ReplaceNativePolicy \| undefined` | "touch", "never", "always" | no | "touch" | Keep the device's own keyboard closed while the on-screen keyboard serves an input, by setting `inputmode="none"` on it and restoring its own value afterwards. `touch` (default): only where the primary pointer is coarse; `always`; `never`. |
| scrollRoot | `import("./containers.js").ElementOrRef` | See type | no | — | Drawer only: the element that receives `--keyboard-inset-height`. See KeyboardDrawer `scrollRoot`. |
| show | `"manual" \| "focus" \| undefined` | "manual", "focus" | no | "manual" | `focus`: the keyboard opens when a linked input gains focus and closes when focus leaves both the input and the keyboard (kiosks, TVs). `manual` (default): only `useOnScreenKeyboard().open()` and KeyboardToggle open it. |
| showAlternates | `boolean \| undefined` | false, true | no | — | Press and hold (500 ms, or a held Enter) offers accented alternates. Default true. |
| side | `"top" \| "bottom" \| undefined` | "top", "bottom" | no | — | Popover only: the preferred side of the input. Default "bottom". |
| size | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | — | Key size: sm for narrow panels, md (default) about a control's height, lg for TVs viewed from across a room. |
| variant | `"keys" \| "grid" \| undefined` | "keys", "grid" | no | — | keys: separate keycaps (the default for typing layouts); grid: flat tiles (the default for grid layouts: the alphabet, number pads). |
| wrap | `boolean \| undefined` | false, true | no | — | Arrow keys continue from the far side at an edge, instead of calling `onNavigateOut`. Default false. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
