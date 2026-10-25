import { LanguageSpecimen } from "../locale-language.js"
import { useState, type ReactNode } from "react"
import { DirectionProvider, localeDirection, useDirection, type TextDirection, LocaleProvider, useLocale } from "../../lib/locale/index.js"
import { DateField, TimeInput } from "../../ui/date-picker/index.js"
import { Field } from "../../ui/field/index.js"
import { FormStack } from "../../ui/form/index.js"
import { MoneyInput } from "../../ui/money-field/index.js"
import { NumberField } from "../../ui/number-field/index.js"
import { SectionPage, Specimen } from "../kit.js"
import { Breadcrumb } from "../../ui/breadcrumb/index.js"
import { Button } from "../../ui/button/index.js"
import { Menu } from "../../ui/menu/index.js"
import { Pagination } from "../../ui/pagination/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { Sheet } from "../../ui/sheet/index.js"
import { Slider } from "../../ui/slider/index.js"
import { SplitPane } from "../../ui/split-pane/index.js"
import { Switch } from "../../ui/switch/index.js"
import { Tabs } from "../../ui/tabs/index.js"
import { Tree } from "../../ui/tree/index.js"

const ITEMS = [{ value: "first", label: "First" }, { value: "second", label: "Second" }, { value: "third", label: "Third" }]

/** A direction region and its portalled overlays. */
function DirectionDemo() {
  const inherited = useDirection()
  const [direction, setDirection] = useState<TextDirection>(inherited)
  const [page, setPage] = useState(0)
  return <div className="flex min-w-0 flex-col gap-4">
    <Segmented aria-label="Reading direction" value={direction} onValueChange={setDirection} options={[
      { value: "ltr", label: "Left to right" }, { value: localeDirection("ar"), label: "Right to left" },
    ]} />
    <DirectionProvider direction={direction}>
      <div dir={direction} data-testid="direction-demo" className="flex min-w-0 flex-col gap-4">
        <Breadcrumb items={[{ id: "library", label: "Library", onSelect: () => {} }, { id: "documents", label: "Documents" }]} />
        <Tabs.Root defaultValue="first"><Tabs.List items={ITEMS} aria-label="Direction tabs" /></Tabs.Root>
        <Segmented options={ITEMS} defaultValue="first" collapse="none" aria-label="Direction segments" />
        <Slider defaultValue={30} aria-label="Direction level" bubble="never" />
        <Switch aria-label="Direction switch" />
        <Pagination label="Direction pages" pageIndex={page} pageSize={10} pageRows={10} rowCount={40} onPageChange={setPage} />
        <div className="h-44 min-w-0" data-testid="direction-split">
          <SplitPane collapseBelow={0} startMin={0} endMin={0} startLabel="Folders" endLabel="Details"
            start={<Tree aria-label="Direction folders" nodes={[{ id: "folder", label: "Documents", children: [{ id: "draft", label: "Draft" }] }]} />}
            end={<span className="type-body">Document details</span>} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Sheet.Root side="start">
            <Sheet.Trigger render={<Button>Open start sheet</Button>} />
            <Sheet.Popup><Sheet.Header title="Start sheet" /><Sheet.Body>Document details</Sheet.Body></Sheet.Popup>
          </Sheet.Root>
          <Menu.Root>
            <Menu.Trigger render={<Button>Direction menu</Button>} />
            <Menu.Popup><Menu.Submenu label="Export"><Menu.Item>Document</Menu.Item></Menu.Submenu></Menu.Popup>
          </Menu.Root>
        </div>
      </div>
    </DirectionProvider>
  </div>
}

const ISLAND_LOCALES = [
  { value: "en-US", label: "en-US" },
  { value: "en-GB", label: "en-GB" },
  { value: "de-DE", label: "de-DE" },
]

/** The same stored values, formatted by whichever locale encloses them. */
function Values({ heading }: { heading: ReactNode }) {
  const locale = useLocale()
  return (
    <div className="flex min-w-0 flex-col gap-3" data-locale-sample={locale}>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">{heading}</div>
      <FormStack>
        <Field label="Date">
          <DateField defaultValue="2026-10-03" />
        </Field>
        <Field label="Time">
          <TimeInput defaultValue="21:05" />
        </Field>
        <Field label="Amount">
          <MoneyInput defaultValue={123450} />
        </Field>
        <Field label="Count">
          <NumberField defaultValue={1284.5} format={{ maximumFractionDigits: 1 }} />
        </Field>
      </FormStack>
    </div>
  )
}


export default function LocaleSection() {
  const [island, setIsland] = useState("en-US")
  return (
    <SectionPage>
      <LanguageSpecimen />
      <Specimen title="Reading direction" description="Set the region’s dir attribute and DirectionProvider to the same direction. Menus, sheets and keyboard controls share the context.">
        <DirectionDemo />
      </Specimen>
      <Specimen
        title="A LocaleProvider region"
        description={
          <>
            A component&apos;s <code>locale</code> prop wins, then the nearest <code>LocaleProvider</code>, then{" "}
            <code>configureLocale()</code>, then the page&apos;s <code>&lt;html lang&gt;</code>, then en-US.
          </>
        }
        layout="grid"
      >
        <Values
          heading={
            <span className="type-label">
              Page <code>&lt;html lang&gt;</code>
            </span>
          }
        />
        <LocaleProvider locale={island}>
          <Values
            heading={
              <>
                <span className="type-label">LocaleProvider</span>
                <Segmented size="sm" options={ISLAND_LOCALES} value={island} onValueChange={setIsland} aria-label="Provider locale" />
              </>
            }
          />
        </LocaleProvider>
      </Specimen>
    </SectionPage>
  )
}
