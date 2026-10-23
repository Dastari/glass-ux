# SplitPane

Two panes and the divider between them: a tree beside a table, a list above its details.
Drag the divider or use its keys; each pane keeps within its limits; the pane that gives
way hides on Enter, or behind a rail button in a narrow split. Remembered per window kind
inside a window body.

`import { SplitPane } from "glass-ux/split-pane"`

[Live examples](https://dastari.github.io/glass-ux/components/split-pane)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| collapse | `"start" \| "end" \| undefined` | "start", "end" | no | "start" | The pane that gives way: Enter on the divider hides it, and a narrow split hides it. Default "start". |
| collapseBelow | `SplitPaneLength \| undefined` | See type | no | "40rem" | Below this length along the split, the pane that gives way hides behind a button. Default "40rem". |
| defaultSize | `SplitPaneLength \| undefined` | See type | no | "40%" | The first pane's size when none is remembered. Default "40%". |
| end | `ReactNode` | See type | yes | — | The second pane: the table, the details. |
| endLabel | `string \| undefined` | See type | no | — | Names the second pane's region, and its button when it is the one that gives way. |
| endMax | `SplitPaneLength \| undefined` | See type | no | "100%" | The second pane's maximum. Default "100%". |
| endMin | `SplitPaneLength \| undefined` | See type | no | "12rem" | The second pane's minimum. Default "12rem". |
| name | `string \| undefined` | See type | no | "split" | Tells several splits in one window kind apart in storage. Default "split". |
| onSizeChange | `((size: number) => void) \| undefined` | See type | no | — | Called with the first pane's new size in px when a drag or a key press sets it. |
| orientation | `"horizontal" \| "vertical" \| undefined` | "horizontal", "vertical" | no | "horizontal" | `horizontal` (default): side by side. `vertical`: one above the other. |
| size | `number \| undefined` | See type | no | — | The first pane's size in px, controlled. Pair with `onSizeChange`. |
| start | `ReactNode` | See type | yes | — | The first pane: the tree, the list. |
| startLabel | `string` | See type | yes | — | Names the first pane: its region, the divider ("Resize Folders") and the button that shows it ("Show Folders"). |
| startMax | `SplitPaneLength \| undefined` | See type | no | "100%" | The first pane's maximum. Default "100%" (only the second pane's minimum limits it). |
| startMin | `SplitPaneLength \| undefined` | See type | no | "12rem" | The first pane's minimum. Default "12rem". |
| storageKey | `string \| null \| undefined` | See type | no | — | Where the size is remembered (localStorage). Inside a window body it defaults to one key per window kind (`glass-ux.split:window:<kind>:<name>`); elsewhere nothing is remembered unless you pass one. null turns it off. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
