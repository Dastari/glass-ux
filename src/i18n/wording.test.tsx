// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { configureMessages, registerMessagePack, resolveMessages, type MessageDescriptor, type MessageSet } from "../lib/i18n/index.js"
import { configureLocale, LocaleProvider } from "../lib/locale/index.js"
import { TooltipProvider } from "../ui/tooltip/index.js"
import { actionsMessages } from "../ui/actions/messages.js"
import { referenceInputMessages } from "../ui/reference-input/messages.js"
import { resultsMessages } from "../ai/results/messages.js"
import { toolActivityMessages } from "../ai/tool-activity/messages.js"
import { metricMessages } from "../ui/metric/messages.js"
import { dataTableMessages } from "../ui/data-table/messages.js"
import { splitPaneMessages } from "../ui/split-pane/messages.js"
import { jsonTreeMessages } from "../ai/json-tree/messages.js"
import { mapMessages } from "../ui/map/messages.js"
import { topologyMessages } from "../ui/topology/messages.js"
import { ToolCallRow } from "../ai/tool-activity/index.js"
import { ResultDiff } from "../ai/results/index.js"
import { JsonTree } from "../ai/json-tree/index.js"
import { DefaultClusterPopup } from "../ui/map/index.js"
import { EMPTY_COUNTS } from "../ui/map/cluster.js"
import { formatCount } from "../ui/data-table/format.js"
import de from "./de.js"
import fr from "./fr.js"
import ar from "./ar.js"
import ja from "./ja.js"
import es from "./es.js"

const say = <N extends string, D extends MessageSet>(descriptor: MessageDescriptor<N, D>, locale: string): D => resolveMessages(descriptor.namespace, descriptor.defaults, locale)

beforeAll(() => {
  for (const pack of [de, fr, ar, ja, es]) registerMessagePack(pack)
})
afterEach(() => {
  cleanup()
  configureMessages({})
  configureLocale("en-AU")
  vi.unstubAllGlobals()
})

