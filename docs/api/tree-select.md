# TreeSelect

A select whose options are a tree: folders, org units, device groups. One node, or with
`multiple` several, with checkboxes whose branches show the mixed state and a
`checkStrategy` for what the value lists. The tree opens on glass below the trigger with
a search field (matches keep their ancestors and are highlighted); lazily loaded branches
use Tree's `onLoadChildren`. Chosen nodes show as chips that fold into "+N".

Keyboard (the ARIA tree pattern): ↓ from the search enters the tree; ↑ ↓ move, → opens or
enters a group, ← closes or returns to the parent, Home / End, Enter or Space chooses (a
single choice closes the tree), typing returns to the search. Backspace on the trigger
removes the last chosen node; Esc closes and returns focus to the trigger.

`import { TreeSelect } from "glass-ux/tree-select"`

[Live examples](https://dastari.github.io/glass-ux/components/tree-select)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| checkStrategy | `CheckStrategy \| undefined` | "all", "parent", "child" | no | "parent" | Multiple choice: which checked nodes the value lists. `parent` (default) lists a fully checked branch instead of its children; `child` lists leaves only; `all` lists every checked node. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the trigger. |
| defaultExpanded | `string[] \| undefined` | See type | no | — | Groups open at first. Default: the ancestors of the chosen values. |
| defaultValue | `string \| string[] \| null \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| emptyText | `((query: string) => ReactNode) \| undefined` | See type | no | — | The line shown when the search matches nothing. Default: No match for “query”. |
| groupCounts | `boolean \| undefined` | false, true | no | true | Show each group's count of leaves. Default true; lazily loaded branches never show one. |
| icon | `ReactNode` | See type | no | — | A fixed leading icon in the trigger, for a single choice whose node has none. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid outside a Field. |
| labels | `Partial<{ placeholder: string; options: string; search: string; noMatch: (query: string) => string; selected: (count: number) => string; more: (count: number, labels: string) => string; clear: string; loading: string; loadFailed: string; retry: string; }> \| undefined` | See type | no | — | Wording for this instance, over the language pack and `MessagesProvider`. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for search matching and wording. Default: the nearest `LocaleProvider`. |
| multiple | `boolean \| undefined` | false, true | no | false | Several nodes, with checkboxes. |
| name | `string \| undefined` | See type | no | — | Native form field name: one hidden input per chosen id. |
| nodes | `TreeNode[]` | See type | yes | — | The tree of options: folders, org units, device groups. Ids must be unique. |
| onBlur | `((event: FocusEvent<HTMLButtonElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the trigger while the tree is closed, so a form can mark the field touched. |
| onLoadChildren | `((node: TreeNode) => Promise<void> \| void) \| undefined` | See type | no | — | Load a branch's children the first time it opens (a node with `hasChildren` and no `children`): update `nodes`, then resolve. A rejection shows Retry. Same contract as Tree. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with true when the tree opens and false when it closes. |
| onValueChange | `((value: string \| null) => void) \| ((value: string[]) => void) \| undefined` | See type | no | — | Called with the chosen node's id when one is picked by click, Enter or Space. Called with every checked id (in `checkStrategy` form, tree order) after each check, uncheck or Clear. |
| placeholder | `string \| undefined` | See type | no | — | Shown while nothing is chosen. Name the choice ("Choose a team"), not "Select…". |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| searchable | `boolean \| undefined` | false, true | no | true | Show a search field above the tree. Default true. Matches keep their ancestors and are highlighted. |
| selectableGroups | `boolean \| undefined` | false, true | no | false | Single choice: branches can be chosen as well as opened. Per node with `TreeNode.selectable`. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| value | `string \| string[] \| null \| undefined` | See type | no | — | The chosen node's id, or null. Controlled while defined. The checked ids in `checkStrategy` form, in tree order. Controlled while defined. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short, medium or full (default). |
| wrap | `boolean \| undefined` | false, true | no | false | Multiple choice: let chips wrap onto more lines (forms). Off: one line that folds the rest into "+N". |
