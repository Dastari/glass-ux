import { useState } from "react"
import { Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import {
  IconChevronDown,
  IconColumns,
  IconCopy,
  IconDownload,
  IconEdit,
  IconExternalLink,
  IconMoreHorizontal,
  IconPin,
  IconRefresh,
  IconTrash,
} from "../../icons/generated/icons.js"
import { ActionMenu, ActionMenuPreview, ActionProvider } from "../../ui/actions/index.js"
import { Button } from "../../ui/button/index.js"
import { Kbd } from "../../ui/kbd/index.js"
import { Menu, MenuPreview } from "../../ui/menu/index.js"
import { ENDPOINTS, endpointActions } from "./overlays.fixtures.js"

const nst = ENDPOINTS[0]!
const win11 = ENDPOINTS[2]!

function ViewMenu() {
  const [columns, setColumns] = useState({ user: true, organisation: true, lastSeen: false })
  const [density, setDensity] = useState("comfortable")
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button icon={<IconColumns />} iconEnd={<IconChevronDown />}>View</Button>} />
      <Menu.Popup>
        <Menu.Group>
          <Menu.GroupLabel>Columns</Menu.GroupLabel>
          <Menu.CheckboxItem checked={columns.user} onCheckedChange={(user) => setColumns((c) => ({ ...c, user }))}>
            Signed-in user
          </Menu.CheckboxItem>
          <Menu.CheckboxItem checked={columns.organisation} onCheckedChange={(organisation) => setColumns((c) => ({ ...c, organisation }))}>
            Organisation
          </Menu.CheckboxItem>
          <Menu.CheckboxItem checked={columns.lastSeen} onCheckedChange={(lastSeen) => setColumns((c) => ({ ...c, lastSeen }))}>
            Last seen
          </Menu.CheckboxItem>
        </Menu.Group>
        <Menu.Separator />
        <Menu.RadioGroup value={density} onValueChange={(value) => setDensity(String(value))}>
          <Menu.GroupLabel>Density</Menu.GroupLabel>
          <Menu.RadioItem value="comfortable">Comfortable</Menu.RadioItem>
          <Menu.RadioItem value="compact">Compact</Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.Popup>
    </Menu.Root>
  )
}

function FileMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="ghost" icon={<IconMoreHorizontal />} aria-label="Actions for Q3 patch report.pdf" />} />
      <Menu.Popup align="end">
        <Menu.Group>
          <Menu.Item icon={<IconExternalLink />} shortcut="mod+enter">
            Open in a new window
          </Menu.Item>
          <Menu.Item icon={<IconDownload />} shortcut="mod+s">
            Download
          </Menu.Item>
          <Menu.Item icon={<IconCopy />} shortcut="mod+c">
            Copy link
          </Menu.Item>
        </Menu.Group>
        <Menu.Group>
          <Menu.Item icon={<IconEdit />} shortcut="f2">
            Rename
          </Menu.Item>
          <Menu.Item icon={<IconPin />}>Pin to dashboard</Menu.Item>
          <Menu.Item icon={<IconRefresh />} disabledReason="Report is still generating">
            Regenerate
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.Item icon={<IconTrash />} tone="danger" shortcut="delete">
            Delete report
          </Menu.Item>
        </Menu.Group>
      </Menu.Popup>
    </Menu.Root>
  )
}

