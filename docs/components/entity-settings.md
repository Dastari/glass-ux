# Entity settings

`EntitySettingsDialog` composes one application form with routed or local settings
sections, validation, dirty markers, conflict handling and the shared Save feedback.
The host owns document loading, authorization, persistence and any verification step.

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
