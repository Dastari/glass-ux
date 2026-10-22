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

Every managed window offers Pop out and Full screen in its app bar; a window kind turns
either off with `popout: false` or `fullscreen: false`. Full screen puts the window's frame
in full screen with the browser's Fullscreen API: the app bar and status bar go, the body
fills the screen and popups open inside it. Content reads `useWindow().fullscreen` to draw
its own floating tools (and, for a remote session, to lock the keyboard), and
`useWindow().exitFullscreen()` offers a way out besides Esc. Your own portals can follow it
with `container={popupContainer()}`.

Persist only when the product calls for it. `windowStorageKey(userId, namespace)` gives
the host control over both application and user scope. Pop-out works without storage too:
give the manager a `channelName` (per tab, if each tab has its own windows) and a
`popoutUrl`, and the pop-out route's manager (`role: "popout"`, same channel) asks the
workspace for its windows when it connects. Restore through the registry so
unknown window types can be handled deliberately after upgrades.

The [workspace demo](https://dastari.github.io/glass-ux/components/workspace/) and individual
window component pages include complete examples and API tables. The TypeDoc reference
also lists store operations, registry contracts, geometry helpers and descriptor types.
