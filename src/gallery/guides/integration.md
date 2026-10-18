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
| Local palette dropdown                                 | `SwatchPicker` and the appearance runtime                     |
| Browser tooltip on truncated text                      | `TruncatedText` or `Tooltip`                                  |
| Repeated clipboard handler                             | `CopyButton`                                                  |
| Assistant UI tied directly to backend rows             | Typed view models, entity resolvers and conversation handlers |

An application-owned palette is CSS containing the named `data-palette` selector and the
palette parameters. Register its identifier and label with `definePalette(id, label)`, then
use it in `configureAppearance`. Use a project storage key to retain existing preferences.
Configure product marks with `configureBrand`; the library ships no application logos.

When replacing local components, remove their duplicate implementation after the packaged
version passes the application's checks. Keep application-specific components and compose
them from Glass UX. A release dependency and lockfile should identify the exact archive used.

To embed the shared documentation, import `componentCatalogue`, `ComponentDocumentation`
and `sections` from `glass-ux/gallery`, plus `glass-ux/gallery/styles.css`. Combine them with
your own component registry; the library's fixtures remain fictional and your product's
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
