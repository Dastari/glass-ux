import type { ReactElement, ReactNode } from "react";
import { IconDashboard, IconFolder, IconInbox, IconList, IconSettings } from "../../icons/generated/icons.js";
import { AccountButton, AppShell, Rail, ShellBrand, TabBar, TopBar } from "../../shell/index.js";
import { Breadcrumb } from "../../ui/breadcrumb/index.js";

const PLACES = [
  { id: "overview", label: "Overview", icon: <IconDashboard /> },
  { id: "records", label: "Projects", icon: <IconList /> },
  { id: "inbox", label: "Inbox", icon: <IconInbox /> },
  { id: "files", label: "Files", icon: <IconFolder /> },
];
const SETTINGS = { id: "settings", label: "Settings", icon: <IconSettings /> };

/**
 * The application frame around a screen: rail, top bar and phone tab bar. The breadcrumb names
 * the route, so a screen starts with its content. `link` gives each place your router's link.
 */
export default function ApplicationShell({
  current,
  link,
  children,
}: {
  /** The id of the place on screen. */
  current: string;
  /** A link element for a place: `(id) => <Link to={`/${id}`} />`. */
  link: (id: string) => ReactElement;
  /** The screen. */
  children: ReactNode;
}) {
  const here = [...PLACES, SETTINGS].find((place) => place.id === current);
  return (
    <AppShell
      brand={<ShellBrand label="Cedar Studio" render={link(PLACES[0]!.id)} />}
      rail={
        <Rail.Root aria-label="Main">
          {PLACES.map((place) => (
            <Rail.Item key={place.id} icon={place.icon} label={place.label} active={place.id === current} render={link(place.id)} />
          ))}
          <Rail.Spacer />
          <Rail.Item icon={SETTINGS.icon} label={SETTINGS.label} active={SETTINGS.id === current} render={link(SETTINGS.id)} />
        </Rail.Root>
      }
      topBar={
        <TopBar
          breadcrumb={<Breadcrumb aria-label="Location" items={[{ id: "home", label: "Cedar Studio", href: "#" }, { id: current, label: here?.label ?? "" }]} />}
          account={<AccountButton name="Avery Quinn" email="avery.quinn@example.com" />}
        />
      }
      tabBar={
        <TabBar.Root aria-label="Main">
          {[...PLACES, SETTINGS].map((place) => (
            <TabBar.Item key={place.id} icon={place.icon} label={place.label} active={place.id === current} render={link(place.id)} />
          ))}
        </TabBar.Root>
      }
    >
      {children}
    </AppShell>
  );
}
