# ProviderActivity

What the model is doing between tool calls: working, waiting on an endpoint, retrying
the provider, or searching the web. One line with a spinner and the elapsed time; it is
replaced in place by the answer.

`import { ProviderActivity } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/provider-activity)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| status | `AiProviderStatus` | See type | yes | — | Current operation or connection status. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
