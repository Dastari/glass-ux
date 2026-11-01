# ActivityFeed

An activity or notification feed using shared relative times and accessible absolute tooltips.

As a timeline, such as a version history, items take a `tone` for the marker and `children`
for one level of branches. Selection makes it a listbox with one tab stop (R11.5):
↑ ↓ Home End move, and a click, Enter or Space selects. Selection does not follow focus,
so moving through a long history loads nothing. A plain feed stays an ordinary list.

`import { ActivityFeed } from "glass-ux/activity-feed"`

[Live examples](https://dastari.github.io/glass-ux/components/activity-feed)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultSelectedId | `string \| null \| undefined` | See type | no | — | The event selected at first when uncontrolled. |
| empty | `string \| undefined` | See type | no | — | One factual line when there are no events. |
| items | `readonly ActivityItem[]` | See type | yes | — | Events in the application's chosen order. |
| onSelectedIdChange | `SelectedIdChangeHandler<ActivityItem> \| undefined` | See type | no | — | Called with the id of the event the person selects by click, Enter or Space, and details. |
| selectedId | `string \| null \| undefined` | See type | no | — | The selected event's id, controlled; null selects none. Supplying this, `defaultSelectedId` or `onSelectedIdChange` makes the feed selectable. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLOListElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
