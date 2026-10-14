/**
 * Realistic Glass UX data shared by the form-control gallery sections.
 */
import {
  IconClock,
  IconCode,
  IconDatabase,
  IconDisplays,
  IconEndpoint,
  IconFileTransfer,
  IconLaptop,
  IconLayers,
  IconOperatingSystem,
  IconPlug,
  IconRemoteControl,
  IconServer,
  IconTerminal,
  IconViewOnly,
  IconWifi,
} from "../../icons/generated/icons.js"
import type { ReactNode } from "react"
import type { ComboboxOption } from "../../ui/combobox/index.js"
import type { SelectGroup, SelectOption } from "../../ui/select/index.js"

export type AgentGroup = "workstations" | "servers" | "laptops" | "kiosks"
export const AGENT_GROUPS: Array<SelectOption<AgentGroup>> = [
  { value: "workstations", label: "Workstations", icon: <IconEndpoint />, detail: "184" },
  { value: "laptops", label: "Laptops", icon: <IconLaptop />, detail: "62" },
  { value: "servers", label: "Servers", icon: <IconServer />, detail: "9" },
  { value: "kiosks", label: "Front counter kiosks", icon: <IconDisplays />, detail: "4" },
]

export type Environment = "production" | "staging" | "development"
export const ENVIRONMENTS: Array<SelectOption<Environment>> = [
  { value: "production", label: "Production", icon: <IconDatabase /> },
  { value: "staging", label: "Staging", icon: <IconLayers /> },
  { value: "development", label: "Development", icon: <IconCode /> },
]

export type ConnectionMode = "always" | "on-demand" | "scheduled"
export const CONNECTION_MODES: Array<SelectOption<ConnectionMode>> = [
  { value: "always", label: "Always on", icon: <IconWifi /> },
  { value: "on-demand", label: "On demand", icon: <IconPlug /> },
  { value: "scheduled", label: "Scheduled window", icon: <IconClock /> },
]

export const OPERATING_SYSTEMS: SelectGroup[] = [
  {
    label: "Windows",
    options: [
      { value: "win11-business", label: "Windows 11 Business", icon: <IconOperatingSystem />, detail: "10.0.26300" },
      { value: "win11-pro", label: "Windows 11 Pro", icon: <IconOperatingSystem />, detail: "10.0.26100" },
      { value: "win10-pro", label: "Windows 10 Pro", icon: <IconOperatingSystem />, detail: "22H2" },
    ],
  },
  {
    label: "Windows Server",
    options: [
      { value: "ws2022", label: "Windows Server 2022", icon: <IconServer /> },
      { value: "ws2019", label: "Windows Server 2019", icon: <IconServer />, disabled: true },
    ],
  },
]

export const ORGANISATIONS: ComboboxOption[] = [
  { value: "northstar", label: "Northstar Studio" },
  { value: "cedarvale", label: "Cedar Vale Collective" },
  { value: "orbit", label: "Orbit Workspace" },
  { value: "bicheno-medical", label: "Juniper Grove" },
  { value: "cedar-annex-primary", label: "Cloudmere Academy" },
  { value: "east-coast-tourism", label: "East Coast Tourism" },
  { value: "st-helens-marina", label: "St Helens Marina" },
  { value: "freycinet-lodge", label: "Freycinet Lodge" },
  { value: "orford-pharmacy", label: "Orford Pharmacy" },
  { value: "mossbridge-rsl", label: "Mossbridge RSL" },
]

export const TAGS: ComboboxOption[] = [
  { value: "production", label: "Production" },
  { value: "all-in-one", label: "All-in-One" },
  { value: "front-counter", label: "Front counter" },
  { value: "finance", label: "Finance" },
  { value: "reception", label: "Reception" },
  { value: "loaner", label: "Loaner" },
  { value: "kiosk", label: "Kiosk" },
  { value: "executive", label: "Executive" },
]

export const ENDPOINTS: ComboboxOption[] = [
  { value: "nst-c106", label: "NST-C106", icon: <IconEndpoint />, description: "AzureAD\\MiraRowan" },
  { value: "nst-3bb4", label: "NST-3BB4", icon: <IconEndpoint />, description: "AzureAD\\MiraRowan" },
  { value: "nst-server", label: "NST-SERVER", icon: <IconServer />, description: "NST-SERVER\\NST" },
  { value: "orb-4e5e", label: "LMN-4E5E", icon: <IconEndpoint />, description: "LMN-4E5E\\Front Counter" },
  { value: "orb-7c71", label: "LMN-7C71", icon: <IconLaptop />, description: "ANOTHER\\avery.quinn" },
  { value: "win11-vm", label: "STUDIO-VM", icon: <IconEndpoint />, description: "STUDIO-VM\\Avery Quinn" },
]

/** Labels people commonly add to endpoints (suggestions for a TagInput). */
export const LABEL_SUGGESTIONS: ComboboxOption[] = TAGS_SOURCE()

function TAGS_SOURCE(): ComboboxOption[] {
  return ["Production", "All-in-One", "Front counter", "Finance", "Reception", "Loaner", "Kiosk", "Executive"].map((label) => ({
    value: label,
    label,
  }))
}

export type SessionKind = "interactive" | "view" | "files" | "command"
export const SESSION_KINDS: Array<{ value: SessionKind; label: string; description: string; icon: ReactNode }> = [
  { value: "interactive", label: "Interactive session", description: "View and control the device", icon: <IconRemoteControl /> },
  { value: "view", label: "View only", description: "Monitor without control", icon: <IconViewOnly /> },
  { value: "files", label: "File transfer", description: "Transfer files only", icon: <IconFileTransfer /> },
  { value: "command", label: "Command prompt", description: "Open a remote command prompt", icon: <IconTerminal /> },
]

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
