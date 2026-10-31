import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Example, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import {
  IconAi,
  IconAutomation,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconCpu,
  IconDashboard,
  IconEndpoint,
  IconError,
  IconFileTransfer,
  IconFilter,
  IconInfo,
  IconMemory,
  IconMoreHorizontal,
  IconNetwork,
  IconOperatingSystem,
  IconOrganisation,
  IconPower,
  IconRemoteControl,
  IconReporting,
  IconRestart,
  IconSearch,
  IconSoftware,
  IconSuccess,
  IconTaskManager,
  IconTerminal,
  IconTickets,
  IconTrash,
  IconUser,
  IconViewOnly,
  IconWarning,
} from "../../icons/generated/icons.js"
import { iconRegistry } from "./icons.kit.js"
import { DEVICE_BRAND_KEYWORDS, DEVICE_BRAND_NAMES } from "../fixtures/device-brands.js"
import { Button, ButtonGroup, FEEDBACK_HOLD_MS } from "../../ui/button/index.js"
import type { IconComponent, IconSize } from "../../ui/icon/index.js"
import { Surface } from "../../ui/surface/index.js"

type Entry = (typeof iconRegistry)[number]
const BY_NAME = new Map<string, Entry["Icon"]>(iconRegistry.map((entry) => [entry.name, entry.Icon]))
const importName = (name: string) => `Icon${name.replace(/(^|[-_])(\w)/g, (_, __, c: string) => c.toUpperCase())}`

/** Review groups. An icon missing from every group lands in "Unsorted" so it gets filed. */
const GROUPS: Array<[title: string, names: string[]]> = [
  ["Navigation", ["dashboard", "home", "endpoint", "organisation", "software", "automation", "reporting", "tickets", "ai", "tasks", "sessions", "integrations", "account", "search", "zoom-in", "zoom-out", "bell", "settings", "star", "sparkle"]],
  ["Chrome", ["check", "close", "plus", "minus", "chevron-down", "chevron-up", "chevron-left", "chevron-right", "chevrons-up-down", "chevrons-left", "chevrons-right", "arrow-up", "arrow-down", "arrow-left", "arrow-right", "arrow-up-right", "more-horizontal", "more-vertical", "menu", "grip", "sidebar", "inspector", "filter", "sort", "sort-asc", "sort-desc", "columns", "page-first", "page-last", "fit-width", "spinner"]],
  ["Windows", ["windows", "external-link", "pop-out", "pop-in", "minimise", "maximise", "restore", "fullscreen", "fullscreen-exit"]],
  ["Actions", ["edit", "eyedropper", "trash", "cut", "copy", "link", "pin", "unpin", "download", "upload", "share", "refresh", "undo", "redo", "eye", "eye-off", "lock", "unlock", "key", "send", "attach", "archive", "inbox", "mail", "phone", "voicemail", "chat", "new-chat", "history", "clock", "calendar", "tag", "bookmark", "log-in", "log-out", "command"]],
  ["Power and media", ["power", "restart", "sleep", "hibernate", "wake", "play", "pause", "stop", "record", "mic", "mic-off"]],
  ["Remote management", ["remote-control", "view-only", "file-transfer", "terminal", "task-manager", "keyboard", "keyboard-hide", "backspace", "return", "shift", "caps-lock", "cursor", "clipboard", "displays", "operating-system", "patch", "antivirus", "backup", "package", "shield", "bug", "activity", "gauge", "layers", "puzzle", "plug", "bolt"]],
  ["Hardware and network", ["desktop", "laptop", "mobile", "tablet", "desk-phone", "server", "nas", "ups", "router", "network-switch", "access-point", "cpu", "memory", "disk", "battery", "temperature", "usb", "printer", "signal", "wifi", "network", "ethernet", "globe", "cloud", "cloud-off", "database"]],
  ["Security and access", ["camera", "camera-dome", "camera-turret", "camera-ptz", "doorbell", "nvr", "camera-grid-1", "camera-grid-4", "camera-grid-9", "siren", "door", "door-open", "gate", "barrier", "access-reader", "access-card", "nfc", "keypad", "qr-code", "face-scan", "intercom", "vehicle", "licence-plate", "shield-check", "shield-x"]],
  ["Status", ["success", "warning", "alert", "error", "info", "help", "pending", "offline"]],
  ["People", ["user", "users", "user-plus", "user-check", "user-x"]],
  ["Sites and relationships", ["office", "warehouse", "store", "school", "hospital", "factory", "partner", "supplier"]],
  ["Data and files", ["chart-line", "chart-pie", "trend-up", "trend-down", "folder", "folder-open", "image", "image-off", "code", "grid", "list", "map-pin"]],
  ["File types", ["file", "file-text", "file-document", "file-pdf", "file-spreadsheet", "file-presentation", "file-ebook", "file-image", "file-vector", "file-audio", "file-video", "file-font", "file-model", "file-code", "file-script", "file-data", "file-database", "file-archive", "file-executable", "file-disk-image", "file-email", "file-calendar", "file-contact", "file-key", "file-lock", "file-link"]],
  ["Appearance", ["sun", "moon", "system", "palette"]],
  ["Social and company logos", ["adobe", "amazon", "anthropic", "apple", "bitbucket", "bluesky", "cloudflare", "discord", "docker", "dropbox", "facebook", "figma", "github", "gitlab", "google", "instagram", "linkedin", "mastodon", "meta", "microsoft", "notion", "npm", "openai", "pinterest", "reddit", "slack", "snapchat", "spotify", "stripe", "telegram", "threads", "tiktok", "twitch", "vercel", "whatsapp", "x", "youtube", "zoom"]],
  ["Device manufacturers", DEVICE_BRAND_NAMES],
]

