/**
 * Fictional sample data for the TreeSelect, Cascader and TransferList pages: an org chart,
 * device groups loaded on demand, delivery locations and role permissions.
 */
import { IconOrganisation, IconServer, IconUser, IconUsers } from "../../icons/generated/icons.js"
import type { CascaderOption } from "../../ui/cascader/index.js"
import type { TransferItem } from "../../ui/transfer-list/index.js"
import type { TreeNode } from "../../ui/tree/index.js"

const person = (id: string, label: string, description: string): TreeNode => ({ id, label, description, icon: <IconUser /> })
const team = (id: string, label: string, children: TreeNode[]): TreeNode => ({ id, label, icon: <IconUsers />, children })

/** Kestrel Works, a fictional manufacturer: units, teams and people. */
export const ORG_CHART: TreeNode[] = [
  {
    id: "kestrel",
    label: "Kestrel Works",
    icon: <IconOrganisation />,
    children: [
      team("engineering", "Engineering", [
        team("platform", "Platform", [
          person("p-amara", "Amara Osei", "Staff engineer"),
          person("p-lukas", "Lukas Brandt", "Engineer"),
          person("p-ines", "Inês Duarte", "Engineer"),
        ]),
        team("firmware", "Firmware", [person("p-kenji", "Kenji Arai", "Lead"), person("p-sofia", "Sofia Marchetti", "Engineer")]),
        team("quality", "Quality", [person("p-ravi", "Ravi Menon", "Test lead"), { ...person("p-hana", "Hana Novak", "On leave"), disabled: true }]),
      ]),
      team("operations", "Operations", [
        team("north-plant", "North plant", [person("p-tomas", "Tomás Ruiz", "Shift manager"), person("p-ella", "Ella Fitzgerald-Ng", "Technician")]),
        team("south-plant", "South plant", [person("p-yusuf", "Yusuf Kaya", "Shift manager"), person("p-maya", "Maya Lindqvist", "Technician")]),
        team("logistics", "Logistics", [person("p-oscar", "Oscar Mbeki", "Coordinator")]),
      ]),
      team("finance", "Finance", [person("p-grace", "Grace Whitfield", "Controller"), person("p-noah", "Noah Petrov", "Analyst")]),
    ],
  },
]

/** Device groups whose members load on first open. */
export const DEVICE_GROUPS: TreeNode[] = [
  { id: "dg-plant", label: "Plant floor", icon: <IconServer />, hasChildren: true },
  { id: "dg-office", label: "Office", icon: <IconServer />, hasChildren: true },
  { id: "dg-lab", label: "Test lab", icon: <IconServer />, hasChildren: true },
  { id: "dg-retired", label: "Retired", icon: <IconServer />, hasChildren: true },
]

/** The members `onLoadChildren` fetches for a device group (after a short delay). */
export function deviceGroupChildren(id: string): TreeNode[] {
  const prefix = { "dg-plant": "PLC", "dg-office": "WS", "dg-lab": "RIG", "dg-retired": "OLD" }[id] ?? "DEV"
  if (id === "dg-retired") return []
  return Array.from({ length: 4 }, (_, i) => ({ id: `${id}-${i + 1}`, label: `${prefix}-${String(101 + i * 7)}`, description: `10.20.${i + 4}.${12 + i * 3}` }))
}

/** Delivery locations: country → region → site. Regions of New Zealand load on demand. */
export const LOCATIONS: CascaderOption[] = [
  {
    value: "au",
    label: "Australia",
    children: [
      {
        value: "nsw",
        label: "New South Wales",
        children: [
          { value: "parramatta", label: "Parramatta depot" },
          { value: "newcastle", label: "Newcastle yard" },
          { value: "wollongong", label: "Wollongong store" },
        ],
      },
      {
        value: "vic",
        label: "Victoria",
        children: [
          { value: "dandenong", label: "Dandenong depot" },
          { value: "geelong", label: "Geelong yard" },
          { value: "ballarat", label: "Ballarat store", disabled: true },
        ],
      },
      {
        value: "qld",
        label: "Queensland",
        children: [
          { value: "brisbane", label: "Brisbane hub" },
          { value: "townsville", label: "Townsville depot" },
        ],
      },
      { value: "tas", label: "Tasmania", children: [{ value: "launceston", label: "Launceston yard" }] },
    ],
  },
  { value: "nz", label: "New Zealand", hasChildren: true },
  {
    value: "sg",
    label: "Singapore",
    children: [
      { value: "jurong", label: "Jurong warehouse" },
      { value: "changi", label: "Changi cargo office" },
    ],
  },
]

/** The regions `onLoadChildren` fetches for New Zealand. */
export const NZ_REGIONS: CascaderOption[] = [
  { value: "auckland", label: "Auckland", children: [{ value: "east-tamaki", label: "East Tāmaki depot" }, { value: "penrose", label: "Penrose yard" }] },
  { value: "canterbury", label: "Canterbury", children: [{ value: "hornby", label: "Hornby depot" }] },
]

/** Permissions a role can be granted, grouped by area. */
export const PERMISSIONS: TransferItem[] = [
  { value: "assets.view", label: "View assets", description: "assets.view", group: "Assets" },
  { value: "assets.edit", label: "Edit assets", description: "assets.edit", group: "Assets" },
  { value: "assets.retire", label: "Retire assets", description: "assets.retire", group: "Assets" },
  { value: "assets.import", label: "Import assets", description: "assets.import", group: "Assets" },
  { value: "orders.view", label: "View work orders", description: "orders.view", group: "Work orders" },
  { value: "orders.create", label: "Create work orders", description: "orders.create", group: "Work orders" },
  { value: "orders.approve", label: "Approve work orders", description: "orders.approve", group: "Work orders" },
  { value: "orders.close", label: "Close work orders", description: "orders.close", group: "Work orders" },
  { value: "reports.view", label: "View reports", description: "reports.view", group: "Reports" },
  { value: "reports.export", label: "Export reports", description: "reports.export", group: "Reports" },
  { value: "reports.schedule", label: "Schedule reports", description: "reports.schedule", group: "Reports" },
  { value: "admin.users", label: "Manage users", description: "admin.users", group: "Administration", disabled: true, disabledReason: "Only the Owner role can manage users" },
  { value: "admin.billing", label: "Manage billing", description: "admin.billing", group: "Administration", disabled: true, disabledReason: "Billing is managed by the parent organisation" },
  { value: "admin.audit", label: "View audit log", description: "admin.audit", group: "Administration" },
]

const FIRST = ["Ari", "Bea", "Cal", "Dee", "Eli", "Fen", "Gus", "Ivy", "Jo", "Kit", "Lux", "Mo", "Nia", "Ola", "Pip", "Rae", "Sol", "Tam", "Uma", "Vic"]
const LAST = ["Arden", "Birch", "Calder", "Dunmore", "Ellery", "Fairlie", "Garrow", "Holt", "Ingle", "Jessop", "Keene", "Lowry", "Marsh", "Nolan", "Orme", "Prior"]

/** A large directory of fictional people, for the virtualised list. */
export function manyMembers(count: number): TransferItem[] {
  return Array.from({ length: count }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`
    return { value: `m-${i + 1}`, label: `${name} ${Math.floor(i / (FIRST.length * LAST.length)) + 1 > 1 ? Math.floor(i / (FIRST.length * LAST.length)) + 1 : ""}`.trim(), description: `m${String(i + 1).padStart(4, "0")}@kestrel.example` }
  })
}
