# TopBar

A responsive application header combining scope, breadcrumb, search, status, account and host-defined actions.

`import { TopBar } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/top-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| account | `ReactNode` | See type | no | — | Account identity displayed by the component. |
| actions | `ReactNode` | See type | no | — | Supporting actions rendered in the action slot. |
| breadcrumb | `ReactNode` | See type | no | — | A Breadcrumb. On a phone it shows only the current place; give it a `header` (the module switch) and a `scope`. |
| module | `ReactNode` | See type | no | — | Before the scope: the product's module switch (a Segmented: RMM · PSA · CHAT). Folds to its menu on a phone. |
| scope | `ReactNode` | See type | no | — | The context you work in: a ContextSwitcher (organisation, project, workspace). The breadcrumb follows it after a separator. On a phone its trigger leaves the bar for the breadcrumb's trail: give the Breadcrumb a `scope` that opens the switcher. |
| search | `ReactNode` | See type | no | — | Search definition or controlled search value. |
| status | `ReactNode` | See type | no | — | Live state that appears only while it runs (a TimerChip), after the breadcrumb. |
| trailing | `ReactNode` | See type | no | — | The far right, after the account: the assistant toggle. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
