# Tree

The navigation tree (a sidebar's records grouped by owner). Groups collapse; leaf rows
are fa-item rows, two lines with a description, with an optional status dot on the icon. Keyboard: ↑ ↓ move,
→ opens or enters a group, ← closes or returns to the parent, Home / End, Enter selects
(toggles a group), and typing jumps to the next matching name. One row is tabbable (roving
tabindex). Rows are virtualised, so thousands of rows cost only the rows on screen.

With `selectableGroups` a branch is selected like a leaf and opens from its chevron. Large
trees load lazily: `hasChildren` marks a branch whose children `onLoadChildren` fetches on
first open, and `hasMore` with `onLoadMore` pages them in.

`import { Tree } from "glass-ux/tree"`

[Live examples](https://dastari.github.io/glass-ux/components/tree)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the tree: "Endpoints". |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultExpanded | `string[] \| undefined` | See type | no | — | Initially expanded nodes when expansion is uncontrolled. |
| defaultSelectedId | `string \| null \| undefined` | See type | no | — | The row selected at first when the selection is uncontrolled. |
| emptyText | `((query: string) => ReactNode) \| undefined` | See type | no | (q) => `No match for “${q}”` | The line shown when nothing matches. Default: No match for “query”. |
| expanded | `string[] \| undefined` | See type | no | — | Open groups. Uncontrolled with `defaultExpanded`. |
| nodes | `TreeNode[]` | See type | yes | — | Graph or tree nodes with stable identifiers and relationships. |
| onExpandedChange | `((expanded: string[]) => void) \| undefined` | See type | no | — | Called with the full list of open group ids whenever a group opens or closes (click, Enter, Space or the arrow keys); groups do not toggle while searching. Pair with `expanded` to control it. |
| onLoadChildren | `((node: TreeNode) => Promise<void> \| void) \| undefined` | See type | no | — | Load a branch's children the first time it opens (a node with `hasChildren` and no `children`): update `nodes` with them, then resolve. A loading row shows meanwhile; a rejection shows an error row whose Retry calls this again. Without it, the loading row shows until `nodes` gives the branch its children. |
| onLoadMore | `((node: TreeNode) => Promise<void> \| void) \| undefined` | See type | no | — | Load the next page of a branch's children (a node with `hasMore`): append them to `nodes`, then resolve. A rejection offers Retry. |
| onSelectedIdChange | `((id: string \| null, details: SelectionChangeDetails<TreeNode>) => void) \| undefined` | See type | no | — | Called with the id of the row the person selects by click, Enter or Space, and details whose `item` is the node: an endpoint (leaf), or a branch when branches are selectable. Not for a group that toggles, a disabled row or the row already selected. A linked row also navigates. |
| query | `string \| undefined` | See type | no | "" | Filter text from the search field above the tree. Matching branches open and the match is highlighted. |
| renderContent | `((node: TreeNode, content: TreeRowContent) => ReactNode \| null) \| undefined` | See type | no | — | Draw a row's content (after the chevron) yourself, e.g. an entity identity's row tier, so a tree row is the same object as the entity's table cell and header. The row keeps its own states (fa-item: hover, focus, selected) and height. Return null for the default icon, label and description. |
| renderLink | `((node: TreeNode, props: TreeRowRenderProps) => ReactElement \| null) \| undefined` | See type | no | — | Render selectable rows as links (a TanStack Router `<Link>` in the app). Return null to keep a row a plain item. A linked row navigates natively (click, middle-click, Enter); a click or Enter also selects it. |
| rowWrapper | `((node: TreeNode, row: ReactElement) => ReactElement) \| undefined` | See type | no | — | Wrap each row element, e.g. in ActionContextMenu so right-click, long-press, Shift+F10 and the Menu key open the row's actions (R11.6). Must render the row it is given. |
| selectableGroups | `boolean \| undefined` | false, true | no | false | Branches can be selected as well as opened (an explorer: a folder, a registry key). A click, Enter or Space selects the row and fires `onSelectedIdChange`; the chevron, → and ←, or a double-click, open and close it. Per node with `TreeNode.selectable`. |
| selectedId | `string \| null \| undefined` | See type | no | — | The selected row's id, or null for none. Controlled while defined; leave it undefined to use `defaultSelectedId`. |
