# SettingsSections

The rail + pane body of a settings dialog. Usable inside any Dialog.Popup.

`import { SettingsSections } from "glass-ux/dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/settings-sections)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultSection | `string \| undefined` | See type | no | — | Initially active section. |
| keepMounted | `boolean \| undefined` | false, true | no | false | Keep every section mounted (hidden when not current), so one form spans them all. |
| label | `string` | See type | yes | — | The visible or accessible label for this component. |
| onSectionChange | `((section: string) => void) \| undefined` | See type | no | — | Called when section change occurs. The callback type specifies its arguments. |
| section | `string \| undefined` | See type | no | — | Active section identifier. |
| sections | `SettingsSection[]` | See type | yes | — | Section definitions in display order. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
