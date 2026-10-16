import { useState } from "react"
import { ContainerLab, Example, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconEndpoint, IconGlobe, IconMail, IconOrganisation, IconSearch, IconTag } from "../../icons/generated/icons.js"
import { Autocomplete } from "../../ui/autocomplete/index.js"
import { Combobox } from "../../ui/combobox/index.js"
import { Field } from "../../ui/field/index.js"
import { FormStack } from "../../ui/form/index.js"
import { MultiSelect } from "../../ui/multi-select/index.js"
import type { SelectSize } from "../../ui/select/index.js"
import { TagInput } from "../../ui/tag-input/index.js"
import { LABEL_SUGGESTIONS, ORGANISATIONS, TAGS } from "./forms.fixtures.js"
import { endpointSource, flakySource, organisationSource, raceSource } from "./forms.sources.js"

const SIZES: SelectSize[] = ["sm", "md", "lg"]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const validateEmail = (value: string) => (EMAIL.test(value) ? null : "Enter an email such as name@example.com.au")

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*)(\.[a-z0-9](-?[a-z0-9])*)*$/i
const validateHost = (value: string) => (IPV4.test(value) || HOSTNAME.test(value) ? null : "Not an IPv4 address or hostname")

/** A TagInput in a Field, with the first chip problem in the message line. */
function Recipients() {
  const [error, setError] = useState<string>()
  return (
    <Field label="Send the report to" hint="Paste a list — commas, semicolons or new lines." error={error}>
      <TagInput
        icon={<IconMail />}
        defaultValue={["avery.quinn@orbit.example.com.au", "mira.rowan@northstar.example"]}
        normalize={(value) => value.toLowerCase()}
        validate={validateEmail}
        onErrorChange={setError}
        placeholder="name@example.com.au"
        max={10}
        aria-label="Send the report to"
      />
    </Field>
  )
}

function Hosts() {
  const [error, setError] = useState<string>()
  return (
    <Field label="Allowed hosts" hint="IPv4 addresses or hostnames, one per line when pasting." error={error}>
      <TagInput icon={<IconGlobe />} validate={validateHost} onErrorChange={setError} normalize={(value) => value.toLowerCase()} placeholder="10.20.0.10 or files.northstar.local" />
    </Field>
  )
}

