# Breadcrumb

`glass-ux/breadcrumb` · [Live component catalogue](https://dastari.github.io/glass-ux/)

`useDemoCrumbs` in `navigation.tsx`).

The universal breadcrumb (R6.4): one line at `--control-h-sm`, every crumb navigates, and a crumb
with siblings carries a switcher (searchable past seven). `RouteBreadcrumb` renders `link`
targets as router links; the core `Breadcrumb` is router-agnostic.

```tsx
<RouteBreadcrumb
  items={crumbs}
  // Only shown when the top bar folds its context into the trail (phones):
  header={<Segmented block size="sm" aria-label="Module" … />}
  scope={{ label: "Northstar Studio", icon: <OrgAvatar … />, "aria-label": "Organisation: …. Switch organisation", onSelect: openSwitcher }}
/>
```

## Collapse

Measured against its own width (`collapseCrumbs`, unit-tested), `data-mode` is:

| Mode      | Shows                                                                                         |
| --------- | --------------------------------------------------------------------------------------------- |
| `full`    | every crumb                                                                                   |
| `middle`  | first › … › the longest tail that fits; the ellipsis menu holds the rest                      |
| `compact` | … ‹ parent · current                                                                          |
| `current` | only the current place, with its icon, as one button with a chevron. It opens the trail popup |

`current` is chosen when even `compact` cannot show the current crumb and a readable parent
(`BREADCRUMB_BACK_MIN`, 56px). A host can force it with `collapse="current"`, or through
`BreadcrumbFoldContext`.

## The trail popup

The popup lists the trail as an indented tree, root first:

- Every level is a link, or a callback for `onSelect` crumbs. The current place is marked with
  `aria-current="page"` and does not navigate.
- A level with siblings carries a trailing **Switch** button with the same switcher menu as in
  the bar, named by `siblingsLabel` ("Switch device").
- Going somewhere (a level, a sibling, a module) closes the popup.
- It is a non-modal Base UI popover. Esc and an outside press close it, and focus returns to
  the button.

**Folded by a host.** The top bar sets `BreadcrumbFoldContext` (`{ folded, anchor }`) under
34rem. The breadcrumb then:

- shows `current`;
- puts `header` (the module switch, in full) and `scope` (the organisation) above the trail;
- drops the popup from the `anchor` (the bar) at its full width, like a sheet from the top.

Choosing the scope row closes the popup and then calls `scope.onSelect`, so the host's switcher
(a bottom sheet on a phone) opens with focus history intact. Without a host, `header` and
`scope` are not shown, because the bar still has them.

**Parts:** `Breadcrumb`, `RouteBreadcrumb`, `BreadcrumbFoldContext`, `collapseCrumbs`,
`BREADCRUMB_BACK_MIN`, `BREADCRUMB_SEARCH_THRESHOLD`, `Crumb`, `CrumbSibling`, `BreadcrumbScope`.