export default function MenuSection() {
  return (
    <ActionProvider>
      <SectionPage>
        <Specimen
          title="Live"
          description="Arrow keys move, → and ← open and close submenus, typing jumps to a row, Enter runs it, Esc closes and focus returns to the trigger."
        >
          <Example label="Endpoint actions (online)">
            <ActionMenu set={endpointActions} targets={[nst]} label={nst.name} size="md" />
          </Example>
          <Example label="Offline endpoint">
            <ActionMenu set={endpointActions} targets={[win11]} label={win11.name} size="md" />
          </Example>
          <Example label="Shortcuts, disabled reason">
            <FileMenu />
          </Example>
          <Example label="Toggles and choices">
            <ViewMenu />
          </Example>
        </Specimen>

        <Specimen
          title="Anatomy"
          description="Rows are fa-item: icon, label, then a shortcut or a chevron. Groups are set apart by space; one hairline sets off the destructive group, last and in danger tone."
        >
          <ActionMenuPreview set={endpointActions} targets={[nst]} label={nst.name} openSubmenu="power" highlight="power" />
        </Specimen>

        <Specimen title="Toggles, choices and labels" description="Ticks and dots take the icon slot, so labels line up with icon rows.">
          <MenuPreview.Surface label="View">
            <MenuPreview.Group>
              <MenuPreview.GroupLabel>Columns</MenuPreview.GroupLabel>
              <MenuPreview.Item checked>Signed-in user</MenuPreview.Item>
              <MenuPreview.Item checked highlighted>
                Organisation
              </MenuPreview.Item>
              <MenuPreview.Item checked={false}>Last seen</MenuPreview.Item>
            </MenuPreview.Group>
            <MenuPreview.Separator />
            <MenuPreview.Group>
              <MenuPreview.GroupLabel>Density</MenuPreview.GroupLabel>
              <MenuPreview.Item checked radio>
                Comfortable
              </MenuPreview.Item>
              <MenuPreview.Item checked={false} radio>
                Compact
              </MenuPreview.Item>
            </MenuPreview.Group>
          </MenuPreview.Surface>
          <ActionMenuPreview set={endpointActions} targets={[win11]} label={win11.name} />
        </Specimen>

        <Specimen title="Over imagery" backdrop>
          <ActionMenuPreview set={endpointActions} targets={[nst]} label={nst.name} openSubmenu="move" highlight="move" />
        </Specimen>

        <Specimen title="Keyboard shortcuts" description="Kbd formats a shortcut for the viewer's platform: ⌘ on macOS, Ctrl elsewhere. Keycaps for help and hints; the quiet text form at the end of menu rows.">
          <Example label="Keycaps">
            <Kbd keys="mod+k" />
            <Kbd keys="mod+shift+r" />
            <Kbd keys="shift+f10" />
            <Kbd keys="esc" />
          </Example>
          <Example label="Small keycaps">
            <Kbd keys="up" size="sm" />
            <Kbd keys="down" size="sm" />
            <Kbd keys="enter" size="sm" />
          </Example>
          <Example label="Inline (menu rows)">
            <Kbd keys="mod+shift+c" variant="text" />
            <Kbd keys="mod+enter" variant="text" />
            <Kbd keys="delete" variant="text" />
          </Example>
        </Specimen>

        <Rules
          do={[
            "Order groups: open, connect and remote, manage, organise, then destructive.",
            "Keep a disabled row visible, dimmed, with why as its tooltip.",
            "Show the shortcut at the end of the row when the action has one.",
            "Build entity menus from the action definition (ActionMenu), never by hand.",
            "Put toggles and choices in menus only when they act at once.",
          ]}
          dont={[
            "Use more than two dividers in a menu; separate groups with space.",
            "Hide an action because it is temporarily unavailable — disable it with a reason.",
            "Put anything but actions, toggles and choices in a menu.",
            "Nest submenus more than one level.",
            "Colour a row red unless it destroys something.",
          ]}
        />

        <TokenTable
          tokens={[
            ["--item-h", "Row height"],
            ["--radius-item", "Row corners"],
            ["--radius-overlay", "Surface corners"],
            ["--inset-overlay", "Surface inset around rows"],
            ["--fill-hover", "Highlighted row"],
            ["--danger-text", "Destructive row"],
            ["--line", "The one divider"],
            ["--disabled-opacity", "Disabled row"],
            ["--z-popover", "Stacking"],
          ]}
        />
      </SectionPage>
    </ActionProvider>
  )
}
