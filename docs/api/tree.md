# Tree

The navigation tree (a sidebar's records grouped by owner). Groups collapse; leaf rows
are fa-item rows, two lines with a description, with an optional status dot on the icon. Keyboard: ↑ ↓ move,
→ opens or enters a group, ← closes or returns to the parent, Home / End, Enter selects
(toggles a group), and typing jumps to the next matching name. One row is tabbable (roving
tabindex). Rows are virtualised, so thousands of rows cost only the rows on screen.

With `selectableGroups` a branch is selected like a leaf and opens from its chevron. Large
trees load lazily: `hasChildren` marks a branch whose children `onLoadChildren` fetches on
first open, and `hasMore` with `onLoadMore` pages them in.

Opt in to multi-select with `selectionMode`, to reordering with `onMove`, to renaming with
`onRename` and to trailing content with `renderTrailing`; `ref` gives `reveal`. All of them
work on ids and the rows on screen, never by walking every node.

`import { Tree } from "glass-ux/tree"`

[Live examples](https://dastari.github.io/glass-ux/components/tree)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the tree: "Endpoints". |
| canMove | `((move: TreeMove) => boolean \| string) \| undefined` | See type | no | — | Refuse a move: return false, or a sentence saying why. A row never moves into itself. |
| checkboxes | `boolean \| undefined` | false, true | no | false | Show a check mark on each selectable row in `multiple` mode, which toggles it: the route on touch. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultExpanded | `string[] \| undefined` | See type | no | — | Initially expanded nodes when expansion is uncontrolled. |
| defaultRenamingId | `string \| null \| undefined` | See type | no | — | The row being renamed at first. |
| defaultSelectedId | `string \| null \| undefined` | See type | no | — | The row selected at first when the selection is uncontrolled. |
| defaultSelectedIds | `readonly string[] \| undefined` | See type | no | — | The rows selected at first when uncontrolled. |
| dragType | `string \| undefined` | See type | no | TREE_DRAG_TYPE | What dragged rows carry, for a DropZone outside the tree. Default `TREE_DRAG_TYPE`. |
| emptyText | `((query: string) => ReactNode) \| undefined` | See type | no | — | The line shown when nothing matches. Default: No match for “query”. |
| expanded | `string[] \| undefined` | See type | no | — | Open groups. Uncontrolled with `defaultExpanded`. |
| groupCounts | `boolean \| undefined` | false, true | no | true | Show each group's count of endpoints (leaves). Default true. Turn it off where a count would mislead, such as an explorer whose branches are still loading. Lazily loaded and paged branches never show one. |
| nodes | `TreeNode[]` | See type | yes | — | Graph or tree nodes with stable identifiers and relationships. |
| onExpandedChange | `((expanded: string[]) => void) \| undefined` | See type | no | — | Called with the full list of open group ids whenever a group opens or closes (click, Enter, Space or the arrow keys); groups do not toggle while searching. Pair with `expanded` to control it. |
| onLoadChildren | `((node: TreeNode) => Promise<void> \| void) \| undefined` | See type | no | — | Load a branch's children the first time it opens (a node with `hasChildren` and no `children`): update `nodes` with them, then resolve. A loading row shows meanwhile; a rejection shows an error row whose Retry calls this again. Without it, the loading row shows until `nodes` gives the branch its children. |
| onLoadMore | `((node: TreeNode) => Promise<void> \| void) \| undefined` | See type | no | — | Load the next page of a branch's children (a node with `hasMore`): append them to `nodes`, then resolve. A rejection offers Retry. |
| onMove | `((move: TreeMove) => void) \| undefined` | See type | no | — | Makes rows movable: by drag on a pointer that hovers, Alt with the arrow keys (↑ ↓ among siblings, reading direction into and out of a branch), and `TreeMoveItems` in a menu, the single-pointer route (WCAG 2.5.7). A selected row moves with the selection. The host owns the data: apply the move to `nodes`, with `moveTreeNodes` or on the server. Unavailable while searching, when the rows shown are not the real order (R16.10). |
| onRename | `((id: string, label: string, details: TreeRenameDetails) => void \| boolean \| string \| Promise<void \| boolean \| string>) \| undefined` | See type | no | — | Makes rows renamable in place: F2, or `TreeHandle.rename` from a menu. Enter or leaving the field commits, Escape cancels. Update `nodes` to apply it. Return false, or a message saying why, to stay in the field; a promise holds the field until it settles, and a rejection says "Couldn't rename". |
| onRenamingIdChange | `((id: string \| null) => void) \| undefined` | See type | no | — | Called when renaming starts or ends. |
| onSelectedIdChange | `((id: string \| null, details: SelectionChangeDetails<TreeNode>) => void) \| undefined` | See type | no | — | Called with the id of the row the person selects by click, Enter or Space, and details whose `item` is the node: an endpoint (leaf), or a branch when branches are selectable. Not for a group that toggles, a disabled row or the row already selected. A linked row also navigates. |
| onSelectedIdsChange | `((ids: string[], details: TreeSelectionDetails) => void) \| undefined` | See type | no | — | Called with the whole selection after each change in `multiple` mode. |
| query | `string \| undefined` | See type | no | "" | Filter text from the search field above the tree. Matching branches open and the match is highlighted. |
| ref | `Ref<TreeHandle> \| undefined` | See type | no | — | The tree's handle: {@link TreeHandle}. |
| renamingId | `string \| null \| undefined` | See type | no | — | The row being renamed, or null. Controlled while defined. |
| renderContent | `((node: TreeNode, content: TreeRowContent) => ReactNode \| null) \| undefined` | See type | no | — | Draw a row's content (after the chevron) yourself, e.g. an entity identity's row tier, so a tree row is the same object as the entity's table cell and header. The row keeps its own states (fa-item: hover, focus, selected) and height. Return null for the default icon, label and description. |
| renderLink | `((node: TreeNode, props: TreeRowRenderProps) => ReactElement \| null) \| undefined` | See type | no | — | Render selectable rows as links (a TanStack Router `<Link>` in the app). Return null to keep a row a plain item. A linked row navigates natively (click, middle-click, Enter); a click or Enter also selects it. |
| renderTrailing | `((node: TreeNode, content: TreeRowContent) => ReactNode) \| undefined` | See type | no | — | Content at the row's end: a badge, a size, a sync state. It may be anything, but the rows are one tab stop (R11.5), so give a button `tabIndex={-1}` and repeat its action in `rowWrapper`'s context menu. Clicking a control here does not select the row. |
| rowWrapper | `((node: TreeNode, row: ReactElement) => ReactElement) \| undefined` | See type | no | — | Wrap each row element, e.g. in ActionContextMenu so right-click, long-press, Shift+F10 and the Menu key open the row's actions (R11.6). Must render the row it is given. |
| selectableGroups | `boolean \| undefined` | false, true | no | false | Branches can be selected as well as opened (an explorer: a folder, a registry key). A click, Enter or Space selects the row and fires `onSelectedIdChange`; the chevron, → and ←, or a double-click, open and close it. Per node with `TreeNode.selectable`. |
| selectedId | `string \| null \| undefined` | See type | no | — | The selected row's id, or null for none. Controlled while defined; leave it undefined to use `defaultSelectedId`. |
| selectedIds | `readonly string[] \| undefined` | See type | no | — | The selected rows in `multiple` mode. Controlled while defined. |
| selectionLimit | `number \| undefined` | See type | no | — | The most rows a range or Select All takes; the rest stay out and `details.limited` is true. Default none. |
| selectionMode | `TreeSelectionMode \| undefined` | "multiple", "single" | no | "single" | `multiple` selects several rows (R11.8): a click replaces, ⌘/Ctrl-click toggles, Shift-click takes a range. Keyboard: Space toggles, Shift with the arrows, Home or End extends, ⌘/Ctrl+A selects all loaded rows. The selection is a list of ids, so it costs nothing to hold and may name rows that are not loaded or are scrolled out of view. `selectedId` keeps reporting the row last pressed without a modifier. |
| trailingVisibility | `"always" \| "hover" \| undefined` | "always", "hover" | no | "always" | `hover` shows trailing content on hover, focus and selection, and always on touch (R11.7). Default `always`. |
