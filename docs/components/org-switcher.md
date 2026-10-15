# Organisation switcher

Use `OrgSwitcher` from `glass-ux/shell` in `TopBar.scope`. It reports a selected ID or
`null` for All organisations; the host owns URLs, authorization and actual data scoping.
`OrgSwitcherPanel` renders the same picker inline. Use `RouteBreadcrumb.scope` to open
the controlled switcher from the folded phone breadcrumb.

## Complete local directory

Supply the complete authorized `organisations` hierarchy. Local search ranks names,
initials and keywords; real `parentId` links establish descendants and the `+N` label.
Omit parent links when they are unavailable. Never infer them from names or counts.

## Bounded server directory

Supply `remote` and pass only the loaded server results as `organisations`. The picker
preserves server order and matches, ignores `parentId` and `recent`, and reports no
descendant counts. It does not search a partial page as if it were the full directory.

```tsx
<OrgSwitcher
  organisations={page.items}
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
`hasNextPage` is a continuation fact, not a result count. The component hides organisation
options while loading or after an error, displays skeletons or the error with Retry,
and disables Load more until the read succeeds. All organisations remains an explicit choice.

Provide `remote.selected` when the current identity is outside the loaded results. Its
`id` must equal `value`; a mismatched identity is ignored. An unresolved non-null ID says
Organisation unavailable, never All organisations. This identity is display information,
not authorization. Clear private identities and results when the authenticated session
or permissions change. The library does not retain remote results or scope in storage.

The search is controlled and is retained when the picker closes. The host may clear it
from `onOpenChange` if desired. Local mode retains its existing clear-on-close behaviour.
Persisted recents are optional in local mode; `useRecentOrganisations` uses browser storage
and therefore requires an application-owned, appropriately isolated storage namespace.

## Keyboard and responsive behaviour

Type to search, use arrow keys and Enter to choose, and Escape to close. Tab reaches the
retry and continuation buttons. On phones the same picker opens in a bottom sheet; focus
returns to its trigger after closing. Loading, errors and loaded-result announcements
are exposed to assistive technology. The host still decides which views can actually
honour the chosen organisation scope.
