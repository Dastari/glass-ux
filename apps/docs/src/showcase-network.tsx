import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { BrandMark } from "glass-ux/brand";
import { Button } from "glass-ux/button";
import { Badge } from "glass-ux/badge";
import { ToneDot } from "glass-ux/tone-dot";
import { Avatar } from "glass-ux/avatar";
import { Breadcrumb } from "glass-ux/breadcrumb";
import { Dialog } from "glass-ux/dialog";
import { FactList } from "glass-ux/fact-list";
import { SearchField } from "glass-ux/input";
import { Menu } from "glass-ux/menu";
import { RichTextInput } from "glass-ux/rich-text";
import { AccountButton, Rail, SearchTrigger, TopBar } from "glass-ux/shell";
import { Panel, PanelBody, PanelHeader, Surface } from "glass-ux/surface";
import {
  GeoMap,
  MapStatusSummary,
  countStatuses,
  useMapRegion,
  type MapPoint,
  type MapStatus,
} from "glass-ux/map";
import { DEMO_MAP_CONFIG } from "glass-ux/gallery/fixtures/map";
import {
  Window,
  WindowFrame,
  WindowManagerProvider,
  Workspace,
  createWindowManager,
  registerWindowKind,
  useWindowManager,
  type WindowContentProps,
} from "glass-ux/windows";
import {
  IconActivity,
  IconCheck,
  IconEndpoint,
  IconFileText,
  IconGrid,
  IconMapPin,
  IconNetwork,
  IconWarning,
  IconRefresh,
} from "glass-ux/icons";
import { studioPortrait } from "./showcase-data";
import "./showcase-network.css";

type SiteData = {
  town: string;
  devices: number;
  online: number;
  latency: number;
};
const SITES: MapPoint<SiteData>[] = [
  {
    id: "quay",
    label: "Meridian Quay",
    lat: -42.882,
    lng: 147.327,
    status: "healthy",
    data: { town: "Hobart", devices: 28, online: 28, latency: 18 },
  },
  {
    id: "north",
    label: "Northbank Studio",
    lat: -41.438,
    lng: 147.134,
    status: "warning",
    data: { town: "Launceston", devices: 24, online: 22, latency: 64 },
  },
  {
    id: "cedar",
    label: "Cedar Works",
    lat: -41.18,
    lng: 146.35,
    status: "healthy",
    data: { town: "Devonport", devices: 18, online: 18, latency: 22 },
  },
  {
    id: "west",
    label: "Westhaven Office",
    lat: -41.055,
    lng: 145.904,
    status: "danger",
    data: { town: "Burnie", devices: 16, online: 11, latency: 148 },
  },
  {
    id: "harbor",
    label: "Harbor Workshop",
    lat: -41.009,
    lng: 145.728,
    status: "healthy",
    data: { town: "Wynyard", devices: 12, online: 12, latency: 24 },
  },
  {
    id: "east",
    label: "East Coast Lab",
    lat: -41.322,
    lng: 148.25,
    status: "healthy",
    data: { town: "St Helens", devices: 9, online: 9, latency: 28 },
  },
  {
    id: "field",
    label: "Field House",
    lat: -41.928,
    lng: 147.492,
    status: "unknown",
    data: { town: "Campbell Town", devices: 8, online: 0, latency: 0 },
  },
  {
    id: "grove",
    label: "Grove Library",
    lat: -42.78,
    lng: 147.06,
    status: "healthy",
    data: { town: "New Norfolk", devices: 14, online: 14, latency: 20 },
  },
  {
    id: "tide",
    label: "Tideline Office",
    lat: -42.126,
    lng: 148.072,
    status: "warning",
    data: { town: "Swansea", devices: 11, online: 10, latency: 76 },
  },
  {
    id: "south",
    label: "Southbank Archive",
    lat: -43.031,
    lng: 147.046,
    status: "healthy",
    data: { town: "Huonville", devices: 10, online: 10, latency: 26 },
  },
  {
    id: "lake",
    label: "Lakeside Station",
    lat: -42.113,
    lng: 146.494,
    status: "healthy",
    data: { town: "Tarraleah", devices: 7, online: 7, latency: 32 },
  },
  {
    id: "ridge",
    label: "Ridge Observatory",
    lat: -42.083,
    lng: 145.556,
    status: "healthy",
    data: { town: "Queenstown", devices: 13, online: 13, latency: 31 },
  },
];
const NOTES =
  "## Network review\n\n**Meridian regional network** · weekly operations\n\n- Review the uplink at **Westhaven Office**.\n- Confirm the backup schedule at Northbank Studio.\n- Contact Field House about the offline gateway.\n\n> Next review: Thursday, 10:00 am.\n\n[Open the component documentation](https://dastari.github.io/glass-ux/components/rich-text-input/)";
