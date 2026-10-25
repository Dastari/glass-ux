// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "../lib/locale/index.js"
import { configureMessages, MessagesProvider, registerMessagePack } from "../lib/i18n/index.js"
import { Pagination } from "../ui/pagination/index.js"
import { DateField, TimeInput } from "../ui/date-picker/index.js"
import { Metric } from "../ui/metric/index.js"
import { LoginFlow } from "../ui/login-flow/index.js"
import { ContextSwitcher } from "../shell/context-switcher/index.js"
import { WindowFrame } from "../windows/index.js"
import { Composer } from "../ai/composer/index.js"
import { TooltipProvider } from "../ui/tooltip/index.js"
import { emailSchema } from "../ui/email-field/index.js"
import { configureLocale } from "../lib/locale/index.js"
import de from "./de.js"

beforeEach(() => {
  registerMessagePack(de)
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => { cleanup(); configureMessages({}); configureLocale("en-AU"); vi.unstubAllGlobals() })

function Region({ children, locale = "de" }: { children: React.ReactNode; locale?: string }) {
  return <TooltipProvider><LocaleProvider locale={locale}>{children}</LocaleProvider></TooltipProvider>
}

describe("language packs in rendered components", () => {
  it("keeps nested controls in an explicit locale above the surrounding provider", async () => {
    render(<Region locale="en-AU"><Metric label="Traffic" value={12} delta={2} locale="de" /><TimeInput aria-label="Sample time" defaultValue="09:30" locale="de" /></Region>)
    expect(screen.getByRole("img", { name: "Aufwärts" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Wählen Sie eine Zeit" }))
    expect(await screen.findByRole("listbox", { name: "Zeiten" })).toBeInTheDocument()
  })

  it("ui: changes pagination and date controls in place, preserving state and explicit wording", () => {
    const view = render(<Region><Pagination pageIndex={1} pageSize={10} pageRows={10} rowCount={50} /><DateField aria-label="Date value" defaultValue="2026-10-03" /></Region>)
    const next = screen.getByRole("button", { name: "Nächste Seite" })
    expect(screen.getByRole("button", { name: "Datum auswählen" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Date value" })).toHaveValue("03.10.2026")
    view.rerender(<Region locale="en-AU"><Pagination pageIndex={1} pageSize={10} pageRows={10} rowCount={50} /><DateField aria-label="Date value" defaultValue="2026-10-03" /></Region>)
    expect(screen.getByRole("button", { name: "Next page" })).toBe(next)
    expect(screen.getByRole("textbox", { name: "Date value" })).toHaveValue("03/10/2026")
  })

  it("shell: translates the switcher and keeps labels overrides above providers", () => {
    render(<Region><MessagesProvider messages={{ contextSwitcher: { all: "Gesamte Auswahl" } }}><ContextSwitcher items={[]} value={null} onValueChange={() => {}} labels={{ title: "Bereich" }} /></MessagesProvider></Region>)
    expect(screen.getByRole("combobox", { name: "Bereich: Gesamte Auswahl" })).toBeInTheDocument()
  })

  it("windows: names each window control in German", () => {
    render(<Region><WindowFrame.Controls title="Cedar" onClose={() => {}} onMinimise={() => {}} onToggleMaximise={() => {}} /></Region>)
    expect(screen.getByRole("button", { name: "Cedar schließen" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cedar minimieren" })).toBeInTheDocument()
  })

  it("ai: translates the composer, retaining the send control during a run", () => {
    const view = render(<Region><Composer value="Cedar" onSend={() => {}} onStop={() => {}} /></Region>)
    const send = screen.getByRole("button", { name: "Senden" })
    send.focus()
    view.rerender(<Region><Composer value="Cedar" run="running" onSend={() => {}} onStop={() => {}} /></Region>)
    expect(screen.getByRole("button", { name: "Antwort stoppen" })).toBe(send)
    expect(document.activeElement).toBe(send)
  })

  it("keeps LoginFlow ReactNode labels and uses translated defaults for the rest", () => {
    render(<Region><LoginFlow onSignIn={async () => ({ status: "success" })} labels={{ signInTitle: <span>Produktzugang</span> }} /></Region>)
    expect(screen.getByText("Produktzugang")).toBeInTheDocument()
    expect(screen.getByLabelText("Passwort", { exact: true })).toBeInTheDocument()
  })

  it("validates in an explicit locale and resolves a schema's configured locale at validation time", () => {
    const schema = emailSchema({ required: true })
    configureLocale("de")
    const result = schema.safeParse("")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Geben Sie eine E-Mail-Adresse ein")
    expect(emailSchema({ required: true, locale: "en-AU" }).safeParse("").success).toBe(false)
  })
})