describe("text from application or translated words keeps its case", () => {
  it("names the overflow menu with the action as written", () => {
    expect(say(actionsMessages, "en").moreOptions("Export CSV")).toBe("More export csv options")
    expect(say(actionsMessages, "de").moreOptions("Export")).toBe("Weitere Optionen: Export")
    expect(say(actionsMessages, "fr").moreOptions("Exporter")).toBe("Plus d'options : Exporter")
  })

  it("lowercases for English only, inside the English message", () => {
    expect(say(referenceInputMessages, "en").noFor("Devices", "orb")).toBe("No devices for “orb”")
    expect(say(referenceInputMessages, "de").noFor("Geräte", "orb")).toBe("Keine Treffer für „orb“ (Geräte)")
    expect(say(referenceInputMessages, "en").noMatchesFor("orb")).toBe("No matches for “orb”")
    expect(say(toolActivityMessages, "en").copy("Arguments")).toBe("Copy arguments")
    expect(say(toolActivityMessages, "de").copy("Argumente")).toBe("Argumente kopieren")
    expect(say(toolActivityMessages, "en").rowLabel({ label: "Ran query", status: "Done" })).toBe("Ran query, done")
    expect(say(toolActivityMessages, "de").rowLabel({ label: "Abfrage", status: "Fertig" })).toBe("Abfrage, Fertig")
    const summary = { label: "Traffic", range: "Last 24 Hours", minimum: "1", average: "2", maximum: "3", current: "2" }
    expect(say(metricMessages, "en").minimumAverageMaximum(summary)).toBe("Traffic, last 24 hours: minimum 1, average 2, maximum 3, latest 2")
    expect(say(metricMessages, "de").minimumAverageMaximum({ ...summary, range: "Letzte 24 Stunden" })).toContain("Traffic, Letzte 24 Stunden: Minimum 1")
    expect(say(dataTableMessages, "en").dateCondition("Created", "Is After")).toBe("Created is after")
    expect(say(dataTableMessages, "de").dateCondition("Erstellt", "Nach")).toBe("Erstellt: Nach")
  })

  it("renders the tool row and its copy button with the pack's wording", () => {
    render(
      <TooltipProvider>
        <LocaleProvider locale="de">
          <ToolCallRow call={{ id: "c1", toolId: "sample.query", label: "Abfrage", status: "succeeded", args: { id: 1 }, result: { ok: true } }} defaultOpen />
        </LocaleProvider>
      </TooltipProvider>,
    )
    expect(screen.getByRole("button", { name: "Abfrage, Fertig" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Argumente kopieren" })).toBeInTheDocument()
  })
})

describe("whole messages instead of joined fragments", () => {
  it("writes verbs with their object in the language's order", () => {
    expect(say(splitPaneMessages, "en").hidePane("Filters")).toBe("Hide Filters")
    expect(say(splitPaneMessages, "de").hidePane("Filter")).toBe("Filter ausblenden")
    expect(say(jsonTreeMessages, "en").collapseNode("root")).toBe("Collapse root")
    expect(say(jsonTreeMessages, "de").expandNode("users")).toBe("users ausklappen")
    expect(say(jsonTreeMessages, "ja").expandNode("users")).toBe("usersを展開")
    expect(say(mapMessages, "en").mapLoadFailedAt("1.00000, 2.00000")).toBe("The map could not load. 1.00000, 2.00000")
    expect(say(dataTableMessages, "en").groupSummary({ label: "Online", count: "12 devices" })).toBe("Online, 12 devices")
    expect(say(dataTableMessages, "ar").groupSummary({ label: "A", count: "12" })).toBe("A، 12")
    expect(say(mapMessages, "de").showAll("12", "Standorte")).toBe("Alle 12 Standorte anzeigen")
    expect(say(topologyMessages, "en").clusterSummary({ label: "Storage", count: 1234, locale: "en-US" })).toBe("Storage, 1,234")
    expect(say(topologyMessages, "de").clusterSummary({ label: "Speicher", count: 1234, locale: "de-DE" })).toBe("Speicher, 1.234")
  })

  it("names the expand toggle with the node, in the page language", () => {
    render(<LocaleProvider locale="de"><JsonTree label="Argumente" value={{ users: [1, 2] }} /></LocaleProvider>)
    expect(screen.getByRole("button", { name: "Wurzel einklappen" })).toBeInTheDocument()
  })

  it("counts a diff's lines with the locale's plural rules", () => {
    const diff = (locale: string, added: number, removed: number) => say(resultsMessages, locale).diffSummary({ title: "Config", added, removed, locale })
    expect(diff("en-US", 1234, 1)).toBe("Config: 1,234 added, 1 removed")
    expect(diff("de-DE", 1, 2)).toBe("Config: 1 Zeile hinzugefügt, 2 Zeilen entfernt")
    expect(diff("fr", 0, 1)).toBe("Config : 0 ligne ajoutée, 1 ligne supprimée")
    expect(diff("ar", 2, 3)).toContain("سطران مضافان")
    expect(diff("ja", 3, 1)).toBe("Config: 3行追加、1行削除")
  })

  it("renders the diff region name from the component's locale", () => {
    const lines = [{ type: "add" as const, text: "a" }, { type: "remove" as const, text: "b" }, { type: "context" as const, text: "c" }]
    render(
      <TooltipProvider>
        <LocaleProvider locale="de">
          <ResultDiff result={{ type: "diff", title: "Konfiguration", lines } as never} />
        </LocaleProvider>
      </TooltipProvider>,
    )
    expect(screen.getByRole("region", { name: "Konfiguration: 1 Zeile hinzugefügt, 1 Zeile entfernt" })).toBeInTheDocument()
  })
})

describe("nouns follow the locale's plural categories", () => {
  const files = { one: "plik", few: "pliki", many: "plików", other: "pliku" }

  it("formats table counts with the right form", () => {
    expect(formatCount(1, files, "pl")).toBe("1 plik")
    expect(formatCount(3, files, "pl")).toBe("3 pliki")
    expect(formatCount(5, files, "pl")).toBe("5 plików")
    expect(formatCount(1.5, files, "pl")).toBe("2 pliku")
    expect(formatCount(1284, { one: "endpoint", other: "endpoints" }, "en-US")).toBe("1,284 endpoints")
    expect(formatCount(1, { one: "endpoint", other: "endpoints" }, "en-US")).toBe("1 endpoint")
    expect(formatCount(0, { one: "ligne", other: "lignes" }, "fr")).toBe("0 ligne")
  })

  it("titles a map cluster with the form for its size", () => {
    const cluster = { id: 1, lng: 0, lat: 0, points: [] }
    const noun = { one: "Standort", two: "zwei Standorte", other: "Standorte" }
    render(
      <LocaleProvider locale="ar">
        <DefaultClusterPopup cluster={cluster} size={2} counts={EMPTY_COUNTS} labels={{ critical: "C", warning: "W", healthy: "H", offline: "O" }} noun={noun} onZoom={() => {}} onOpen={() => {}} />
      </LocaleProvider>,
    )
    expect(screen.getByText("2 zwei Standorte")).toBeInTheDocument()
  })
})
