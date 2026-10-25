# ActivityFeed

An activity or notification feed using shared relative times and accessible absolute tooltips.

`import { ActivityFeed } from "glass-ux/activity-feed"`

[Live examples](https://dastari.github.io/glass-ux/components/activity-feed)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| empty | `string \| undefined` | See type | no | — | One factual line when there are no events. |
| items | `readonly ActivityItem[]` | See type | yes | — | Events in the application's chosen order. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLOListElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
