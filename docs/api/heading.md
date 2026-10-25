# Heading

A heading whose level (the outline) and look (the type role) are set separately.

`import { Heading } from "glass-ux/text"`

[Live examples](https://dastari.github.io/glass-ux/components/heading)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| undefined` | "center", "start", "end" | no | — | Text alignment, in the reading direction. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| level | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | 1, 2, 3, 4, 5, 6 | yes | — | The heading level: the element (h1–h6) and the document outline. |
| mono | `boolean \| undefined` | false, true | no | — | The code face. |
| numeric | `boolean \| undefined` | false, true | no | — | Tabular, aligned figures for numbers that change or line up. |
| title | `string \| undefined` | See type | no | — | The heading or title content. |
| tone | `TextTone \| undefined` | "danger", "warning", "default", "success", "accent", "info", "subtle", "muted" | no | — | The semantic tone. Use danger and warning for consequences and states. |
| truncate | `number \| boolean \| undefined` | See type | no | — | Cut to one line with an ellipsis (`true`), or to a number of lines. Pair with a tooltip or the full text nearby. |
| variant | `TextVariant \| undefined` | "body", "caption", "label", "title", "display", "headline", "subtitle", "overline" | no | — | The look, independent of the level. Default by level: 1 display, 2 headline, 3 title, 4 subtitle, 5–6 label. |
| weight | `"medium" \| "regular" \| "semibold" \| undefined` | "medium", "regular", "semibold" | no | — | `medium` or `semibold` over the role's own weight. |
