# DetailTile

One fact about an entity: icon, caption label, value and an optional second line. Values
wrap to two lines then end with an ellipsis; the full value is in the title. In tiles
narrower than 13rem the icon box steps aside so the value keeps its room.

`import { DetailTile } from "glass-ux/detail-tile"`

[Live examples](https://dastari.github.io/glass-ux/components/detail-tile)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| detail | `ReactNode` | See type | no | — | A second value line in muted text: the OS build under the OS name. |
| icon | `ReactNode` | See type | no | — | Leading icon in the soft tile box. Pass it without a size. Dropped in narrow tiles. |
| label | `string` | See type | yes | — | What the value is: "Manufacturer", "Serial number". |
| numeric | `boolean \| undefined` | false, true | no | false | Tabular figures for serials, IPs, versions and sizes. |
| truncate | `boolean \| undefined` | false, true | no | false | Keep the value on one line with an ellipsis (identifiers). Default: wrap up to two lines. |
| value | `ReactNode` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
