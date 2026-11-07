# Entity settings

`EntitySettingsDialog` composes one application form with routed or local settings
sections, validation, dirty markers, conflict handling and the shared Save feedback.
The host owns document loading, authorization, persistence and any verification step.

Give the dialog the entity's identity, and it becomes the header: its tile, name, state, facts and
actions, beside the close button. The dialog is named from it ("NST-C106 settings"), and in a narrow
dialog it takes its compact tier, with the actions in one ⋯:

```tsx
<EntitySettingsDialog
  identity={{ name: device.name, kind: "Endpoint", icon: <IconEndpoint />, state, facts, actions: deviceActions, target: device }}
  …
/>
```

It replaces `media`, `title` and `subtitle`. A header without one takes `headerActions`.

For a populated form whose save operation is unavailable, supply a reason:

```tsx
<EntitySettingsDialog
  open={open}
  onOpenChange={setOpen}
  form={form}
  tabs={tabs}
  saveDisabledReason="Saving this draft is not available"
/>
```

Fields remain editable and unsaved edits retain the usual discard protection. Save
uses the shared disabled-reason tooltip and stays keyboard reachable. Button activation,
Enter and form submission cannot call save or verification while the reason is present.
This is separate from `loading`, which displays document skeletons. Omitting the reason
preserves ordinary dirty, validation, verification and save behaviour. The host still
enforces authorization and validation on its actual write operation.

## Closing with unsaved changes

Escape, the backdrop and the close button ask before discarding unsaved changes. Cancel is
an explicit discard: it reverts the form and closes. Pass `confirmOnCancel` to have Cancel
ask the same question first; Keep editing leaves the edits and the dialog open, and Discard
changes reverts and closes. A clean form closes at once either way.
