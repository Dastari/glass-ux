# PopoutWindow

Renders window `id` filling its own browser window, for the pop-out route. It registers
as the window's pop-out host while mounted, sets the document title from the window's
title, subtitle, scope and `productName`, and closes the browser window once the window
is closed from the workspace. Render it inside a `WindowManagerProvider`.

`import { PopoutWindow } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/popout-window)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| id | `string` | See type | yes | — | A stable element or component identifier. |
| productName | `string \| undefined` | See type | no | — | Appended to the browser window's title. |
| scopes | `WindowScopes \| undefined` | See type | no | — | How to label the window's organisation. A popped-out window stands on its own, so it shows its scope chip whenever it has a scope (pass `current: null`). |
