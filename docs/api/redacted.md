# Redacted

The withheld treatment: the value is not in the browser; revealing it is a permission.

`import { Redacted } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/redacted)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onReveal | `(() => void) \| undefined` | See type | no | — | Called from Reveal; without it the button is disabled with the value's `reason`. |
| value | `RedactedValue` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
