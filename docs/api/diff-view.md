# DiffView

A unified diff: removed lines on one tint and added lines on another, with the sign in the
gutter so a change reads without colour too. Both line numbers show in a wide box; below
25rem they drop and the sign stays. Long lines scroll sideways, and the region is keyboard
scrollable (R20.6). It is a table of rows; line numbers stay out of what is read aloud.

The tints are token roles, `--code-add-tint` and `--code-remove-tint`, with the matching text
colours `--code-add-text` and `--code-remove-text`, so a diff drawn elsewhere can match.

`import { DiffView } from "glass-ux/diff-view"`

[Live examples](https://dastari.github.io/glass-ux/components/diff-view)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| addedLabel | `string \| undefined` | See type | no | — | The sign's spoken name on an added line. Default "Added". |
| label | `string` | See type | yes | — | Names the change: what the diff is of. |
| lines | `readonly DiffLine[]` | See type | yes | — | The lines in order. |
| removedLabel | `string \| undefined` | See type | no | — | The sign's spoken name on a removed line. Default "Removed". |
| summary | `string \| undefined` | See type | no | — | The scrolling region's accessible name. Default: the label and the counts of added and removed lines. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
