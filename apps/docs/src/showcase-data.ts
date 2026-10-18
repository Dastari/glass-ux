// Fictional fixtures for the documentation showcase. No product or backend dependencies.
import { PORTRAITS } from "glass-ux/gallery/fixtures/organisations";

/* ── Studio ────────────────────────────────────────────────────────────────── */

export type ProjectStatus = "In progress" | "In review" | "Complete";

export interface StudioProject {
  id: string;
  name: string;
  category: string;
  owner: string;
  status: ProjectStatus;
  progress: number;
  hours: number;
  /** Days from today until the next milestone (negative when overdue). */
  dueIn: number;
  team: string[];
  tags: string[];
}

export const PROJECT_STATUSES: ProjectStatus[] = [
  "In progress",
  "In review",
  "Complete",
];

export const PROJECT_CATEGORIES = [
  "Brand strategy",
  "Digital experience",
  "Editorial design",
  "Art direction",
  "Campaign design",
  "Spatial identity",
];

export const PROJECT_TAGS = [
  "Identity",
  "Print",
  "Web",
  "Signage",
  "Photography",
  "Motion",
  "Packaging",
  "Exhibition",
];

export const studioProjects: StudioProject[] = [
  {
    id: "meridian",
    name: "Meridian identity",
    category: "Brand strategy",
    owner: "Avery Quinn",
    status: "In progress",
    progress: 72,
    hours: 64,
    dueIn: 9,
    team: ["Avery Quinn", "Mira Chen"],
    tags: ["Identity", "Print", "Signage"],
  },
  {
    id: "observatory",
    name: "The Observatory",
    category: "Digital experience",
    owner: "Mira Chen",
    status: "In review",
    progress: 92,
    hours: 112,
    dueIn: 2,
    team: ["Mira Chen", "Ellis Park", "Noah Reed"],
    tags: ["Web", "Motion"],
  },
  {
    id: "fieldwork",
    name: "Fieldwork journal",
    category: "Editorial design",
    owner: "Ellis Park",
    status: "In progress",
    progress: 46,
    hours: 38,
    dueIn: 21,
    team: ["Ellis Park"],
    tags: ["Print", "Photography"],
  },
  {
    id: "cedar",
    name: "Cedar house",
    category: "Art direction",
    owner: "Noah Reed",
    status: "Complete",
    progress: 100,
    hours: 86,
    dueIn: -12,
    team: ["Noah Reed", "Avery Quinn"],
    tags: ["Photography", "Exhibition"],
  },
  {
    id: "sundial",
    name: "Sundial collection",
    category: "Campaign design",
    owner: "Mira Chen",
    status: "In progress",
    progress: 34,
    hours: 28,
    dueIn: -1,
    team: ["Mira Chen", "Noah Reed"],
    tags: ["Packaging", "Print", "Photography", "Web"],
  },
  {
    id: "morrow",
    name: "Morrow spaces",
    category: "Spatial identity",
    owner: "Avery Quinn",
    status: "In review",
    progress: 88,
    hours: 76,
    dueIn: 5,
    team: ["Avery Quinn", "Ellis Park"],
    tags: ["Signage", "Exhibition"],
  },
  {
    id: "wildflower",
    name: "Wildflower press",
    category: "Editorial design",
    owner: "Ellis Park",
    status: "Complete",
    progress: 100,
    hours: 52,
    dueIn: -30,
    team: ["Ellis Park", "Mira Chen"],
    tags: ["Print"],
  },
  {
    id: "tideline",
    name: "Tideline festival",
    category: "Campaign design",
    owner: "Noah Reed",
    status: "In progress",
    progress: 58,
    hours: 48,
    dueIn: 14,
    team: ["Noah Reed", "Avery Quinn", "Mira Chen", "Ellis Park"],
    tags: ["Motion", "Web", "Signage"],
  },
];

export const studioPeople = [
  { name: "Avery Quinn", src: PORTRAITS[1], role: "Design lead" },
  { name: "Mira Chen", src: PORTRAITS[0], role: "Digital designer" },
  { name: "Ellis Park", src: PORTRAITS[3], role: "Editorial designer" },
  { name: "Noah Reed", src: PORTRAITS[4], role: "Art director" },
];
export const studioPortrait = (name: string) =>
  studioPeople.find((person) => person.name === name)?.src;
export const weeklyHours = [28, 42, 35, 56, 48, 68, 58, 74, 65, 84, 76, 94];
export const previousHours = [20, 30, 26, 35, 32, 48, 40, 56, 46, 62, 55, 68];
export const taskNames = [
  "Review the visual direction",
  "Share the identity guidelines",
  "Prepare handover files",
  "Schedule the studio review",
];

/* ── Network workspace ─────────────────────────────────────────────────────── */

