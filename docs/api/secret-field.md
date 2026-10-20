# SecretField

SecretInput bound to a form field holding a `SecretValue`: use it inside
`form.AppField`. The schema decides when a secret is required (`secretWillBeSet`).

`import { SecretField } from "glass-ux/entity-settings"`

[Live examples](https://dastari.github.io/glass-ux/components/secret-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| hint | `ReactNode` | See type | no | — | Supporting text in the field’s reserved message slot. Validation errors take precedence. |
| label | `ReactNode` | See type | yes | — | The visible or accessible label for this component. |
| optional | `boolean \| undefined` | false, true | no | — | Shows the optional-field indication without changing validation. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| secretName | `string \| undefined` | See type | no | — | Names the secret for its buttons ("community"). |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Available width or named width tier. |
