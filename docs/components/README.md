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
| [Time and date-time](time-field.md)       | `DateField`, `TimeField`, `DateTimeField`    | `"YYYY-MM-DD"`, `"HH:mm"`, wall clock, `string \| null` | `dateSchema`, `timeSchema`, `dateTimeSchema` |
| [Signature](signature-pad.md)             | `SignatureField`                             | `SignatureValue \| null` (strokes or typed name) | `signatureSchema`                         |
| [Rating](rating.md)                       | `RatingField`                                | `number \| null`, 0 to `max`          | `ratingSchema`                            |
| [Image](image-cropper.md)                 | `ImageField`                                 | URL, `ImageChange` or `null`          | `imageSchema`                             |
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
| [ActivityFeed](activity-feed.md) | `ActivityFeed`                                        | Time-stamped events as a feed or a timeline: a rail joining the markers, avatars, details under a line, sorting by time, inline times, branches and one-stop selection |
| [NotificationList](notification-list.md) | `NotificationList`, `NotificationPopover`            | The rows behind an unread count: day or host groups, read and dismiss, paging, new rows behind a count; connects to AccountButton and the rail |
| [RichTextReader](rich-text-reader.md) | `RichTextReader`                                  | A Markdown document to read, with no toolbar or well: tables, task lists, code, footnotes and images, loaded on demand |
| [CommentThread](comment-thread.md) | `CommentThread`                                    | Comments and one level of replies with a rich text composer and mentions: sends that show at once and fail in place, permissions from the host |
| [ReactionBar](reaction-bar.md)  | `ReactionBar`                                         | Emoji reactions with counts: toggles named for what they say, one tab stop, a picker loaded on demand |
| [EmojiPicker](emoji-picker.md)  | `EmojiPicker`, `EmojiPopover`                         | Searchable emoji in the system font, one tab stop, with its data loaded on demand; English names unless the application supplies others |
| [FileDialog and FileProvider](file-dialog.md) | `FileDialog`, `FileConflictDialog`, `FileDialogPreview` | Open and save over a storage contract: paged folders, thumbnails, conflicts that close nothing; the host reads and writes |
| [Lightbox and ImageViewer](lightbox.md) | `Lightbox`, `ImageViewer`                       | Pictures at full size, in a dialog or the page: zoom and pan, rotate and flip, full screen, slideshow, details |
| [Kanban](kanban.md)             | `Kanban`, `KanbanCard`                                | Columns of cards on drag and drop: limits that refuse with a reason, collapse, saves that fly back |
| [Typeahead](typeahead.md)       | `Typeahead`, `TypeaheadPopup`, `TypeaheadOption`, `useTypeahead` | A list at a caret or any rectangle that leaves focus in the text: host-supplied rows, a detail pane, results that arrive late without moving a row. Composer's and RichTextInput's menus use it |
| [Diff view](diff-view.md)       | `DiffView`                                            | A unified diff with the sign in the gutter so a change reads without colour; tints as token roles for a diff drawn elsewhere; ResultDiff uses it |
| [Find bar](find-bar.md)         | `FindBar`                                             | Find in logs, tables and long documents: the host owns matching and supplies the count, which may still be climbing; a reserved count, options through a slot, an optional replace row |
| [Menubar](menubar.md)           | `Menubar`, `MenubarSkeleton`                          | An application's menus as data: shortcuts shown without listeners, submenus, rows loaded on open, focus after a command, and one menu in a narrow box |
| [Carousel](carousel.md)       | `Carousel`                                            | Slides of any content in a scroll-snap strip: Previous and Next, indicators as one tab stop, inert hidden slides, a reserved height, and automatic advance that a person can stop |
| [Masonry](masonry.md)         | `Masonry`, `layoutMasonry`                            | Items of different heights in columns from the container's width: laid out from their ratios so nothing moves as pictures load, DOM order equal to reading order, right to left, and a pure layout function for windowing |
| [Editable avatar](editable-avatar.md) | `EditableAvatar`, `AvatarDialog`                  | Change a photo where it is shown: drop, browse or paste, a round crop, requirements, upload progress and failures in place |
| [Level gauge](level-gauge.md) | `LevelGauge`                                    | A small ordered scale (Low · Moderate · High) in status tones, with an earlier level traced or striped; sm for cells, md for forms |
| [Relationship canvas](relationship-canvas.md) | `RelationshipCanvas`                        | Record cards joined row to row: schemas, class diagrams, workflows; drag and keyboard moves, auto layout, a dot grid that moves with the camera |
| [Scheduler](scheduler.md)       | `Scheduler`                                           | Month, week, day and agenda; a resource timeline with rolling months and drops from your lists; slot selection, drag and keyboard rescheduling, time zones |
| [Pane layout](pane-layout.md)   | `PaneLayout`                                          | Panels in a JSON tree of splits and stacks: move without remounting, tabs or none, stacks floating over the primary panel, a phone form, and `whenHidden` for panels that must keep running |
| [Sheet](sheet.md)               | `Sheet`                                               | Panes from a screen edge: bottom-sheet snap points with a keyboard handle, non-modal sheets beside a usable page, nested sheets that stack |
| [On-screen keyboard](on-screen-keyboard.md) | `OnScreenKeyboard`, `KeyboardDrawer`, `KeyboardPopover`, `OnScreenKeyboardProvider` | Kiosks, TVs and touch screens: the alphabet grid for a remote, typing layouts for major scripts, number pads, a drawer or popover linked to any input |
| [Sidebar](sidebar.md)           | `Sidebar`, `SidebarProvider`, `SidebarInset`, `SidebarTrigger` | A docked navigation or details pane for any layout: off canvas or an icon strip with tooltips and flyouts, resizable, remembered without a flash, ⌘B, a sheet on phones |
| [Media player](media-player.md)  | `VideoPlayer`, `AudioPlayer`, `useMediaPlayer`        | Video in the page, maximised, a mini player, full screen and picture-in-picture on one media element, with audio, casting hooks and stream engines |
