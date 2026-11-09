# Panel

The standard content pane: glass-panel, surface radius, header/body/footer slots.
Every Panel is an inline-size container named `panel`, so anything inside it lays out
against the panel's width — never the viewport's.

`import { Panel } from "glass-ux/surface"`

[Live examples](https://dastari.github.io/glass-ux/components/panel)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| compact | `boolean \| undefined` | false, true | no | false | Tighten the inset of the header, body and footer to `--inset-panel-compact`, for dense tool panes. It follows density and UI scale like `--inset-panel`: 12px at the default scale under comfortable density and 8px under compact density, against 20px and 16px for a regular panel. A Panel nested inside keeps its own inset. Default false. |
| glass | `"full" \| "solid" \| "reduced" \| undefined` | "full", "solid", "reduced" | no | — | This panel's own material level; see Surface `glass`. Default: the page's. |
| material | `"card" \| "panel" \| undefined` | "card", "panel" | no | "panel" | `panel` (default) blurs what is behind it. `card` keeps the panel's rim and fill without the blur, for a pane that scrolls or holds content that scrolls: a blurred layer is blurred again on every frame its content moves (docs/performance.md). Keep blur for framing chrome. |
| scroll | `boolean \| undefined` | false, true | no | false | Let the body scroll inside a bounded panel instead of growing the page. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
