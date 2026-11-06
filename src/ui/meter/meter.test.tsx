// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { resolve } from "node:path"
import ts from "typescript"
import { afterEach, describe, expect, it } from "vitest"
import { MeterCell } from "../meter-cell/index.js"
import { Meter } from "./index.js"

afterEach(cleanup)

const root = (name: string) => screen.getByRole("meter", { name }).closest(".fa-meter")!

describe("Meter tone", () => {
  it("stays neutral unless the data tone is asked for", () => {
    render(<Meter value={40} aria-label="Archive volume" />)
    expect(root("Archive volume")).not.toHaveAttribute("data-tone")
    expect(root("Archive volume")).toHaveAttribute("data-level", "normal")
  })

  it("marks the data tone and keeps the thresholds, name and reading", () => {
    render(
      <>
        <Meter tone="data" value={74} max={100} aria-label="Healthy" valueText="74 GB of 100 GB" />
        <Meter tone="data" value={75} max={100} aria-label="Warning" />
        <Meter tone="data" value={90} max={100} aria-label="Danger" />
      </>
    )
    const healthy = screen.getByRole("meter", { name: "Healthy" })
    expect(healthy).toHaveAttribute("aria-valuetext", "74 GB of 100 GB")
    expect(healthy).toHaveAttribute("aria-valuenow", "74")
    expect(root("Healthy")).toHaveAttribute("data-tone", "data")
    expect(root("Healthy")).toHaveAttribute("data-level", "normal")
    expect(root("Warning")).toHaveAttribute("data-level", "warning")
    expect(root("Danger")).toHaveAttribute("data-level", "danger")
  })

  it("passes through MeterCell", () => {
    render(
      <>
        <MeterCell tone="data" label="Media volume used" value={42} max={50} valueText="42 GB of 50 GB" />
        <MeterCell label="Seats used" value={8} max={10} valueText="8 / 10" />
      </>
    )
    const cell = screen.getByRole("meter", { name: "Media volume used" })
    expect(cell).toHaveAttribute("aria-valuetext", "42 GB of 50 GB")
    expect(root("Media volume used")).toHaveAttribute("data-tone", "data")
    expect(root("Media volume used")).toHaveAttribute("data-level", "warning")
    expect(root("Seats used")).not.toHaveAttribute("data-tone")
  })
})

describe("Meter tone public types", () => {
  // Compiles a consumer file against the public entry modules.
  function diagnostics(source: string) {
    const file = resolve("src/ui/meter/__tone-consumer__.tsx")
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
      types: [],
    }
    const host = ts.createCompilerHost(options)
    const getSourceFile = host.getSourceFile
    host.getSourceFile = (name, language, ...rest) =>
      name === file ? ts.createSourceFile(name, source, language) : getSourceFile.call(host, name, language, ...rest)
    const fileExists = host.fileExists
    host.fileExists = (name) => name === file || fileExists.call(host, name)
    const program = ts.createProgram([file], options, host)
    return ts
      .getPreEmitDiagnostics(program, program.getSourceFile(file))
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
  }

  it("accepts neutral and data on Meter and MeterCell, and nothing else", () => {
    const accepted = diagnostics(`
      import { Meter, type MeterProps } from "./index.js"
      import { MeterCell, type MeterCellProps } from "../meter-cell/index.js"
      const tones: NonNullable<MeterProps["tone"]>[] = ["neutral", "data"]
      const cell: MeterCellProps = { label: "Disk", value: 1, tone: "data", warningAt: 0.75, dangerAt: 0.9 }
      export const views = [tones, <Meter value={1} tone="neutral" />, <MeterCell {...cell} />, <Meter value={1} />]
    `)
    expect(accepted).toEqual([])
    const rejected = diagnostics(`
      import { MeterCell } from "../meter-cell/index.js"
      export const view = <MeterCell label="Disk" value={1} tone="accent" />
    `)
    expect(rejected.join("\n")).toMatch(/"accent"/)
  }, 60_000)
})

describe("Meter success tone", () => {
  const meter = (props: { value: number; warningAt?: number; dangerAt?: number }) => {
    const { container } = render(<Meter max={40} tone="success" aria-label="Seats" {...props} />);
    return container.querySelector<HTMLElement>(".fa-meter")!;
  };

  it("stays green when full, with no threshold mark", () => {
    const root = meter({ value: 40 });
    expect(root.dataset.tone).toBe("success");
    expect(root.dataset.level).toBe("normal");
    expect(root.hasAttribute("data-unmarked")).toBe(true);
  });

  it("uses thresholds a host sets", () => {
    const root = meter({ value: 40, dangerAt: 0.9 });
    expect(root.dataset.level).toBe("danger");
    expect(root.hasAttribute("data-unmarked")).toBe(false);
  });

  it("leaves the other tones' thresholds alone", () => {
    const { container } = render(<Meter value={40} max={40} aria-label="Disk" />);
    const root = container.querySelector<HTMLElement>(".fa-meter")!;
    expect(root.dataset.level).toBe("danger");
    expect(root.hasAttribute("data-tone")).toBe(false);
  });
});