/** Other words people search for (shop finds store). */
const KEYWORDS = new Map<string, string>([
  ["office", "building site"],
  ["warehouse", "depot storage distribution site"],
  ["store", "shop storefront retail site"],
  ["school", "education campus site"],
  ["hospital", "clinic medical health site"],
  ["factory", "plant manufacturing industrial site"],
  ["partner", "handshake agreement"],
  ["supplier", "truck delivery vendor"],
  ["camera", "cctv security bullet ip surveillance"],
  ["camera-dome", "cctv security surveillance ceiling"],
  ["camera-turret", "cctv security surveillance eyeball ball"],
  ["camera-ptz", "cctv security surveillance pan tilt zoom"],
  ["doorbell", "video door bell chime ring"],
  ["nvr", "recorder video recording dvr storage cctv"],
  ["siren", "alarm alert beacon"],
  ["door", "entrance entry access closed"],
  ["door-open", "entrance entry access unlocked ajar"],
  ["gate", "fence entrance driveway access"],
  ["barrier", "boom gate parking car park vehicle access"],
  ["access-reader", "card reader badge reader rfid nfc tap"],
  ["access-card", "key card badge fob rfid nfc contactless"],
  ["nfc", "contactless tap rfid wireless"],
  ["keypad", "pin code passcode entry"],
  ["keyboard-hide", "dismiss close on-screen keyboard"],
  ["backspace", "delete erase key keyboard"],
  ["return", "enter key newline keyboard"],
  ["shift", "uppercase capital key keyboard"],
  ["caps-lock", "uppercase capitals lock key keyboard"],
  ["qr-code", "scan barcode code"],
  ["face-scan", "face recognition face id biometric unlock"],
  ["intercom", "door station talk speaker entry"],
  ["vehicle", "car automobile parking"],
  ["licence-plate", "license number plate registration lpr anpr vehicle"],
  ["camera-grid-1", "single view one camera layout live feed monitor"],
  ["camera-grid-4", "quad view four cameras layout 2x2 live feeds monitor wall"],
  ["camera-grid-9", "nine cameras layout 3x3 live feeds monitor wall"],
  ["shield-check", "passed verified compliant protected allowed outcome"],
  ["shield-x", "failed unprotected non-compliant blocked outcome"],
  ["user-check", "person admitted approved allowed verified checked in outcome"],
  ["user-x", "person refused denied blocked rejected outcome"],
  ["voicemail", "message recording phone talk"],
  ["cut", "scissors clip"],
  ["eyedropper", "pipette colour picker sample"],
  ["palette", "colours paint theme appearance"],
  ["desktop", "workstation computer pc tower"],
  ["file-text", "txt log markdown plain"],
  ["file-document", "doc docx word odt rtf pages"],
  ["file-spreadsheet", "xls xlsx excel csv ods numbers sheet"],
  ["file-presentation", "ppt pptx powerpoint slides keynote odp"],
  ["file-ebook", "epub mobi book"],
  ["file-image", "png jpg jpeg gif webp heic photo picture"],
  ["file-vector", "svg ai eps illustration"],
  ["file-audio", "mp3 m4a wav flac sound music"],
  ["file-video", "mp4 mov mkv webm movie"],
  ["file-font", "ttf otf woff typeface"],
  ["file-model", "3d stl obj glb gltf"],
  ["file-code", "source html css js ts"],
  ["file-script", "shell sh ps1 powershell bat"],
  ["file-data", "json yaml xml toml ini config"],
  ["file-database", "sqlite sql db"],
  ["file-archive", "zip tar gz 7z rar compressed"],
  ["file-executable", "exe msi app installer deb rpm apk"],
  ["file-disk-image", "iso dmg vhd vmdk"],
  ["file-email", "eml msg message mail"],
  ["file-calendar", "ics event"],
  ["file-contact", "vcf vcard"],
  ["file-key", "certificate pem crt pfx"],
  ["file-lock", "encrypted gpg kdbx"],
  ["file-link", "shortcut url lnk webloc"],
])

