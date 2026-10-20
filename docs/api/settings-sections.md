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
| onSectionChange | `((section: string) => void) \| undefined` | See type | no | — | Called with the chosen section's `value` when the person switches section; the pane scrolls back to the top. Pair with `section` to control it. |
| section | `string \| undefined` | See type | no | — | Active section identifier. |
| sections | `SettingsSection[]` | See type | yes | — | Section definitions in display order. |
