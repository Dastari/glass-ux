import { Button } from "glass-ux/button";
import { Panel, PanelBody, PanelHeader } from "glass-ux/surface";
import { Tooltip } from "glass-ux/tooltip";
import { IconSearch } from "glass-ux/icons";
import { getLocale } from "glass-ux/locale";
import { emailSchema } from "glass-ux/email-field";
import { formatMoney } from "glass-ux/money-field";
import { FixtureTable } from "./table";

// This remains a server page. Calling these proves that pure exports in component
// barrels were not accidentally converted into client references by the build.
export default function Page() {
  const email = emailSchema({ required: true }).parse(
    "avery@northstar.example",
  );
  return (
    <main>
      <Panel>
        <PanelHeader title="Release fixture" />
        <PanelBody>
          <p>
            {getLocale()} · {email} · {formatMoney(12500)}
          </p>
          <Tooltip content="Find a record">
            <Button icon={<IconSearch />}>Search</Button>
          </Tooltip>
          <FixtureTable />
        </PanelBody>
      </Panel>
    </main>
  );
}
