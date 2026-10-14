# PopoutWindow

Everything in the workspace is a window: tiled, floating, snapped, maximised, minimised to the dock or popped out.

`import { PopoutWindow } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/popout-window)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| id | `string` | See type | yes | — | A stable element or component identifier. |
| productName | `string \| undefined` | See type | no | — | Appended to the browser window's title. |
| scopes | `WindowScopes \| undefined` | See type | no | — | How to label the window's organisation. A popped-out window stands on its own, so it shows its scope chip whenever it has a scope (pass `current: null`). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
