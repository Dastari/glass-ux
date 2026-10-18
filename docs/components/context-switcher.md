# Context switcher

Use `ContextSwitcher` from `glass-ux/shell` in `TopBar.scope` for the context people work
in: an organisation, a project, a workspace. It reports a selected ID, or `null` for the
"all" scope. The host owns URLs, authorization and actual data scoping.
`ContextSwitcherPanel` renders the same picker inline. Use `RouteBreadcrumb.scope` to open
the controlled switcher from the folded phone breadcrumb.

## Naming the context

The default words are for organisations. For anything else, build every visible and
announced word from the noun with `switcherLabels`, and pass `all={false}` when there is no
"all" scope:

```tsx
const PROJECT_LABELS = switcherLabels({ one: "project", other: "projects" });

<ContextSwitcher
  items={projects}
  value={projectId}
  onValueChange={openProject}
  labels={PROJECT_LABELS}
  all={false}
  icon={<IconFolder />}
/>
```

`switcherLabels` gives "All projects", "Find a project", "Search projects", the trigger's
accessible name "Project: Atlas redesign" and the rest. Spread it to override one label,
or pass `article` for an irregular noun. Without an "all" row, `null` means nothing is
chosen yet and the trigger reads "Choose a project". `icon` is the glyph for the "all"
scope and for nothing chosen. Each item can carry its own `icon`, which sits on its tint in
place of the initials; `avatarSrc` takes precedence over both. Keep one recent list per
kind of context: `useRecentContexts("acme.recent-projects")`.

## Complete local directory

Supply the complete authorized `items` hierarchy. Local search ranks names,
initials and keywords; real `parentId` links establish descendants and the `+N` label.
Omit parent links when they are unavailable. Never infer them from names or counts.

## Bounded server directory

Supply `remote` and pass only the loaded server results as `items`. The picker
preserves server order and matches, ignores `parentId` and `recent`, and reports no
descendant counts. It does not search a partial page as if it were the full directory.

```tsx
<ContextSwitcher
  items={page.items}
  value={organisationId}
  onValueChange={navigateToOrganisation}
  remote={{
    query,
    onQueryChange: searchDirectory,
    loading: page.loading,
    error: page.error,
    onRetry: retryDirectory,
    hasNextPage: page.hasNextPage,
    onLoadMore: loadNextPage,
    selected: selectedOrganisation,
    status: "Registered organisations",
  }}
/>
```

The host debounces search, aborts or discards stale responses, resets opaque cursors
when the query changes, and appends each explicitly requested next page with unique IDs.
`hasNextPage` is a continuation fact, not a result count. The component hides the loaded
options while loading or after an error, displays skeletons or the error with Retry,
and disables Load more until the read succeeds. The "all" row remains an explicit choice
unless `all` is false.

Provide `remote.selected` when the current identity is outside the loaded results. Its
`id` must equal `value`; a mismatched identity is ignored. An unresolved non-null ID says
`labels.missing` ("Organisation unavailable"), never the "all" label. This identity is
display information, not authorization. Clear private identities and results when the
authenticated session or permissions change. The library does not retain remote results or scope in storage.

The search is controlled and is retained when the picker closes. The host may clear it
from `onOpenChange` if desired. Local mode retains its existing clear-on-close behaviour.
Persisted recents are optional in local mode; `useRecentContexts` uses browser storage
and therefore requires an application-owned, appropriately isolated storage namespace.

## Keyboard and responsive behaviour

Type to search, use arrow keys and Enter to choose, and Escape to close. Tab reaches the
retry and continuation buttons. On phones the same picker opens in a bottom sheet; focus
returns to its trigger after closing. Loading, errors and loaded-result announcements
are exposed to assistive technology. The host still decides which views can actually
honour the chosen scope.