function groupedIcons() {
  const filed = new Set<string>()
  const groups = GROUPS.map(([title, names]) => {
    const entries = names.filter((name) => BY_NAME.has(name) && !filed.has(name)).map((name) => {
      filed.add(name)
      return { name, Icon: BY_NAME.get(name)! }
    })
    return { title, entries }
  })
  const rest = iconRegistry.filter((entry) => !filed.has(entry.name))
  if (rest.length) groups.push({ title: "Unsorted", entries: rest.map(({ name, Icon }) => ({ name, Icon })) })
  return groups.filter((group) => group.entries.length)
}

const GROUPED = groupedIcons()

const SIZES: Array<[IconSize, string]> = [
  ["xs", "14"],
  ["sm", "16"],
  ["md", "18"],
  ["lg", "20"],
  ["xl", "24"],
  ["2xl", "40"],
]

type Keyline = "circle" | "square" | "portrait" | "landscape" | "none"
const KEYLINE_SAMPLES: Array<{ name: string; keyline: Keyline; label: string }> = [
  { name: "success", keyline: "circle", label: "Circle Ø18" },
  { name: "tasks", keyline: "square", label: "Square 17" },
  { name: "file", keyline: "portrait", label: "Portrait 15 × 19" },
  { name: "endpoint", keyline: "landscape", label: "Landscape 18 × 12" },
  { name: "settings", keyline: "circle", label: "Circle Ø18.5" },
  { name: "chevron-right", keyline: "none", label: "Line glyph, centred" },
]

