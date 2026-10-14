# MenuItemContent

The inside of every menu row (menu, context menu, action menus, previews): icon, label,
then a trailing shortcut or chevron. One layout, so every list reads the same.

`import { MenuItemContent } from "glass-ux/menu"`

[Live examples](https://dastari.github.io/glass-ux/components/menu-item-content)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| icon | `ReactNode` | false, true | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown with the control, using the host platform’s modifier keys. |
| trail | `ReactNode` | false, true | no | — | Ancestor trail before the current item. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
