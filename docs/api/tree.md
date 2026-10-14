# Tree

The navigation tree (the sidebar's endpoints by organisation). Groups collapse; endpoint
rows are two-line fa-item rows with a status dot on the device icon. Keyboard: ↑ ↓ move,
→ opens or enters a group, ← closes or returns to the parent, Home / End, Enter selects
(toggles a group), and typing jumps to the next matching name. One row is tabbable (roving
tabindex). Rows are virtualised, so thousands of endpoints cost only the rows on screen.

`import { Tree } from "glass-ux/tree"`

[Live examples](https://dastari.github.io/glass-ux/components/tree)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the tree: "Endpoints". |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultExpanded | `string[] \| undefined` | See type | no | — | Initially expanded nodes when expansion is uncontrolled. |
| emptyText | `((query: string) => ReactNode) \| undefined` | See type | no | (q) => `No match for “${q}”` | The line shown when nothing matches. Default: No match for “query”. |
| expanded | `string[] \| undefined` | See type | no | — | Open groups. Uncontrolled with `defaultExpanded`. |
| nodes | `TreeNode[]` | See type | yes | — | Graph or tree nodes with stable identifiers and relationships. |
| onExpandedChange | `((expanded: string[]) => void) \| undefined` | See type | no | — | Called when expanded change occurs. The callback type specifies its arguments. |
| onSelect | `((node: TreeNode) => void) \| undefined` | See type | no | — | Called when select occurs. The callback type specifies its arguments. |
| query | `string \| undefined` | See type | no | "" | Filter text from the search field above the tree. Matching branches open and the match is highlighted. |
| renderContent | `((node: TreeNode, content: TreeRowContent) => ReactNode \| null) \| undefined` | See type | no | — | Draw a row's content (after the chevron) yourself, e.g. an entity identity's row tier, so a tree row is the same object as the entity's table cell and header. The row keeps its own states (fa-item: hover, focus, selected) and height. Return null for the default icon, label and description. |
| renderLink | `((node: TreeNode, props: TreeRowRenderProps) => ReactElement \| null) \| undefined` | See type | no | — | Render endpoint rows as links (a TanStack Router `<Link>` in the app). Return null to keep a row a plain item. A linked row navigates natively (click, middle-click, Enter); `onSelect` still fires. |
| rowWrapper | `((node: TreeNode, row: ReactElement) => ReactElement) \| undefined` | See type | no | — | Wrap each row element, e.g. in ActionContextMenu so right-click, long-press, Shift+F10 and the Menu key open the row's actions (R11.6). Must render the row it is given. |
| selectedId | `string \| null \| undefined` | See type | no | null | Stable identifier of the selected item. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
