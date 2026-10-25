# Link

A text link: in a sentence, on its own line, or a quiet name in a table. Links go
somewhere; actions that change something are Buttons (ButtonLink when a button must
navigate).

`import { Link } from "glass-ux/link"`

[Live examples](https://dastari.github.io/glass-ux/components/link)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| disabled | `boolean \| undefined` | false, true | no | false | A link that cannot be followed now: no href, `aria-disabled`, muted. |
| external | `boolean \| undefined` | false, true | no | newTab | Show the external mark without opening a new tab. Default: on with `newTab`. |
| icon | `ReactNode` | See type | no | — | A leading icon, sized to the text. |
| labels | `Partial<{ newTab: string; }> \| undefined` | See type | no | — | Wording overrides (the new-tab note). |
| newTab | `boolean \| undefined` | false, true | no | false | Open in a new tab: adds `target="_blank"`, `rel="noopener noreferrer"`, an external mark and "(opens in a new tab)" for screen readers. |
| render | `ReactElement<Record<string, unknown>, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | A router's link element (`<RouterLink to="…" />`); its routing props, ref and handlers are kept. |
| variant | `LinkVariant \| undefined` | "inline", "standalone", "subtle" | no | "inline" | The named visual variant. It is rendered as a data attribute and styled through shared tokens. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLAnchorElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
