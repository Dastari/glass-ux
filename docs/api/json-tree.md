# JsonTree

A read-only JSON viewer for tool arguments and results: collapsible objects and arrays,
typed values in the code colours, long arrays paged ("Show 200 more of 1,284") and long
strings cut with the full value on hover.

`import { JsonTree } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/json-tree)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| label | `string` | See type | yes | — | Accessible name: "Arguments", "Result". |
| truncated | `string \| undefined` | See type | no | — | The payload was cut by the server or the client; say so under the tree. |
| value | `unknown` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |
