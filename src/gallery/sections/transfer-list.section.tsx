import { useMemo, useState } from "react"
import { TransferList } from "../../ui/transfer-list/index.js"
import { CONTAINER_PRESETS, ContainerLab, Rules, SectionPage, Specimen } from "../kit.js"
import { PERMISSIONS, manyMembers } from "./pickers.fixtures.js"

function PermissionsDemo() {
  const [value, setValue] = useState<string[]>(["assets.view", "orders.view", "admin.billing"])
  return (
    <div className="flex w-full flex-col gap-2">
      <TransferList items={PERMISSIONS} value={value} onValueChange={setValue} labels={{ available: "Not granted", assigned: "Granted" }} aria-label="Technician permissions" />
      <p className="type-caption text-fg-muted" data-numeric>
        value: {JSON.stringify(value)}
      </p>
    </div>
  )
}

function MembersDemo() {
  const members = useMemo(() => manyMembers(5000), [])
  return <TransferList items={members} defaultValue={["m-12", "m-48", "m-301"]} labels={{ available: "People", assigned: "Members" }} aria-label="Night shift members" />
}

function OrderDemo() {
  return (
    <TransferList
      orderable
      grouped={false}
      items={PERMISSIONS.filter((item) => item.group === "Reports" || item.group === "Work orders")}
      defaultValue={["orders.approve", "reports.view", "orders.view"]}
      labels={{ available: "Columns", assigned: "Shown, in order" }}
      aria-label="Report columns"
    />
  )
}

export default function TransferListSection() {
  return (
    <SectionPage>
      <Specimen title="Permissions" description="Grouped items, checkboxes and a select-all box per list. The buttons move the selected items or everything listed; Enter or a double-click moves too. Disabled permissions stay put and say why." layout="stack" wide>
        <PermissionsDemo />
      </Specimen>

      <Specimen title="Thousands of items" description="5,000 people: both lists are virtualised, and the search narrows Move all to the matches." layout="stack" wide>
        <MembersDemo />
      </Specimen>

      <Specimen title="Ordered" description="With orderable, assigned rows drag by their grip, and Alt+↑ or Alt+↓ moves the focused row. Reordering pauses while the list is searched." layout="stack" wide>
        <OrderDemo />
      </Specimen>

      <ContainerLab presets={CONTAINER_PRESETS.filter((preset) => preset.id !== "row" && preset.id !== "header")}>
        <div className="h-full p-1">
          <TransferList className="h-full" items={PERMISSIONS} defaultValue={["reports.view"]} aria-label="Permissions" />
        </div>
      </ContainerLab>

      <Rules
        do={[
          "Name the lists by meaning (Granted, Members) through labels.",
          "Give every disabled item a disabledReason.",
          "Give the component a height from its container; the lists fill it.",
        ]}
        dont={["Use a TransferList for a handful of options; use checkboxes or a MultiSelect.", "Make order meaningful without orderable: the assigned list then follows the order items were moved in."]}
      />
    </SectionPage>
  )
}