export default function IconsSection() {
  const [query, setQuery] = useState("")
  const [tint, setTint] = useState(true)
  const [size, setSize] = useState<IconSize>("xl")
  const needle = query.trim().toLowerCase().replace(/^icon/, "")
  const visible = useMemo(
    () =>
      GROUPED.map((group) => ({
          ...group,
          entries: group.title.toLowerCase().includes(needle)
            ? group.entries
            : group.entries.filter((entry) =>
              `${entry.name} ${DEVICE_BRAND_KEYWORDS.get(entry.name) ?? ""} ${KEYWORDS.get(entry.name) ?? ""}`
                .replaceAll(/[\s-]/g, "").includes(needle.replaceAll(/[\s-]/g, ""))),
        }))
        .filter((group) => group.entries.length),
    [needle]
  )
  const shown = visible.reduce((sum, group) => sum + group.entries.length, 0)

  return (
    <SectionPage>
      <Specimen
        title="The set"
        description={`${shown} of ${iconRegistry.length} icons. Click one to copy its import name.`}
        layout="stack"
        wide
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="fa-control w-full max-w-sm" data-size="sm">
            <IconSearch />
            <input
              className="fa-control-input"
              type="text"
              role="searchbox"
              enterKeyHint="search"
              placeholder="Search icons or groups"
              aria-label="Search icons"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <ButtonGroup attached aria-label="Tint">
            <Button size="sm" variant={tint ? "soft" : "secondary"} aria-pressed={tint} onClick={() => setTint(true)}>
              Duotone
            </Button>
            <Button size="sm" variant={tint ? "secondary" : "soft"} aria-pressed={!tint} onClick={() => setTint(false)}>
              Line only
            </Button>
          </ButtonGroup>
          <ButtonGroup aria-label="Preview size" className="max-w-full flex-wrap">
            {SIZES.map(([value, px]) => (
              <Button
                key={value}
                size="sm"
                variant={size === value ? "soft" : "secondary"}
                aria-pressed={size === value}
                aria-label={`${value} ${px}px`}
                onClick={() => setSize(value)}
              >
                {value}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        {shown === 0 ? (
          <p className="flex items-center gap-2 text-fg-muted" data-icons-empty="">
            No icons match “{query.trim()}”
            <Button size="sm" variant="ghost" onClick={() => setQuery("")}>
              Clear search
            </Button>
          </p>
        ) : (
          <IconGrid groups={visible} tint={tint} size={size} />
        )}
      </Specimen>

      <Specimen
        title="Keylines"
        description="Every glyph sits on the 24 grid inside the 2–22 live area and borrows the mass of the keyline shape nearest to it, so a circle and a square read as the same weight."
        wide
      >
        {KEYLINE_SAMPLES.map(({ name, keyline, label }) => {
          const Icon = BY_NAME.get(name)
          if (!Icon) return null
          return (
            <Example key={name} label={`${name} · ${label}`}>
              <div className="relative size-30" data-keyline={keyline}>
                <KeylineGrid />
                <Icon tint={tint} className="absolute inset-0 size-30 text-fg opacity-90" />
                <KeylineShape keyline={keyline} />
              </div>
            </Example>
          )
        })}
      </Specimen>

      <Specimen
        title="Size ramp"
        description="The frame thickens the stroke at small sizes (×1.2 at xs) and thins it at 2xl (×0.78), so every size reads as the same weight. Components choose the size."
        wide
      >
        <Matrix
          columns={SIZES.map(([value, px]) => `${value} · ${px}`)}
          rows={["endpoint", "organisation", "remote-control", "settings", "warning", "chevron-right"].map((name) => {
            const Icon = BY_NAME.get(name)!
            return { label: name, cells: SIZES.map(([value]) => <Icon key={value} size={value} tint={tint} />) }
          })}
        />
      </Specimen>

      <Specimen
        title="Duotone and tone"
        description="The tint is the glyph's meaning region at 16% of the current colour, so it follows status and accent colour without extra artwork."
      >
        {(
          [
            ["neutral", IconEndpoint],
            ["accent", IconAi],
            ["success", IconSuccess],
            ["warning", IconWarning],
            ["danger", IconError],
            ["info", IconInfo],
          ] as Array<[string, IconComponent]>
        ).map(([tone, Icon]) => (
          <Example key={tone} label={tone}>
            <span className="fa-tile-icon" data-tone={tone === "neutral" ? undefined : tone}>
              <Icon tint={tint} />
            </span>
          </Example>
        ))}
      </Specimen>

      <Specimen title="In context" description="Callers pass an icon with no size; buttons, rows and tiles size it." layout="stack" wide>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<IconRemoteControl tint={tint} />}>
            Connect
          </Button>
          <Button icon={<IconRestart tint={tint} />}>Restart agent</Button>
          <Button iconEnd={<IconChevronDown />}>More actions</Button>
          <Button variant="ghost" icon={<IconFilter tint={tint} />} size="sm">
            Filter
          </Button>
          <Button variant="ghost" icon={<IconMoreHorizontal />} aria-label="More actions for NST-C106" />
          <Button variant="danger-soft" icon={<IconTrash tint={tint} />}>
            Remove device
          </Button>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, calc(var(--unit) * 64)), 1fr))" }}>
          <Surface material="inset" radius="overlay" padding="overlay" className="flex flex-col self-start">
            <Row icon={<IconDashboard size="lg" tint={tint} />}>Dashboard</Row>
            <Row icon={<IconEndpoint size="lg" tint={tint} />} current>
              Endpoints
            </Row>
            <Row icon={<IconOrganisation size="lg" tint={tint} />}>Organisations</Row>
            <Row icon={<IconSoftware size="lg" tint={tint} />}>Software</Row>
            <Row icon={<IconAutomation size="lg" tint={tint} />}>Automation</Row>
            <Row icon={<IconReporting size="lg" tint={tint} />}>Reporting</Row>
            <Row icon={<IconTickets size="lg" tint={tint} />}>Tickets</Row>
            <Row icon={<IconAi size="lg" tint={tint} />}>Assistant</Row>
          </Surface>
          <Surface material="inset" radius="overlay" padding="overlay" className="flex flex-col self-start">
            <Row icon={<IconRemoteControl tint={tint} />}>Connect</Row>
            <Row icon={<IconViewOnly tint={tint} />}>View only</Row>
            <Row icon={<IconFileTransfer tint={tint} />}>File transfer</Row>
            <Row icon={<IconTerminal tint={tint} />}>Command prompt</Row>
            <Row icon={<IconTaskManager tint={tint} />}>Task manager</Row>
            <Row icon={<IconPower tint={tint} />} trail={<IconChevronRight />}>
              Power
            </Row>
            <Row icon={<IconTrash tint={tint} />} tone="danger">
              Remove device
            </Row>
          </Surface>
          <div className="grid content-start gap-3">
            <DetailTile icon={<IconCpu tint={tint} />} label="Processor" value="Intel Core i5-8500T @ 2.10 GHz" />
            <DetailTile icon={<IconMemory tint={tint} />} label="Physical memory" value="7.8 GB" />
            <DetailTile icon={<IconOperatingSystem tint={tint} />} label="Operating system" value="Windows 11 Business 10.0.26300" />
            <DetailTile icon={<IconClock tint={tint} />} label="Uptime" value="2 days" />
            <DetailTile icon={<IconNetwork tint={tint} />} label="Domain" value="WORKGROUP" />
            <DetailTile icon={<IconUser tint={tint} />} label="Registered user" value="AzureAD\MiraRowan" />
          </div>
        </div>
      </Specimen>

      <Rules
        do={[
          "Import icons by name (IconEndpoint) and let the component size them.",
          "Name a new icon by its meaning (restart, not circular-arrow) and check it here at xs before using it.",
          "Give icon-only buttons an aria-label; leave decorative icons unlabelled.",
          "Let status icons take their colour from the container: tile, badge, toast or row tone.",
        ]}
        dont={[
          "Pass a size or a stroke width to an icon inside a component.",
          "Reuse a glyph for a second meaning, or draw a near-duplicate of an existing one.",
          "Use a social or company icon for a generic action, device or status; it identifies that service only.",
          "Colour an icon for decoration; colour carries status or selection only.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--icon-stroke", "Stroke on the 24 grid, before size compensation"],
          ["--icon-tint-opacity", "Duotone fill; 0 turns tint off everywhere"],
          ["--icon-xs", "Dense rows, inline status"],
          ["--icon-sm", "Table rows, small buttons"],
          ["--icon-md", "Controls and menu rows"],
          ["--icon-lg", "Navigation, tile icons"],
          ["--icon-xl", "Headers, icon-only large buttons"],
          ["--icon-2xl", "Empty states"],
          ["--tile-icon-box", "Soft square behind a tile icon"],
        ]}
      />
    </SectionPage>
  )
}

