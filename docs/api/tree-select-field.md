# TreeSelectField

TreeSelect bound to a form field: `string | null`, or `string[]` with `multiple`. Use it
inside `form.AppField`; label, hint and the first error come from the field.

`import { TreeSelectField } from "glass-ux/tree-select"`

[Live examples](https://dastari.github.io/glass-ux/components/tree-select-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| checkStrategy | `CheckStrategy \| undefined` | "all", "parent", "child" | no | — | Multiple choice: which checked nodes the value lists. `parent` (default) lists a fully checked branch instead of its children; `child` lists leaves only; `all` lists every checked node. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultExpanded | `string[] \| undefined` | See type | no | — | Groups open at first. Default: the ancestors of the chosen values. |
| emptyText | `((query: string) => ReactNode) \| undefined` | See type | no | — | The line shown when the search matches nothing. Default: No match for “query”. |
| groupCounts | `boolean \| undefined` | false, true | no | — | Show each group's count of leaves. Default true; lazily loaded branches never show one. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| icon | `ReactNode` | See type | no | — | A fixed leading icon in the trigger, for a single choice whose node has none. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| labels | `Partial<{ placeholder: string; options: string; search: string; noMatch: (query: string) => string; selected: (count: number) => string; more: (count: number, labels: string) => string; clear: string; loading: string; loadFailed: string; retry: string; }> \| undefined` | See type | no | — | Wording for this instance, over the language pack and `MessagesProvider`. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for search matching and wording. Default: the nearest `LocaleProvider`. |
| multiple | `boolean \| undefined` | false, true | no | false | Several nodes, with checkboxes. Bind it to a `string[]` field; a single choice binds to `string | null`. |
| nodes | `TreeNode[]` | See type | yes | — | The tree of options: folders, org units, device groups. Ids must be unique. |
| onLoadChildren | `((node: TreeNode) => Promise<void> \| void) \| undefined` | See type | no | — | Load a branch's children the first time it opens (a node with `hasChildren` and no `children`): update `nodes`, then resolve. A rejection shows Retry. Same contract as Tree. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with true when the tree opens and false when it closes. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | Shown while nothing is chosen. Name the choice ("Choose a team"), not "Select…". |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| searchable | `boolean \| undefined` | false, true | no | — | Show a search field above the tree. Default true. Matches keep their ancestors and are highlighted. |
| selectableGroups | `boolean \| undefined` | false, true | no | — | Single choice: branches can be chosen as well as opened. Per node with `TreeNode.selectable`. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short, medium or full (default). |
| wrap | `boolean \| undefined` | false, true | no | true | Multiple choice: let chips wrap onto more lines (forms). Off: one line that folds the rest into "+N". |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
