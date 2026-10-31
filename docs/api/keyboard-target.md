# KeyboardTarget

Links every input, textarea and contenteditable element inside it (including ones added
later) to the nearest OnScreenKeyboardProvider, through focus events that bubble up to
it. It renders a `display: contents` element, so it takes no part in layout; it must sit
where a `div` may. Outside a provider it does nothing.

`import { KeyboardTarget } from "glass-ux/on-screen-keyboard"`

[Live examples](https://dastari.github.io/glass-ux/components/keyboard-target)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| disabled | `boolean \| undefined` | false, true | no | false | Leave the inputs inside unlinked: focusing them does not open the keyboard and `open()` ignores them. |
| enterKind | `EnterKind \| undefined` | "search", "enter", "done", "go", "next", "send" | no | — | The Enter key's label for the inputs inside. Default: each input's `enterkeyhint`, else the provider's. |
| layout | `KeyboardLayout \| BuiltInLayoutId \| undefined` | See type | no | — | The layout for the inputs inside. Default: what the input's `inputmode` or `type` asks for, else the provider's. |
