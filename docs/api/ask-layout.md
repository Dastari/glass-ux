# AskLayout

The body of an ask: an AiCard (icon tile in the ask's tone, the question as the title,
controls, footer with the primary on the right). Asks are never modal (R13.8): in a
conversation the card sits in the ask dock above the composer; on its own it sits where
it is rendered.

`import { AskLayout } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ask-layout)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| confirming | `boolean \| undefined` | false, true | no | false | The second step of a destructive or MFA approval is showing (Esc goes back). |
| footer | `ReactNode` | See type | no | — | Content after the body, normally supporting actions. |
| footerStart | `ReactNode` | See type | no | — | Footer start: secondary actions (Skip, Deny). |
| icon | `ReactNode` | See type | yes | — | An icon element without an explicit size; the component sizes it through its tokens. |
| id | `string` | See type | yes | — | Labelled-group id root (aria-labelledby). |
| meta | `ReactNode` | See type | no | — | Data line under the question: the target, the expiry. |
| onKeyDown | `((event: KeyboardEvent<HTMLElement>) => void) \| undefined` | See type | no | — | Called when key down occurs. The callback type specifies its arguments. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |
| tone | `AiCardTone` | "danger", "warning", "default", "success", "accent", "info" | yes | — | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
