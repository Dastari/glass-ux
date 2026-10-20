# WindowScopeProvider

Supplies the current scope and how to draw a scope to the window layer's scope chips and dock groups. A null or undefined `value` turns scope labelling off.

`import { WindowScopeProvider } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-scope-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| value | `WindowScopes \| null \| undefined` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |
