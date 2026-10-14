# CodeBlock

A fenced code block: language label, copy (✓ in place), wrap toggle and optional line
numbers. Long blocks show their first lines with "Show all n lines". Highlighting loads
lazily; until then the same text renders in the same monospace lines, so nothing moves
when the colours arrive.

`import { CodeBlock } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/code-block)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| code | `string` | See type | yes | — | Source code displayed by the code block. |
| headingLevel | `2 \| 3 \| 4 \| 5 \| 6 \| undefined` | 2, 3, 4, 5, 6 | no | 3 | Heading level in the surrounding document. Defaults to 3. |
| label | `string \| undefined` | See type | no | — | Accessible name; distinguish blocks with the same visible title. |
| language | `string \| undefined` | See type | no | — | Fence language ("powershell", "ps1", "json"…). Unknown languages render plain. |
| lineNumbers | `boolean \| undefined` | false, true | no | false | Shows line numbers beside the code. |
| maxLines | `number \| undefined` | See type | no | COLLAPSED_LINES | Lines before the block collapses; 0 never collapses. |
| title | `string \| undefined` | See type | no | — | A title in place of the language label ("Clear-PrintQueue.ps1"). |
| wrap | `boolean \| undefined` | false, true | no | false | Start wrapped (logs, long one-liners). The reader can toggle it. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
