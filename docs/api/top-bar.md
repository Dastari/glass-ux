# TopBar

A responsive application header combining scope, breadcrumb, search, status, account and host-defined actions.

`import { TopBar } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/top-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| account | `ReactNode` | false, true | no | — | Account identity displayed by the component. |
| actions | `ReactNode` | false, true | no | — | Supporting actions rendered in the action slot. |
| breadcrumb | `ReactNode` | false, true | no | — | A Breadcrumb. On a phone it shows only the current place; give it a `header` (the module switch) and a `scope`. |
| module | `ReactNode` | false, true | no | — | Before the scope: the product's module switch (a Segmented: RMM · PSA · CHAT). Folds to its menu on a phone. |
| scope | `ReactNode` | false, true | no | — | The tenant scope: an OrgSwitcher. The breadcrumb follows it after a separator. On a phone its trigger leaves the bar for the breadcrumb's trail: give the Breadcrumb a `scope` that opens the switcher. |
| search | `ReactNode` | false, true | no | — | Search definition or controlled search value. |
| status | `ReactNode` | false, true | no | — | Live state that appears only while it runs (a TimerChip), after the breadcrumb. |
| trailing | `ReactNode` | false, true | no | — | The far right, after the account: the assistant toggle. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
