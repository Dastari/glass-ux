# Spinner

A work indicator with a reserved icon box and a visually hidden status label. Motion follows the appearance preference.

`import { Spinner } from "glass-ux/spinner"`

[Live examples](https://dastari.github.io/glass-ux/components/spinner)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | — | Spoken status, defaulting to the translated Loading message. Empty hides the indicator from assistive technology. |
| size | `IconSize \| undefined` | "xs", "sm", "md", "lg", "xl", "2xl" | no | "md" | Icon token size; defaults to md. |
| tone | `"accent" \| "current" \| "muted" \| undefined` | "accent", "current", "muted" | no | "current" | Semantic foreground colour. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
