# Reasoning

The model's reasoning summary (provider_activity · reasoning_summary), collapsed to one
line: "Thought for 4 s". While it runs the line reads "Thinking" with a live count, and
the summary can be opened to follow along. Never the hidden chain of thought — only the
summary the provider chose to show.

`import { Reasoning } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/reasoning)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Opens the uncontrolled overlay initially. |
| reasoning | `AiReasoning` | See type | yes | — | Assistant reasoning content and its visibility state. |
