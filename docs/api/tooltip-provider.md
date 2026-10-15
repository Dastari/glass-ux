# TooltipProvider

Groups tooltips: the first opens after 500ms, its neighbours open instantly while the
pointer moves along a toolbar. Mount once at the app root.

`import { TooltipProvider } from "glass-ux/tooltip"`

[Live examples](https://dastari.github.io/glass-ux/components/tooltip-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
