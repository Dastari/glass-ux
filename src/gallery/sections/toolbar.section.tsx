import { useState } from "react"
import {
  IconColumns,
  IconDownload,
  IconFilter,
  IconGrid,
  IconList,
  IconRefresh,
  IconShare,
  IconSort,
  IconZoomIn,
  IconZoomOut,
} from "../../icons/generated/icons.js"
import { Menu } from "../../ui/menu/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { Toolbar } from "../../ui/toolbar/index.js"
import { ContainerLab, Rules, SectionPage, Specimen } from "../kit.js"

function ReportToolbar() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [filters, setFilters] = useState(true)
  const [zoom, setZoom] = useState(100)
  return (
    <Toolbar aria-label="Report view">
      <Toolbar.Item
        priority="always"
        menu={null}
      >
        <Segmented
          size="sm"
          iconOnly
          aria-label="Layout"
          value={view}
          onValueChange={setView}
          options={[
            { value: "grid", label: "Grid", icon: <IconGrid /> },
            { value: "list", label: "List", icon: <IconList /> },
          ]}
        />
      </Toolbar.Item>
      <Toolbar.Separator />
      <Toolbar.Button label="Filters" icon={<IconFilter />} pressed={filters} onPressedChange={setFilters} shortcut="mod+shift+f" />
      <Toolbar.Button label="Sort" icon={<IconSort />} onClick={() => {}} />
      <Toolbar.Button label="Columns" icon={<IconColumns />} priority="low" onClick={() => {}} />
      <Toolbar.Separator />
      <Toolbar.Group aria-label="Zoom" priority="low">
        <Toolbar.Button label="Zoom out" icon={<IconZoomOut />} disabled={zoom <= 50} onClick={() => setZoom((z) => Math.max(50, z - 25))} />
        <Toolbar.Button label="Zoom in" icon={<IconZoomIn />} disabled={zoom >= 200} onClick={() => setZoom((z) => Math.min(200, z + 25))} />
      </Toolbar.Group>
      <Toolbar.Spacer />
      <Toolbar.Button label="Refresh" icon={<IconRefresh />} priority="low" onClick={() => {}} />
      <Toolbar.Button label="Download CSV" icon={<IconDownload />} priority="low" onClick={() => {}} />
      <Toolbar.Item
        priority="high"
        menu={
          <Menu.Submenu label="Share">
            <Menu.Item>Copy link</Menu.Item>
            <Menu.Item>Email…</Menu.Item>
          </Menu.Submenu>
        }
      >
        <Menu.Root>
          <Toolbar.Button label="Share" icon={<IconShare />} showLabel render={<Menu.Trigger />} />
          <Menu.Popup align="end">
            <Menu.Item>Copy link</Menu.Item>
            <Menu.Item>Email…</Menu.Item>
          </Menu.Popup>
        </Menu.Root>
      </Toolbar.Item>
    </Toolbar>
  )
}

export default function ToolbarSection() {
  return (
    <SectionPage>
      <Specimen title="Toolbar" description="Arrow keys move between controls; Tab leaves the row. Toggles that are on take the accent's soft fill." layout="stack" wide>
        <ReportToolbar />
      </Specimen>
      <ContainerLab title="Folding" description="Low-priority items fold into More first, the last ones first; groups fold together; separators go with them. The layout switch never folds.">
        {() => (
          <div className="flex h-full items-start p-2">
            <div className="w-full">
              <ReportToolbar />
            </div>
          </div>
        )}
      </ContainerLab>
      <Rules
        do={[
          "Give every icon-only control a label: it is the tooltip, the accessible name and the More menu item.",
          "Mark what can wait as low priority, so the important controls stay in the row longest.",
          "Group related controls and separate groups.",
        ]}
        dont={[
          "Don't put a toolbar's only primary action in More; set it to always.",
          "Don't use a toolbar for navigation; that is tabs.",
        ]}
      />
    </SectionPage>
  )
}