export type SiteStatus = "healthy" | "warning" | "danger" | "unknown";

export interface NetworkSite {
  id: string;
  /** Short code used for device names: WHV-GW01. */
  code: string;
  label: string;
  town: string;
  region: "North" | "North-West" | "East" | "South" | "Central";
  lat: number;
  lng: number;
  devices: number;
  online: number;
  /** Median uplink latency the site settles around, in ms. */
  baseLatency: number;
  /** Uplink capacity in Mb/s. */
  capacity: number;
  /** Typical share of the uplink in use, 0–100. */
  baseUse: number;
  gateway: string;
  contact: string;
  /** Minutes since the gateway last reported (offline sites only). */
  silentFor?: number;
}

export const networkSites: NetworkSite[] = [
  {
    id: "west",
    code: "WHV",
    label: "Westhaven Office",
    town: "Burnie",
    region: "North-West",
    lat: -41.055,
    lng: 145.904,
    devices: 16,
    online: 11,
    baseLatency: 142,
    capacity: 200,
    baseUse: 91,
    gateway: "10.40.12.1",
    contact: "Noah Reed",
  },
  {
    id: "field",
    code: "FLD",
    label: "Field House",
    town: "Campbell Town",
    region: "Central",
    lat: -41.928,
    lng: 147.492,
    devices: 8,
    online: 0,
    baseLatency: 0,
    capacity: 100,
    baseUse: 0,
    gateway: "10.40.31.1",
    contact: "Ellis Park",
    silentFor: 12,
  },
  {
    id: "north",
    code: "NBK",
    label: "Northbank Studio",
    town: "Launceston",
    region: "North",
    lat: -41.438,
    lng: 147.134,
    devices: 24,
    online: 22,
    baseLatency: 64,
    capacity: 500,
    baseUse: 72,
    gateway: "10.40.20.1",
    contact: "Mira Chen",
  },
  {
    id: "tide",
    code: "TDL",
    label: "Tideline Office",
    town: "Swansea",
    region: "East",
    lat: -42.126,
    lng: 148.072,
    devices: 11,
    online: 10,
    baseLatency: 76,
    capacity: 100,
    baseUse: 64,
    gateway: "10.40.44.1",
    contact: "Ellis Park",
  },
  {
    id: "cedar",
    code: "CDW",
    label: "Cedar Works",
    town: "Devonport",
    region: "North-West",
    lat: -41.18,
    lng: 146.35,
    devices: 18,
    online: 18,
    baseLatency: 52,
    capacity: 500,
    baseUse: 48,
    gateway: "10.40.14.1",
    contact: "Noah Reed",
  },
  {
    id: "quay",
    code: "MQY",
    label: "Meridian Quay",
    town: "Hobart",
    region: "South",
    lat: -42.882,
    lng: 147.327,
    devices: 28,
    online: 28,
    baseLatency: 18,
    capacity: 1000,
    baseUse: 38,
    gateway: "10.40.1.1",
    contact: "Avery Quinn",
  },
  {
    id: "grove",
    code: "GRV",
    label: "Grove Library",
    town: "New Norfolk",
    region: "South",
    lat: -42.78,
    lng: 147.06,
    devices: 14,
    online: 14,
    baseLatency: 21,
    capacity: 200,
    baseUse: 27,
    gateway: "10.40.3.1",
    contact: "Avery Quinn",
  },
  {
    id: "south",
    code: "SBA",
    label: "Southbank Archive",
    town: "Huonville",
    region: "South",
    lat: -43.031,
    lng: 147.046,
    devices: 10,
    online: 10,
    baseLatency: 26,
    capacity: 100,
    baseUse: 33,
    gateway: "10.40.5.1",
    contact: "Avery Quinn",
  },
  {
    id: "harbor",
    code: "HBW",
    label: "Harbor Workshop",
    town: "Wynyard",
    region: "North-West",
    lat: -41.009,
    lng: 145.728,
    devices: 12,
    online: 12,
    baseLatency: 24,
    capacity: 200,
    baseUse: 41,
    gateway: "10.40.16.1",
    contact: "Noah Reed",
  },
  {
    id: "east",
    code: "ECL",
    label: "East Coast Lab",
    town: "St Helens",
    region: "East",
    lat: -41.322,
    lng: 148.25,
    devices: 9,
    online: 9,
    baseLatency: 29,
    capacity: 100,
    baseUse: 22,
    gateway: "10.40.42.1",
    contact: "Ellis Park",
  },
  {
    id: "lake",
    code: "LKS",
    label: "Lakeside Station",
    town: "Tarraleah",
    region: "Central",
    lat: -42.113,
    lng: 146.494,
    devices: 7,
    online: 7,
    baseLatency: 33,
    capacity: 50,
    baseUse: 56,
    gateway: "10.40.33.1",
    contact: "Mira Chen",
  },
  {
    id: "ridge",
    code: "RDG",
    label: "Ridge Observatory",
    town: "Queenstown",
    region: "North-West",
    lat: -42.083,
    lng: 145.556,
    devices: 13,
    online: 13,
    baseLatency: 31,
    capacity: 100,
    baseUse: 45,
    gateway: "10.40.18.1",
    contact: "Mira Chen",
  },
];