export default function ComboboxSection() {
  return (
    <SectionPage>
      <Specimen
        title="Autocomplete"
        description="Free text with suggestions as you type — search boxes, hostnames, paths. Choosing a suggestion fills the text; anything else may be typed. 1,284 endpoints answer in 150–600 ms; earlier results stay while new ones load (the thin line), and only the latest query ever renders."
      >
        <FormStack>
          <Field label="Hostname" hint="Focus to see recent endpoints.">
            <Autocomplete source={endpointSource} icon={<IconSearch />} placeholder="NST, ORB, user name…" />
          </Field>
          <Field label="Share path" optional>
            <Autocomplete
              options={[
                { value: "\\\\nst-server\\shared", label: "\\\\nst-server\\shared", description: "NST-SERVER" },
                { value: "\\\\nst-server\\finance", label: "\\\\nst-server\\finance", description: "NST-SERVER" },
                { value: "\\\\orb-nas\\scans", label: "\\\\orb-nas\\scans", description: "LMN-NAS" },
              ]}
              placeholder="\\\\server\\share"
            />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen
        title="Combobox"
        description="Choose exactly one item. Static lists filter as you type (case and accents ignored, matches emphasised); a source searches the server. Arrows move, Enter chooses, Esc closes then clears."
      >
        <FormStack>
          <Field label="Endpoint">
            <Combobox source={endpointSource} icon={<IconEndpoint />} placeholder="Hostname, user or serial" />
          </Field>
          <Field label="Organisation" hint="A static list of 10.">
            <Combobox options={ORGANISATIONS} icon={<IconOrganisation />} defaultValue="northstar" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Sizes and states" wide>
        <Matrix
          columns={["Empty", "Chosen", "Read-only", "Invalid", "Disabled"]}
          rows={SIZES.map((size) => ({
            label: size,
            cells: [
              <Combobox key="a" size={size} options={ORGANISATIONS} placeholder="Find an organisation" aria-label={`Organisation ${size}`} className="w-64" />,
              <Combobox key="b" size={size} options={ORGANISATIONS} defaultValue="northstar" icon={<IconOrganisation />} aria-label={`Chosen ${size}`} className="w-64" />,
              <Combobox key="c" size={size} options={ORGANISATIONS} defaultValue="orbit" readOnly aria-label={`Read-only ${size}`} className="w-64" />,
              <Combobox key="d" size={size} options={ORGANISATIONS} invalid placeholder="Find an organisation" aria-label={`Invalid ${size}`} className="w-64" />,
              <Combobox key="e" size={size} options={ORGANISATIONS} defaultValue="cedarvale" disabled aria-label={`Disabled ${size}`} className="w-64" />,
            ],
          }))}
        />
      </Specimen>

      <Specimen
        title="List states"
        description="Open each one. Rows of every state are exactly one option tall, so nothing jumps when results arrive."
      >
        <FormStack>
          <Field label="Loading" hint="Skeleton rows on the first load.">
            <Combobox options={[]} loading placeholder="Hostname, user or serial" icon={<IconEndpoint />} />
          </Field>
          <Field label="At least 2 characters" hint="Type one character.">
            <Combobox source={organisationSource} placeholder="Find an organisation" icon={<IconOrganisation />} />
          </Field>
          <Field label="Error and retry" hint="Type anything: the first attempt fails, Retry succeeds.">
            <Combobox source={flakySource} placeholder="Hostname" icon={<IconEndpoint />} />
          </Field>
          <Field label="No matches" hint="Type anything: the empty row names the query.">
            <Combobox options={[]} placeholder="Hostname, user or serial" icon={<IconEndpoint />} />
          </Field>
          <Field label="Latest wins" hint="One-character queries answer slowly, longer ones fast; type quickly." data-testid="race">
            <Combobox source={raceSource} placeholder="Type quickly" icon={<IconSearch />} />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen
        title="Multi-select"
        description="Choose several; choices become chips. In a form they wrap onto more lines; in a toolbar or a table row they stay on one line and fold into +N (its tooltip lists them). Backspace removes the last choice; ← walks the chips."
      >
        <FormStack>
          <Field label="Notify on failure" hint="Searched on the server, at least 2 characters.">
            <MultiSelect wrap source={organisationSource} defaultValue={[]} placeholder="Add organisations" icon={<IconOrganisation />} />
          </Field>
          <Field label="Tags">
            <MultiSelect wrap options={TAGS} defaultValue={["production", "all-in-one", "front-counter", "finance"]} placeholder="Add tags" icon={<IconTag />} />
          </Field>
          <Field label="One line" hint="width=&quot;medium&quot;, no wrap: the rest fold into +N.">
            <MultiSelect width="medium" options={TAGS} defaultValue={["production", "all-in-one", "front-counter", "finance"]} placeholder="Add tags" />
          </Field>
          <Field label="Read-only">
            <MultiSelect options={TAGS} defaultValue={["finance", "reception"]} readOnly />
          </Field>
          <Field label="Invalid" error="Add at least one tag">
            <MultiSelect options={TAGS} invalid placeholder="Add tags" />
          </Field>
          <Field label="Disabled" disabled>
            <MultiSelect options={TAGS} defaultValue={["loaner"]} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen
        title="Chips you type"
        description="TagInput: Enter, comma, semicolon or Tab makes a chip; pasting a list adds them all. Values are tidied and de-duplicated — adding one again flashes the existing chip. Invalid chips stay, in danger, with the reason as their tooltip and in the message line. Enter or a double-click edits a chip."
      >
        <FormStack>
          <Recipients />
          <Hosts />
          <Field label="Labels" hint="Suggestions, or create your own.">
            <TagInput suggestions={LABEL_SUGGESTIONS} defaultValue={["Front counter"]} placeholder="Add a label" icon={<IconTag />} />
          </Field>
          <Field label="Disabled" disabled>
            <TagInput defaultValue={["kiosk"]} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Sizes" description="Chips are as tall as the inner buttons, so a one-line box keeps its height.">
        {SIZES.map((size) => (
          <Example key={size} label={size}>
            <MultiSelect size={size} options={TAGS} defaultValue={["production", "kiosk"]} aria-label={`Tags ${size}`} className="w-72 max-w-full" />
          </Example>
        ))}
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Combobox options={ORGANISATIONS} defaultValue="northstar" aria-label="Organisation over imagery" className="w-72 max-w-full" />
        <MultiSelect options={TAGS} defaultValue={["production", "all-in-one"]} aria-label="Tags over imagery" className="w-72 max-w-full" />
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" ? (
            <div className="flex h-full items-center gap-2 px-1">
              <Combobox size="sm" options={ORGANISATIONS} defaultValue="cedarvale" aria-label="Organisation" className="w-64" />
              <MultiSelect size="sm" options={TAGS} defaultValue={["production", "all-in-one", "front-counter", "finance"]} aria-label="Tags" />
            </div>
          ) : preset?.id === "header" ? (
            <div className="flex h-full items-center px-2">
              <TagInput wrap={false} defaultValue={["avery.quinn@orbit.example.com.au", "mira.rowan@northstar.example", "it@northstar.example"]} aria-label="Recipients" />
            </div>
          ) : (
            <div className="h-full overflow-y-auto" data-scroll-container>
              <FormStack className="p-3">
                <Field label="Organisation">
                  <Combobox options={ORGANISATIONS} defaultValue="cedarvale" />
                </Field>
                <Field label="Tags">
                  <MultiSelect wrap options={TAGS} defaultValue={["production", "all-in-one", "front-counter", "finance"]} />
                </Field>
                <Field label="Recipients">
                  <TagInput defaultValue={["avery.quinn@orbit.example.com.au", "it@northstar.example"]} />
                </Field>
              </FormStack>
            </div>
          )
        }
      </ContainerLab>

      <Rules
        do={[
          "Use Autocomplete when any text is allowed and suggestions only help.",
          "Use a Combobox (one) or MultiSelect (many) when the value must come from the list.",
          "Use a TagInput for free-entry lists: recipients, hosts, labels.",
          "Search large lists with a source; keep it debounced and cancellable.",
          "State the query in the empty row: No matches for “orb-7”.",
        ]}
        dont={[
          "Show a spinner instead of skeleton rows, or blank the list while refreshing.",
          "Render a slow, stale response over a newer query.",
          "Drop an invalid pasted value silently; keep it and say why.",
          "Let chips wrap in a toolbar or table row — fold them into +N.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--item-h", "Row, skeleton row and state row height"],
          ["--fg-muted", "Unmatched text while searching"],
          ["--weight-semibold", "Matched text"],
          ["--accent-soft", "Refresh line track"],
          ["--control-h-xs", "Chip height (md)"],
          ["--radius-badge", "Chip corner"],
          ["--fill-muted", "Chip fill"],
          ["--danger-soft", "Invalid chip fill"],
          ["--duration-slower", "Duplicate flash"],
        ]}
      />
    </SectionPage>
  )
}