function IconGrid({
  groups,
  tint,
  size,
}: {
  /** Action groups in display order. */
  groups: Array<{ title: string; entries: Array<{ name: string; Icon: IconComponent }> }>
  tint: boolean
  size: IconSize
}) {
  const [copied, setCopied] = useState<{ name: string; ok: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async (name: string) => {
    clearTimeout(timer.current)
    let ok = true
    try {
      await navigator.clipboard.writeText(importName(name))
    } catch {
      ok = false
    }
    setCopied({ name, ok })
    timer.current = setTimeout(() => setCopied(null), FEEDBACK_HOLD_MS)
  }

  const minTile = size === "2xl" ? 32 : 30
  return (
    <div className="flex flex-col gap-5" data-icon-grid="">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title} className="flex flex-col gap-2">
          <h4 className="fa-overline flex gap-2">
            <span>{group.title}</span>
            <span data-numeric>{group.entries.length}</span>
          </h4>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(calc(var(--unit) * ${minTile}), 1fr))` }}
          >
            {group.entries.map(({ name, Icon }) => {
              const state = copied?.name === name ? (copied.ok ? "copied" : "failed") : undefined
              return (
                <button
                  key={name}
                  type="button"
                  className="fa-pressable flex min-w-0 flex-col items-center gap-2 rounded-tile px-2 pt-4 pb-3 text-fg hover:bg-fill-hover"
                  title={`Copy ${importName(name)}`}
                  data-icon-tile={name}
                  data-state={state}
                  onClick={() => void copy(name)}
                >
                  <Icon size={size} tint={tint} />
                  <span
                    className={
                      state === "copied"
                        ? "type-caption max-w-full truncate text-success-text"
                        : state === "failed"
                          ? "type-caption max-w-full truncate text-danger-text"
                          : "type-caption max-w-full truncate text-fg-muted"
                    }
                  >
                    {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : name}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <p className="sr-only" aria-live="polite">
        {copied ? (copied.ok ? `Copied ${importName(copied.name)}` : `Could not copy ${importName(copied.name)}`) : ""}
      </p>
    </div>
  )
}

function Row({
  icon,
  children,
  current,
  tone,
  trail,
}: {
  icon: ReactNode
  children: ReactNode
  current?: boolean
  tone?: "danger"
  /** Ancestor trail before the current item. */
  trail?: ReactNode
}) {
  return (
    <div className="fa-item" aria-current={current ? "page" : undefined} data-tone={tone}>
      {icon}
      <span className="fa-item-label">{children}</span>
      {trail ? <span className="fa-item-trail flex">{trail}</span> : null}
    </div>
  )
}

function DetailTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Surface material="control" radius="tile" padding="tile" className="flex min-w-0 items-center gap-3">
      <span className="fa-tile-icon">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="type-caption text-fg-muted">{label}</span>
        <span className="type-label truncate">{value}</span>
      </span>
    </Surface>
  )
}

/** The 24 grid and the 2–22 live area, drawn behind a specimen icon. */
function KeylineGrid() {
  const lines = Array.from({ length: 25 }, (_, i) => i)
  return (
    <svg viewBox="0 0 24 24" className="absolute inset-0 size-30" fill="none" aria-hidden="true">
      <rect x={2} y={2} width={20} height={20} className="fill-fill-muted" />
      {lines.map((i) => (
        <line key={`v${i}`} x1={i} y1={0} x2={i} y2={24} className="stroke-line" vectorEffect="non-scaling-stroke" />
      ))}
      {lines.map((i) => (
        <line key={`h${i}`} x1={0} y1={i} x2={24} y2={i} className="stroke-line" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

/** The keyline shape and the centre axes, drawn over the icon so alignment is visible. */
function KeylineShape({ keyline }: { keyline: Keyline }) {
  const hairline = { vectorEffect: "non-scaling-stroke" } as const
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-0 size-30" fill="none" aria-hidden="true">
      <line x1={12} y1={0} x2={12} y2={24} className="stroke-accent-line" {...hairline} />
      <line x1={0} y1={12} x2={24} y2={12} className="stroke-accent-line" {...hairline} />
      {keyline === "circle" ? <circle cx={12} cy={12} r={9} className="stroke-accent" {...hairline} /> : null}
      {keyline === "square" ? <rect x={3.5} y={3.5} width={17} height={17} rx={2.5} className="stroke-accent" {...hairline} /> : null}
      {keyline === "portrait" ? <rect x={4.5} y={2.5} width={15} height={19} rx={2.5} className="stroke-accent" {...hairline} /> : null}
      {keyline === "landscape" ? <rect x={3} y={4} width={18} height={12} rx={2.5} className="stroke-accent" {...hairline} /> : null}
    </svg>
  )
}
