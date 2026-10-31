# Integrate into an existing application

Keep the application's router, identity, authentication, GraphQL client and data services.
Adopt Glass UX through its public imports and replace one coherent screen at a time.
Read [the theme and layout contract](layout-contract.md) before composing the first screen.

| Existing pattern                                       | Glass UX primitive                                            |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| Action button with asynchronous feedback               | `ActionButton`                                                |
| Ad hoc modal                                           | `Dialog` or `AlertDialog`                                     |
| Form control plus separate error markup                | `Field`, a typed bound field and its schema helper            |
| Entity name, icon and action menu assembled repeatedly | `EntityIdentity` and a shared `ActionSet`                     |
| Interactive table                                      | `DataTable`, typed columns, filters and a host data adapter   |
| Built-in interface wording and translations             | `glass-ux/i18n`, `glass-ux/i18n/<tag>` and `LocaleProvider` (purpose keys such as `dataTable.noRows`)     |
| Local palette dropdown                                 | `SwatchPicker` and the appearance runtime                     |
| Browser tooltip on truncated text                      | `TruncatedText` or `Tooltip`                                  |
| Repeated clipboard handler                             | `CopyButton`                                                  |
| Assistant UI tied directly to backend rows             | Typed view models, entity resolvers and conversation handlers |

An application-owned palette is CSS containing the named `data-palette` selector and the
palette parameters. Register its identifier and label with `definePalette(id, label)`, then
use it in `configureAppearance`. A brand colour without a full palette can be a default
instead: `configureAppearance({ defaults: { accentColor: "#0b6e4f" } })`, adjusted for
contrast like any custom colour. `defineBackground(id, label)` registers an
application-owned canvas, and `backgroundImage` with `background: "image"` shows a
company picture behind the glass (see [the layout contract](layout-contract.md#css-names-and-verification)). Use a project storage key to retain existing preferences.
Configure product marks with `configureBrand`; the library ships no application logos.

Components format with the page's `<html lang>`, or with `configureLocale()` from
`glass-ux/locale` when the application sets one; see
[Set the formatting locale](getting-started.md#set-the-formatting-locale). A page without
`lang` or a configured locale formats as `en-US`. Wrap a region in `LocaleProvider` when it
must format differently, such as a customer's invoice.

Single-character keyboard shortcuts (the rail's "g e" sequences, a palette command whose
shortcut is a bare `c` or `?`, a document-wide `useHotkeys("g")`) run from anywhere on the
page. To let people turn them off (WCAG 2.1.4), call `configureShortcuts({ characterKeys:
false })` from `glass-ux/kbd`, for instance from a preference in your settings page; the
default keeps them on. Their key hints leave the tooltips, menus and palette while off.
Shortcuts with Ctrl, Alt or Command, and keys that act only inside the widget that has
focus, are not affected.

When replacing local components, remove their duplicate implementation after the packaged
version passes the application's checks. Keep application-specific components and compose
them from Glass UX. A release dependency and lockfile should identify the exact archive used.

The component catalogue is not part of the package. Link to the
[documentation site](https://dastari.github.io/glass-ux/), or host the `glass-ux-docs.tar.gz`
asset from the same release, where an application needs it offline. Your product's own
examples remain application-owned.

## Document layout defaults

The shared styles set document typography, colours and viewport scrolling defaults for
workspace applications. If the host is a document or marketing site that scrolls the whole
page, keep the component styles and override the document defaults in the host stylesheet:

```css
@layer base {
  html {
    height: auto;
    overflow: auto;
  }
  body {
    height: auto;
    overflow: visible;
  }
}
```

Import this override after the library styles. The host continues to own page width, layout
and scrolling; library documentation uses a centered document and its own scrolling region.

## Scrolling regions

Give each scrolling region one owner. A fill `DataTable` (the default), a scrolling `Panel`
and a window body scroll inside themselves and need a parent with a definite height; flex and
grid ancestors on the way need `min-height: 0` or a `minmax(0, 1fr)` track. Put a table in
a pane that already scrolls with `height="auto"`, so the pane scrolls it. Leave `wheel` events
to the browser on ancestors of these regions: a non-passive listener that calls
`preventDefault()` stops every scroller inside it.
