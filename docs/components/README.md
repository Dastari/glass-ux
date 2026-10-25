# Component docs

One page per library component that needs more than its TSDoc: what it is for, how to bind it
to a form and validate it, its value, and its behaviour. The gallery groups each base
component and its related exports in one document, with live examples, section navigation
and individual API references. It shows every state; these pages are what a person or an
AI agent reads before using a component.

The gallery keeps slots, providers, variants and loading states with their base component,
including related exports from separate package entries. For example, Button includes
ButtonLink and CopyButton; Combobox includes MultiSelect, TagInput, Autocomplete and shared
option parts; DataTable includes its cell renderers. A helper nested under another helper
stays in the same document. Independent controls such as Select and Pagination retain
their own pages. Existing per-export URLs still open the matching example, usage or API
inside the family document.

Every form control follows the same pattern (R15):

```tsx
const schema = z.object({ mobile: mobileSchema({ required: true }) })   // the control's schema helper
const form = useAppForm({ ...formBehaviour, defaultValues, validators: { onDynamic: schema }, onSubmit })

<form.AppField name="mobile">{(field) => <field.MobileField label="Mobile" />}</form.AppField>
```

- **`field.XField`** is the bound field: label, hint and error through `Field`, one per row. Every
  one is registered in `useAppForm` (`src/ui/form/form.tsx`) and also exported from its folder.
- **`XInput`** (or `XSelect`) is the bare control, for a `Field` you lay out yourself or a value you
  hold in state.
- **`xSchema(options)`** is the Zod helper. Its messages come from the same parser the control
  normalises with, written as instructions (R2.4): "Enter a port from 1 to 65535".
- Values are normalised **on blur**, never while typing, so the caret is never fought.

## Typed inputs

| Page                                      | Bound field                                  | Value                                 | Schema helper                             |
| ----------------------------------------- | -------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| [Address](address-field.md)               | `AddressField` (and `AddressView` read-only) | `AddressValue`                        | `addressSchema`                           |
| [Phone and mobile](phone-field.md)        | `PhoneField`, `MobileField`                  | E.164 string                          | `phoneSchema`, `mobileSchema`             |
| [Email](email-field.md)                   | `EmailField`                                 | string                                | `emailSchema`                             |
| [Web address](url-field.md)               | `UrlField`                                   | string                                | `urlSchema`                               |
| [Password](password-field.md)             | `PasswordField`                              | string                                | `passwordSchema`, `currentPasswordSchema` |
| [One-time code](otp-field.md)             | `OtpField`                                   | string                                | `otpSchema`                               |
| [Coordinates](coordinates-field.md)       | `CoordinatesField`                           | `{ lat, lng } \| null`                | `coordinatesSchema`                       |
| [IP address](ip-field.md)                 | `IpField`                                    | string                                | `ipSchema`                                |
| [MAC address](mac-field.md)               | `MacAddressField`                            | string                                | `macSchema`                               |
| [Host name and domain](hostname-field.md) | `HostnameField`, `DomainField`               | string                                | `hostnameSchema`, `domainSchema`          |
| [Port](port-field.md)                     | `PortField`                                  | `number \| null`                      | `portSchema`                              |
| [Duration](duration-field.md)             | `DurationField`                              | seconds, `number \| null`             | `durationSchema`                          |
| [Byte size](byte-size-field.md)           | `ByteSizeField`                              | bytes, `number \| null`               | `byteSizeSchema`                          |
| [Money](money-field.md)                   | `MoneyField`                                 | minor units (cents), `number \| null` | `moneySchema`                             |
| [Percentage](percent-field.md)            | `PercentField`                               | `number \| null`                      | `percentSchema`                           |
| [Country](country-select.md)              | `CountryField`                               | ISO code, `string \| null`            | `countrySchema`                           |
| [Rich text](rich-text.md)                 | `RichTextField`                              | Markdown string                       | `richTextSchema`                          |
| [Time zone](time-zone-select.md)          | `TimeZoneField`                              | IANA name, `string \| null`           | `timeZoneSchema`                          |
| [Time and date-time](time-field.md)       | `TimeField`, `DateTimeField`                 | `"HH:mm"`, wall clock, `string \| null` | `timeSchema`, `dateTimeSchema`            |
| [Copy button](copy-button.md)             | —                                            | —                                     | —                                         |
| [Swatch picker](swatch-picker.md)         | — (bare control in a `SettingRow`)           | option value                          | —                                         |
| [Slider](slider.md)                      | — (bare control inside a `Field`)           | number or number array                | —                                         |

Building your own schema helper: `textRule(check, options)` and `numberRule(options)` in
`glass-ux/form` treat "empty" and "required" the same way every helper above does.

For React Hook Form, see the optional [RHF adapter](form-rhf.md). For large measured
collections, see [Virtual list](virtual-list.md).

For populated entity forms, see [Entity settings dialogs](entity-settings.md), including
editable drafts whose save action is unavailable.

For sign-in, providers, two-factor codes, password reset and account creation, see
[Login flow](login-flow.md).

## Navigation and choice

| Page                              | Component                       | Collapse                                                                     |
| --------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| [Segmented control](segmented.md) | `Segmented`                     | full → icons → menu button                                                   |
| [Breadcrumb](breadcrumb.md)       | `Breadcrumb`, `RouteBreadcrumb` | full → middle → ‹ parent · current → current place with the trail in a popup |
| [Context switcher](context-switcher.md) | `ContextSwitcher`, `ContextSwitcherPanel` | Organisations, projects or any context; complete local hierarchy or bounded server directory; phone sheet |

## Interaction

| Page                            | Components                                            | Notes                                                                    |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| [Drag and drop](drag-drop.md)   | `DragDropProvider`, `Draggable`, `DragHandle`, `DropZone` | Typed objects, sortable lists and grids, reactive zone states, keyboard and touch |
| [Kanban](kanban.md)             | `Kanban`, `KanbanCard`                                | Columns of cards on drag and drop: limits that refuse with a reason, collapse, saves that fly back |
| [Scheduler](scheduler.md)       | `Scheduler`                                           | Month, week, day and agenda; side-by-side overlaps, slot selection, drag and keyboard rescheduling, time zones |
