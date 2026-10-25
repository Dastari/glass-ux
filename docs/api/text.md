# Text

Text in one of the type roles, with a colour role. It sets type, not layout: margins
belong to the container (Stack's gap).

`import { Text } from "glass-ux/text"`

[Live examples](https://dastari.github.io/glass-ux/components/text)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| undefined` | "center", "start", "end" | no | — | Text alignment, in the reading direction. |
| as | `ElementType \| undefined` | See type | no | "p" | The element: `p` (default), `span`, `div`, `label`, `time`… |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| mono | `boolean \| undefined` | false, true | no | — | The code face. |
| numeric | `boolean \| undefined` | false, true | no | — | Tabular, aligned figures for numbers that change or line up. |
| title | `string \| undefined` | See type | no | — | The heading or title content. |
| tone | `TextTone \| undefined` | "danger", "warning", "default", "success", "accent", "info", "subtle", "muted" | no | — | The semantic tone. Use danger and warning for consequences and states. |
| truncate | `number \| boolean \| undefined` | See type | no | — | Cut to one line with an ellipsis (`true`), or to a number of lines. Pair with a tooltip or the full text nearby. |
| variant | `TextVariant \| undefined` | "body", "caption", "label", "title", "display", "headline", "subtitle", "overline" | no | "body" | The type role. Default `body`. |
| weight | `"medium" \| "regular" \| "semibold" \| undefined` | "medium", "regular", "semibold" | no | — | `medium` or `semibold` over the role's own weight. |
