# CascaderField

Cascader bound to a form field: a path (`string[] | null`), or `string[][]` with
`multiple`. Use it inside `form.AppField`; label, hint and the first error come from the field.

`import { CascaderField } from "glass-ux/cascader"`

[Live examples](https://dastari.github.io/glass-ux/components/cascader-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| changeOnSelect | `boolean \| undefined` | false, true | no | — | Single choice: any level can be chosen, not only the last. Choosing a level also opens it. |
| checkStrategy | `CheckStrategy \| undefined` | "all", "parent", "child" | no | — | Multiple choice: which checked paths the value lists. `parent` (default) lists a fully checked level instead of everything under it; `child` lists last levels only; `all` lists both. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| icon | `ReactNode` | See type | no | — | A fixed leading icon in the trigger. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| labels | `Partial<{ placeholder: string; options: string; search: string; separator: string; noMatch: (query: string) => string; moreMatches: (shown: number, total: number) => string; matches: (count: number) => string; back: string; selected: (count: number) => string; more: (count: number, labels: string) => string; clear: string; loading: string; loadFailed: string; retry: string; }> \| undefined` | See type | no | — | Wording for this instance, over the language pack and `MessagesProvider`. |
| layout | `"auto" \| "list" \| "columns" \| undefined` | "auto", "list", "columns" | no | — | columns: levels side by side. list: one level at a time with a Back button, in a popup as wide as the screen allows. auto (default): list on phone-sized viewports. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for search matching and wording. Default: the nearest `LocaleProvider`. |
| multiple | `boolean \| undefined` | false, true | no | false | Several paths, with checkboxes. Bind it to a `string[][]` field; a single path binds to `string[] | null`. |
| onLoadChildren | `((option: CascaderOption, path: string[]) => Promise<void> \| void) \| undefined` | See type | no | — | Load a level the first time it opens (an option with `hasChildren` and no `children`): update `options`, then resolve. Receives the option and its value path. A rejection shows Retry. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with true when the popup opens and false when it closes. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| options | `CascaderOption[]` | See type | yes | — | The hierarchy: each level a short list (country → region → site). Values are unique among siblings. |
| placeholder | `string \| undefined` | See type | no | — | Shown while nothing is chosen. Name the choice ("Choose a site"). |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| searchable | `boolean \| undefined` | false, true | no | — | Show a search field that lists matching full paths. Default true. |
| searchLimit | `number \| undefined` | See type | no | — | The most search results listed; the rest are counted. Default 50. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short, medium or full (default). |
| wrap | `boolean \| undefined` | false, true | no | true | Multiple choice: let chips wrap onto more lines (forms). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
