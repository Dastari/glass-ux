"use client";
import { createDataTableColumns, DataTable } from "glass-ux/data-table";

interface Row {
  id: string;
  name: string;
}
const col = createDataTableColumns<Row>();
const columns = col.columns([
  col.accessor("name", { header: "Name", pin: true }),
]);
const rows = [{ id: "northstar-1", name: "Northstar Studio" }];

export function FixtureTable() {
  return (
    <DataTable
      id="next-fixture"
      label="Organisations"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      selectable={false}
      height="auto"
    />
  );
}
