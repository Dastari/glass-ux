# RhfField

Bind an existing typed field to RHF, preserving its label, normalisation and reserved error line.

`import { RhfField } from "glass-ux/form-rhf"`

[Live examples](https://dastari.github.io/glass-ux/components/rhf-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| component | `ComponentType<P>` | See type | yes | — | Existing bound component, such as EmailField, IpField, PortField or MoneyField. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| control | `Control<T, any, O> \| undefined` | See type | no | — | Inherited from the underlying primitive. Its accepted values are specified by the type. |
| defaultValue | `PathValueImpl<T, N> \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| exact | `boolean \| undefined` | false, true | no | — | Inherited from the underlying primitive. Its accepted values are specified by the type. |
| name | `N` | See type | yes | — | The component’s name or native form field name, as specified by its value type. |
| rules | `Omit<RegisterOptions<T, N>, "disabled" \| "valueAsNumber" \| "valueAsDate" \| "setValueAs"> \| undefined` | See type | no | — | Inherited from the underlying primitive. Its accepted values are specified by the type. |
| shouldUnregister | `boolean \| undefined` | false, true | no | — | Inherited from the underlying primitive. Its accepted values are specified by the type. |
