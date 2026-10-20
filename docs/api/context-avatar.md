# ContextAvatar

A context's avatar: its logo, its icon or its initials on its tint. A rounded square, so
an organisation or project never reads as a person (people are round, ui/avatar). The
"all" scope is a glyph on a neutral tile.

`import { ContextAvatar } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/context-avatar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allLabel | `string \| undefined` | See type | no | DEFAULT_SWITCHER_LABELS.all | The accessible name for the "all" scope when not decorative (default "All organisations"). |
| decorative | `boolean \| undefined` | false, true | no | true | Hidden from assistive tech (default): a visible name sits beside it. |
| icon | `ReactNode` | See type | no | — | The glyph for the "all" scope (default the organisation glyph). |
| item | `Pick<ContextItem, "id" \| "icon" \| "name" \| "avatarSrc" \| "initials" \| "tint"> \| null` | See type | yes | — | The context, or null for the "all" scope. |
| size | `ContextAvatarSize \| undefined` | "xs", "sm", "md", "lg" | no | "sm" | xs 20 (lists, chips) · sm 24 (top bar, dock) · md 32 · lg 40 (page headers). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