const EVENTS = [
  {
    id: "uplink",
    title: "Uplink latency above 100 ms",
    site: "west",
    detail: "148 ms · gateway-01",
    warning: true,
  },
  {
    id: "backup",
    title: "Backup completed",
    site: "quay",
    detail: "28 devices · 1.4 GB",
    warning: false,
  },
  {
    id: "offline",
    title: "Gateway offline",
    site: "field",
    detail: "Last seen 12 minutes ago",
    warning: true,
  },
  {
    id: "agent",
    title: "Agent update completed",
    site: "cedar",
    detail: "18 devices · version 6.8.1",
    warning: false,
  },
];
const NetworkData = createContext({
  notes: NOTES,
  setNotes: (_value: string) => {},
  acknowledged: false,
  acknowledge: () => {},
});
const statusLabel = (status: string) =>
  ({
    healthy: "Healthy",
    warning: "Warning",
    danger: "Critical",
    unknown: "Offline",
  })[status] ?? status;
const statusTone = (status: MapStatus) =>
  status === "healthy" ? "success" : status === "unknown" ? "neutral" : status;

function SiteRows({ query = "" }: { query?: string }) {
  const manager = useWindowManager();
  const sites = SITES.filter((site) =>
    `${site.label} ${site.data.town}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <ul className="network-site-list" aria-label="Network sites">
      {sites.map((site) => (
        <li key={site.id}>
          <Button
            variant="ghost"
            block
            onClick={() =>
              manager.open({ kind: "showcase.site", params: { site: site.id } })
            }
          >
            <ToneDot tone={statusTone(site.status)} />
            <span className="network-row-text">
              <span>{site.label}</span>
              <span className="type-caption text-fg-muted">
                {site.data.town} · {site.data.online}/{site.data.devices}{" "}
                devices online
              </span>
            </span>
            <span className="network-row-meta type-caption">
              {statusLabel(site.status)}
            </span>
          </Button>
        </li>
      ))}
      {!sites.length ? (
        <li className="network-empty">No sites match “{query}”.</li>
      ) : null}
    </ul>
  );
}

function EventRows() {
  const manager = useWindowManager();
  const { acknowledged, acknowledge } = useContext(NetworkData);
  return (
    <ul className="network-events" aria-label="Network events">
      {EVENTS.map((event) => (
        <li key={event.id}>
          <span className={event.warning ? "text-warning" : "text-success"}>
            {event.warning ? <IconWarning /> : <IconCheck />}
          </span>
          <div className="network-row-text">
            <p className="type-label">{event.title}</p>
            <button
              type="button"
              className="network-entity-link"
              onClick={() =>
                manager.open({
                  kind: "showcase.site",
                  params: { site: event.site },
                })
              }
            >
              {SITES.find((site) => site.id === event.site)?.label}
            </button>
            <p className="type-caption text-fg-muted">{event.detail}</p>
          </div>
        </li>
      ))}
      <li>
        <Button
          size="sm"
          variant="secondary"
          icon={<IconCheck />}
          onClick={acknowledge}
          disabled={acknowledged}
        >
          {acknowledged ? "Alerts acknowledged" : "Acknowledge alerts"}
        </Button>
      </li>
    </ul>
  );
}

function OverviewWindow() {
  const { acknowledged } = useContext(NetworkData);
  const online = SITES.reduce((sum, site) => sum + site.data.online, 0);
  return (
    <>
      <Window.Body>
        <div className="network-overview">
          <Panel>
            <PanelHeader
              title="Status"
              level={3}
              description={`${SITES.length} sites · sample data`}
            />
            <PanelBody>
              <FactList
                className="network-summary-facts"
                facts={[
                  { label: "Devices online", value: online },
                  { label: "Need attention", value: acknowledged ? 0 : 3 },
                  {
                    label: "Offline devices",
                    value: SITES.reduce(
                      (sum, site) => sum + site.data.devices - site.data.online,
                      0,
                    ),
                  },
                ]}
              />
              <MapStatusSummary counts={countStatuses(SITES)} />
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Recent events" level={3} />
            <PanelBody>
              <EventRows />
            </PanelBody>
          </Panel>
        </div>
      </Window.Body>
      <Window.Status indicator={{ tone: "success", label: "Local demo" }}>
        <Window.StatusItem tone="success">Local demo</Window.StatusItem>
        <Window.StatusMeta>Tasmania, Australia</Window.StatusMeta>
      </Window.Status>
    </>
  );
}

function SiteWindow({ params }: WindowContentProps) {
  const site = SITES.find((item) => item.id === params.site) ?? SITES[0]!;
  return (
    <>
      <Window.Body>
        <div className="network-overview">
          <Badge tone={statusTone(site.status)}>
            {statusLabel(site.status)}
          </Badge>
          <FactList
            facts={[
              { label: "Locality", value: site.data.town },
              {
                label: "Devices online",
                value: `${site.data.online} of ${site.data.devices}`,
              },
              {
                label: "Uplink latency",
                value: site.data.latency
                  ? `${site.data.latency} ms`
                  : "Unavailable",
              },
              { label: "Gateway", value: `${site.id}-gateway-01` },
            ]}
          />
          <Panel>
            <PanelHeader title="Site contact" level={3} />
            <PanelBody>
              <div className="showcase-person">
                <Avatar
                  name="Avery Quinn"
                  src={studioPortrait("Avery Quinn")}
                  decorative
                />
                <div>
                  <p className="type-label">Avery Quinn</p>
                  <p className="type-caption text-fg-muted">Operations lead</p>
                </div>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </Window.Body>
      <Window.Status>
        <Window.StatusItem>Sample site</Window.StatusItem>
        <Window.StatusMeta>{site.data.town}</Window.StatusMeta>
      </Window.Status>
    </>
  );
}

function NotesWindow() {
  const { notes, setNotes } = useContext(NetworkData);
  return (
    <>
      <Window.Actions>
        <Button
          size="sm"
          variant="ghost"
          icon={<IconRefresh />}
          aria-label="Reset notes"
          onClick={() => setNotes(NOTES)}
        />
      </Window.Actions>
      <Window.Body>
        <RichTextInput
          aria-label="Network review notes"
          value={notes}
          onValueChange={setNotes}
          minHeight={240}
          maxHeight={440}
          resize={false}
        />
      </Window.Body>
      <Window.Status>
        <Window.StatusItem>Stored in browser memory</Window.StatusItem>
        <Window.StatusMeta>{notes.length} characters</Window.StatusMeta>
      </Window.Status>
    </>
  );
}

registerWindowKind({
  kind: "showcase.overview",
  title: () => "Network overview",
  icon: IconGrid,
  key: () => "showcase.overview",
  size: { w: 350, h: 490 },
  minSize: { w: 280, h: 240 },
  popout: false,
  load: async () => ({ default: OverviewWindow }),
});
registerWindowKind({
  kind: "showcase.site",
  title: (params) =>
    SITES.find((site) => site.id === params.site)?.label ?? "Site details",
  subtitle: (params) =>
    SITES.find((site) => site.id === params.site)?.data.town,
  icon: IconEndpoint,
  key: (params) => `showcase.site.${params.site}`,
  size: { w: 380, h: 420 },
  minSize: { w: 280, h: 230 },
  popout: false,
  load: async () => ({ default: SiteWindow }),
});
registerWindowKind({
  kind: "showcase.notes",
  title: () => "Network review notes",
  icon: IconFileText,
  key: () => "showcase.notes",
  size: { w: 600, h: 500 },
  minSize: { w: 280, h: 260 },
  popout: false,
  load: async () => ({ default: NotesWindow }),
});

export function NetworkWorkspace() {
  const [manager] = useState(() =>
    createWindowManager({
      storageKey: null,
      channelName: null,
      defaultLayout: () => "floating",
    }),
  );
  const [view, setView] = useState<"map" | "sites" | "events">("map");
  const [notes, setNotes] = useState(NOTES);
  const [acknowledged, setAcknowledged] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const account = useRef<HTMLButtonElement>(null);
  const closeProfile = useRef<HTMLButtonElement>(null);
  const home = useMapRegion(DEMO_MAP_CONFIG, "AU-TAS");
  useLayoutEffect(() => {
    const width = root.current?.clientWidth ?? 0;
    if (width < 900) return;
    manager.setWorkspaceSize(width - 64, 570);
    const id = manager.open({ kind: "showcase.overview" });
    manager.float(id, { x: width - 64 - 366, y: 8, w: 350, h: 490 });
  }, [manager]);
  const open = (kind: string) => manager.open({ kind });
  return (
    <section
      className="showcase-section"
      aria-labelledby="network-title"
      id="network"
    >
      <div className="showcase-section-heading">
        <h2 id="network-title">Network workspace</h2>
        <span className="type-caption text-fg-muted">
          12 sites · Tasmania, Australia
        </span>
      </div>
      <NetworkData
        value={{
          notes,
          setNotes,
          acknowledged,
          acknowledge: () => setAcknowledged(true),
        }}
      >
        <WindowManagerProvider manager={manager}>
          <Surface
            ref={root}
            material="chrome"
            padding="none"
            className="network-shell canvas-ambient"
            data-testid="network-workspace"
          >
            <TopBar
              module={
                <Button
                  variant="ghost"
                  icon={<BrandMark mark="product" />}
                  aria-label="Network home"
                  onClick={() => {
                    setView("map");
                    manager.focus("primary");
                  }}
                />
              }
              breadcrumb={
                <Breadcrumb
                  aria-label="Network breadcrumb"
                  items={[
                    {
                      id: "network",
                      label: "Meridian network",
                      icon: <IconNetwork />,
                      onSelect: () => setView("map"),
                    },
                    {
                      id: view,
                      label:
                        view === "map"
                          ? "Map"
                          : view === "sites"
                            ? "Sites"
                            : "Events",
                      siblings: [
                        {
                          id: "map",
                          label: "Map",
                          onSelect: () => setView("map"),
                        },
                        {
                          id: "sites",
                          label: "Sites",
                          onSelect: () => setView("sites"),
                        },
                        {
                          id: "events",
                          label: "Events",
                          onSelect: () => setView("events"),
                        },
                      ],
                    },
                  ]}
                />
              }
              search={
                <SearchTrigger
                  placeholder="Search sites…"
                  onOpen={() => setSearchOpen(true)}
                />
              }
              account={
                <Menu.Root>
                  <Menu.Trigger
                    render={
                      <AccountButton
                        ref={account}
                        name="Avery Quinn"
                        email="avery@example.com"
                        avatarSrc={studioPortrait("Avery Quinn")}
                      />
                    }
                  />
                  <Menu.Popup finalFocus={profileOpen ? false : account}>
                    <Menu.Item onClick={() => setProfileOpen(true)}>
                      Profile
                    </Menu.Item>
                    <Menu.Item onClick={() => open("showcase.notes")}>
                      Network notes
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Root>
              }
            />
            <div className="network-body">
              <Rail.Root aria-label="Network navigation">
                <Rail.Item
                  icon={<IconMapPin />}
                  label="Map"
                  active={view === "map"}
                  onClick={() => setView("map")}
                />
                <Rail.Item
                  icon={<IconEndpoint />}
                  label="Sites"
                  active={view === "sites"}
                  onClick={() => setView("sites")}
                />
                <Rail.Item
                  icon={<IconActivity />}
                  label="Events"
                  active={view === "events"}
                  onClick={() => setView("events")}
                />
                <Rail.Spacer />
                <Rail.Item
                  icon={<IconFileText />}
                  label="Network notes"
                  onClick={() => open("showcase.notes")}
                />
              </Rail.Root>
              <div className="network-workspace-column">
                <div className="network-tools">
                  <div className="network-window-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<IconGrid />}
                      onClick={() => open("showcase.overview")}
                    >
                      Overview
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<IconFileText />}
                      onClick={() => open("showcase.notes")}
                    >
                      Notes
                    </Button>
                  </div>
                </div>
                <Workspace
                  className="network-windows"
                  primaryLabel="Regional network"
                  primary={
                    <>
                      <WindowFrame.Body
                        variant={view === "map" ? "fill" : "scroll"}
                      >
                        {view === "map" ? (
                          <GeoMap
                            label="Meridian network sites"
                            config={DEMO_MAP_CONFIG}
                            home={home}
                            points={SITES}
                            selectedId={selected}
                            onSelect={(point) => setSelected(point?.id ?? null)}
                            noun={{ one: "site", other: "sites" }}
                            renderPopup={(point) => (
                              <div className="network-map-popup">
                                <p className="type-label">{point.label}</p>
                                <p className="type-caption text-fg-muted">
                                  {point.data.town} · {point.data.online}/
                                  {point.data.devices} devices online
                                </p>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() =>
                                    manager.open({
                                      kind: "showcase.site",
                                      params: { site: point.id },
                                    })
                                  }
                                >
                                  Open site
                                </Button>
                              </div>
                            )}
                          />
                        ) : view === "sites" ? (
                          <SiteRows />
                        ) : (
                          <EventRows />
                        )}
                      </WindowFrame.Body>
                      <WindowFrame.StatusBar>
                        <WindowFrame.StatusItem tone="success">
                          Local demo
                        </WindowFrame.StatusItem>
                        <WindowFrame.StatusMeta>
                          {SITES.length} sites ·{" "}
                          {SITES.reduce(
                            (sum, site) => sum + site.data.devices,
                            0,
                          )}{" "}
                          devices
                        </WindowFrame.StatusMeta>
                      </WindowFrame.StatusBar>
                    </>
                  }
                />
              </div>
            </div>
            <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
              <Dialog.Popup size="sm">
                <Dialog.Header title="Search network" />
                <Dialog.Body>
                  <SearchField
                    autoFocus
                    aria-label="Search network sites"
                    placeholder="Site or locality"
                    value={query}
                    onValueChange={setQuery}
                  />
                  <div className="network-search-results">
                    <ul>
                      {SITES.filter((site) =>
                        `${site.label} ${site.data.town}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      ).map((site) => (
                        <li key={site.id}>
                          <Button
                            variant="ghost"
                            block
                            icon={<IconMapPin />}
                            onClick={() => {
                              setSearchOpen(false);
                              manager.open({
                                kind: "showcase.site",
                                params: { site: site.id },
                              });
                            }}
                          >
                            {site.label}
                            <span className="type-caption text-fg-muted">
                              {site.data.town}
                            </span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Dialog.Body>
                <Dialog.Footer>
                  <Button onClick={() => setSearchOpen(false)}>
                    Close search
                  </Button>
                </Dialog.Footer>
              </Dialog.Popup>
            </Dialog.Root>
            <Dialog.Root open={profileOpen} onOpenChange={setProfileOpen}>
              <Dialog.Popup
                size="sm"
                initialFocus={closeProfile}
                finalFocus={account}
              >
                <Dialog.Header
                  title="Avery Quinn"
                  subtitle="avery@example.com"
                />
                <Dialog.Body>
                  <div className="showcase-person">
                    <Avatar
                      name="Avery Quinn"
                      src={studioPortrait("Avery Quinn")}
                    />
                    <FactList
                      facts={[
                        { label: "Role", value: "Operations lead" },
                        { label: "Workspace", value: "Meridian network" },
                      ]}
                    />
                  </div>
                </Dialog.Body>
                <Dialog.Footer>
                  <Button
                    ref={closeProfile}
                    onClick={() => setProfileOpen(false)}
                  >
                    Close profile
                  </Button>
                </Dialog.Footer>
              </Dialog.Popup>
            </Dialog.Root>
          </Surface>
        </WindowManagerProvider>
      </NetworkData>
    </section>
  );
}
