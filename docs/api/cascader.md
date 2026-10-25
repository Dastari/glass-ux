# Cascader

Choose from a deep hierarchy where each level is a short list (country → region → site):
columns open to the right as you choose. One path by default, any level with
`changeOnSelect`, or several with `multiple` (checkboxes, mixed levels). The search lists
matching full paths ("Australia / New South Wales / Parramatta"). Levels can load on
demand. The trigger shows the path and drops middle levels when it does not fit.

Keyboard: ↑ ↓ move within a column, → opens the next level, ← returns to the previous one,
Home / End, Enter chooses (a single choice closes the popup), Space checks with `multiple`,
typing jumps within a column. On phones the columns become one list with a Back button.

`import { Cascader } from "glass-ux/cascader"`

[Live examples](https://dastari.github.io/glass-ux/components/cascader)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| changeOnSelect | `boolean \| undefined` | false, true | no | false | Single choice: any level can be chosen, not only the last. Choosing a level also opens it. |
| checkStrategy | `CheckStrategy \| undefined` | "all", "parent", "child" | no | "parent" | Multiple choice: which checked paths the value lists. `parent` (default) lists a fully checked level instead of everything under it; `child` lists last levels only; `all` lists both. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the trigger. |
| defaultValue | `string[] \| string[][] \| null \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| icon | `ReactNode` | See type | no | — | A fixed leading icon in the trigger. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid outside a Field. |
| labels | `Partial<{ placeholder: string; options: string; search: string; separator: string; noMatch: (query: string) => string; moreMatches: (shown: number, total: number) => string; matches: (count: number) => string; back: string; selected: (count: number) => string; more: (count: number, labels: string) => string; clear: string; loading: string; loadFailed: string; retry: string; }> \| undefined` | See type | no | — | Wording for this instance, over the language pack and `MessagesProvider`. |
| layout | `"auto" \| "list" \| "columns" \| undefined` | "auto", "list", "columns" | no | "auto" | columns: levels side by side. list: one level at a time with a Back button, in a popup as wide as the screen allows. auto (default): list on phone-sized viewports. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for search matching and wording. Default: the nearest `LocaleProvider`. |
| multiple | `boolean \| undefined` | false, true | no | false | Several paths, with checkboxes. |
| name | `string \| undefined` | See type | no | — | Native form field name: one hidden input per chosen path, its values joined with "/". |
| onBlur | `((event: FocusEvent<HTMLButtonElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the trigger while the popup is closed, so a form can mark the field touched. |
| onLoadChildren | `((option: CascaderOption, path: string[]) => Promise<void> \| void) \| undefined` | See type | no | — | Load a level the first time it opens (an option with `hasChildren` and no `children`): update `options`, then resolve. Receives the option and its value path. A rejection shows Retry. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with true when the popup opens and false when it closes. |
| onValueChange | `((value: string[] \| null) => void) \| ((value: string[][]) => void) \| undefined` | See type | no | — | Called with the chosen path when a last level (or any level with `changeOnSelect`) is picked. Called with every checked path (in `checkStrategy` form) after each check, uncheck or Clear. |
| options | `CascaderOption[]` | See type | yes | — | The hierarchy: each level a short list (country → region → site). Values are unique among siblings. |
| placeholder | `string \| undefined` | See type | no | — | Shown while nothing is chosen. Name the choice ("Choose a site"). |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| searchable | `boolean \| undefined` | false, true | no | true | Show a search field that lists matching full paths. Default true. |
| searchLimit | `number \| undefined` | See type | no | 50 | The most search results listed; the rest are counted. Default 50. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| value | `string[] \| string[][] \| null \| undefined` | See type | no | — | The chosen path of option values from the top level, or null. Controlled while defined. The checked paths in `checkStrategy` form, in tree order. Controlled while defined. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short, medium or full (default). |
| wrap | `boolean \| undefined` | false, true | no | false | Multiple choice: let chips wrap onto more lines (forms). |
