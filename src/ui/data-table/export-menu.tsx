import { Button } from "../button/index.js";
import { Menu } from "../menu/index.js";
import { useDataTableMessages } from "./use-messages.js";
export function ExportMenu({ run }: { run: (format: "csv" | "tsv") => void }) {
  const m = useDataTableMessages();
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button size="sm">{m.export}</Button>} />
      <Menu.Popup align="end" aria-label={m.export}>
        <Menu.Item onClick={() => run("csv")}>{m.downloadCsv}</Menu.Item>
        <Menu.Item onClick={() => run("tsv")}>{m.copyTable}</Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  );
}