export type EventSeverity = "critical" | "warning" | "info" | "resolved";

export interface NetworkEvent {
  id: string;
  siteId: string;
  severity: EventSeverity;
  title: string;
  detail: string;
  /** Minutes before the page loaded. */
  minutesAgo: number;
  /** An alert that needs acknowledging. */
  alert: boolean;
}

export const networkEvents: NetworkEvent[] = [
  {
    id: "ev-offline-field",
    siteId: "field",
    severity: "critical",
    title: "Gateway stopped reporting",
    detail: "FLD-GW01 · last heartbeat 12 minutes ago",
    minutesAgo: 12,
    alert: true,
  },
  {
    id: "ev-uplink-west",
    siteId: "west",
    severity: "critical",
    title: "Uplink latency above 100 ms",
    detail: "WHV-GW01 · 148 ms for 18 minutes",
    minutesAgo: 18,
    alert: true,
  },
  {
    id: "ev-ap-west",
    siteId: "west",
    severity: "warning",
    title: "Access point offline",
    detail: "WHV-AP-2 · 4 wireless clients moved",
    minutesAgo: 31,
    alert: true,
  },
  {
    id: "ev-loss-tide",
    siteId: "tide",
    severity: "warning",
    title: "Packet loss 2.4% on the uplink",
    detail: "TDL-GW01 · above the 1% threshold",
    minutesAgo: 47,
    alert: true,
  },
  {
    id: "ev-devices-north",
    siteId: "north",
    severity: "warning",
    title: "2 devices not seen for 1 hour",
    detail: "NBK-PC-21, NBK-PC-22",
    minutesAgo: 64,
    alert: true,
  },
  {
    id: "ev-backup-quay",
    siteId: "quay",
    severity: "info",
    title: "Configuration backup completed",
    detail: "28 devices · 1.4 MB",
    minutesAgo: 95,
    alert: false,
  },
  {
    id: "ev-agent-cedar",
    siteId: "cedar",
    severity: "info",
    title: "Agent update completed",
    detail: "18 devices · version 6.8.1",
    minutesAgo: 140,
    alert: false,
  },
  {
    id: "ev-firmware-grove",
    siteId: "grove",
    severity: "info",
    title: "Switch firmware update scheduled",
    detail: "GRV-SW-CORE · Sunday 02:00",
    minutesAgo: 210,
    alert: false,
  },
  {
    id: "ev-recovered-lake",
    siteId: "lake",
    severity: "resolved",
    title: "Uplink recovered",
    detail: "LKS-GW01 · down for 6 minutes",
    minutesAgo: 260,
    alert: false,
  },
  {
    id: "ev-restart-harbor",
    siteId: "harbor",
    severity: "info",
    title: "Gateway restarted by Noah Reed",
    detail: "HBW-GW01 · back online in 48 s",
    minutesAgo: 1460,
    alert: false,
  },
  {
    id: "ev-cert-ridge",
    siteId: "ridge",
    severity: "warning",
    title: "VPN certificate expires in 14 days",
    detail: "RDG-GW01 · renew before 1 November",
    minutesAgo: 1530,
    alert: false,
  },
  {
    id: "ev-power-south",
    siteId: "south",
    severity: "resolved",
    title: "UPS returned to mains power",
    detail: "SBA-UPS-1 · on battery for 3 minutes",
    minutesAgo: 1710,
    alert: false,
  },
  {
    id: "ev-scan-east",
    siteId: "east",
    severity: "info",
    title: "Network scan found 1 new device",
    detail: "ECL-PRN-2 · printer",
    minutesAgo: 1890,
    alert: false,
  },
  {
    id: "ev-backup-north",
    siteId: "north",
    severity: "info",
    title: "Configuration backup completed",
    detail: "24 devices · 1.1 MB",
    minutesAgo: 2040,
    alert: false,
  },
];

export const NETWORK_NOTES =
  "## Network review\n\n**Meridian regional network** · weekly operations\n\n- Review the uplink at **Westhaven Office**.\n- Confirm the backup schedule at Northbank Studio.\n- Contact Field House about the offline gateway.\n\n> Next review: Thursday, 10:00 am.";

/** A repeatable value in [-1, 1] for a seed and tick, so live samples are deterministic. */
export function jitter(seed: number, tick: number) {
  const x = Math.sin(seed * 12.9898 + tick * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}
