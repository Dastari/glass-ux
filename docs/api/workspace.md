# Workspace

Everything in the workspace is a window: tiled, floating, snapped, maximised, minimised to the dock or popped out.

`import { Workspace } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/workspace)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| dock | `boolean \| undefined` | false, true | no | true | Show the dock of open windows (default true). |
| primary | `ReactNode` | false, true | yes | — | The routed view. Render EntityHeader, WindowFrame.Body and WindowFrame.StatusBar. |
| primaryLabel | `string` | See type | yes | — | Accessible name for the primary window, normally the entity or page title. |
| scopes | `WindowScopes \| undefined` | See type | no | — | The tenant scope the user is in and how to draw one (R14.4). Windows from another scope show its chip in their app bar, and the dock groups windows by scope. Omit for a product without scopes. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
