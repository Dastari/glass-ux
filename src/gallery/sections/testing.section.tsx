import { useState } from "react";
import { Button } from "../../ui/button/index.js";
import { Select } from "../../ui/select/index.js";
import { Combobox } from "../../ui/combobox/index.js";
import { Menu } from "../../ui/menu/index.js";
import { DateField } from "../../ui/date-picker/index.js";
import { Switch } from "../../ui/switch/index.js";
import { Field } from "../../ui/field/index.js";
import { FormStack } from "../../ui/form/index.js";
import {
  createDataTableColumns,
  DataTable,
} from "../../ui/data-table/index.js";
import { Toaster, toast } from "../../ui/toast/index.js";
import { SectionPage, Specimen } from "../kit.js";

interface Record {
  id: string;
  name: string;
}
const rows: Record[] = [
  { id: "northstar", name: "Northstar Studio" },
  { id: "harbour", name: "Harbour Workshop" },
];
const columns = createDataTableColumns<Record>();
const fields = columns.columns([
  columns.accessor("name", { header: "Name", pin: true }),
]);
const options = rows.map((row) => ({ value: row.id, label: row.name }));

export default function TestingSection() {
  const [chosen, setChosen] = useState("No action chosen");
  return (
    <SectionPage>
      <Specimen layout="stack" title="Interaction fixture">
        <div
          className="flex min-w-0 flex-col gap-3"
          data-testid="testing-fixture"
        >
          <FormStack>
            <Field label="Organisation">
              <Select options={options} placeholder="Choose an organisation" />
            </Field>
            <Field label="Find organisation">
              <Combobox options={options} />
            </Field>
            <Field label="Review date">
              <DateField />
            </Field>
            <Switch label="Send reports" />
          </FormStack>
          <Menu.Root>
            <Menu.Trigger render={<Button>Record actions</Button>} />
            <Menu.Popup>
              <Menu.Item onClick={() => setChosen("Record archived")}>
                Archive record
              </Menu.Item>
            </Menu.Popup>
          </Menu.Root>
          <output className="min-h-6">{chosen}</output>
          <DataTable
            id="testing-records"
            label="Sample records"
            rows={rows}
            columns={fields}
            getRowId={(row) => row.id}
            height="auto"
            selectable={false}
          />
          <Button onClick={() => toast.success("Reports queued")}>
            Queue reports
          </Button>
          <Toaster />
        </div>
      </Specimen>
    </SectionPage>
  );
}
