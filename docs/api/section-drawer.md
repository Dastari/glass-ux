# SectionDrawer

Compose a section navigation drawer with header, search, groups, items, body and footer slots.

`import { SectionDrawer } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/section-drawer)

## SectionDrawer.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Accessible name: "Assistant navigation". |

## SectionDrawer.Header



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | See type | no | — | Supporting actions rendered in the action slot. |
| icon | `ReactNode` | See type | no | — | The section's mark or icon. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |

## SectionDrawer.Search



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| noun | `string` | See type | yes | — | What the list holds, plural: "organisations" names the field "Search organisations". |
| onValueChange | `(value: string) => void` | See type | yes | — | Called with the new query as the person types, and with "" when Esc clears the field. Pair with `value`. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| value | `string` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

## SectionDrawer.Match



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| query | `string` | See type | yes | — | The search: its first occurrence in `text` is highlighted, ignoring case. |
| text | `string` | See type | yes | — | Plain text rendered or copied by the component. |

## SectionDrawer.Body



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| fill | `boolean \| undefined` | false, true | no | false | The body does not scroll; its last child fills the remaining height and scrolls itself (a virtualised Tree), so the drawer never shows two scrollbars. |

## SectionDrawer.Footer



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## SectionDrawer.List



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## SectionDrawer.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `boolean \| undefined` | false, true | no | false | Marks the current destination or active choice. |
| count | `number \| undefined` | See type | no | — | Tabular count at the trailing edge. |
| detail | `ReactNode` | See type | no | — | Data subtitle under the label (a user, a path). |
| face | `ReactNode` | See type | no | — | The row's face, drawn instead of icon, label and detail: an entity identity at its row tier (OrganisationIdentity, DeviceIdentity), so the drawer shows the entity exactly as a table does. `label` stays its plain name. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| label | `ReactNode` | See type | yes | — | The visible or accessible label for this component. |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Render as a router link: render={<Link to="…" />}. Default: a button. |

## SectionDrawer.Group



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | See type | no | — | Supporting actions rendered in the action slot. |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| count | `number \| undefined` | See type | no | — | Item count shown by the component. |
| id | `string` | See type | yes | — | Persisted collapsed state key, e.g. "ai.projects". |
| title | `string` | See type | yes | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
