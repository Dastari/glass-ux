# Window workspaces

`glass-ux/windows` supplies typed window descriptors, a registry, geometry and persistence,
workspace layouts, frames, docks, managed windows and pop-out coordination. Applications
supply window content and the operations it performs. Device protocols and business tools
belong to the host.

Define a stable descriptor with a window type, subject and serializable parameters, then
register the corresponding content component. Use stable identities so repeated actions
focus the existing window instead of opening duplicates. Keep credentials and live backend
objects out of persisted descriptors.

Mount the workspace inside a bounded shell. Tiled, floating and maximised layouts use the
same entries. Window frames expose status, activity, progress and standard controls;
applications render their task, editor or conversation inside those frames. A close guard
can ask the user to resolve unsaved work before the entry closes.

Persist only when the product calls for it. `windowStorageKey(userId, namespace)` gives
the host control over both application and user scope. Restore through the registry so
unknown window types can be handled deliberately after upgrades.

The [workspace demo](https://dastari.github.io/glass-ux/components/workspace/) and individual
window component pages include complete examples and API tables. The TypeDoc reference
also lists store operations, registry contracts, geometry helpers and descriptor types.
