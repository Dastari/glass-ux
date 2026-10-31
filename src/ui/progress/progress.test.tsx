// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { LocaleProvider } from "../../lib/locale/index.js"
import { Meter } from "../meter/index.js"
import { Progress, ProgressRing } from "./progress.js"

afterEach(cleanup)

describe("percentages", () => {
  it("read as before in English", () => {
    render(<Progress value={42} label="Install" />)
    expect(screen.getByText("42%")).toBeTruthy()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "42%")
  })

  it("follow the locale's spacing and digits", () => {
    render(
      <>
        <LocaleProvider locale="de">
          <Progress value={42} label="Installieren" />
          <Meter value={50} aria-label="Speicher" />
        </LocaleProvider>
        <LocaleProvider locale="ar-EG">
          <ProgressRing value={42} size="lg" aria-label="Ring" />
        </LocaleProvider>
      </>,
    )
    expect(screen.getByRole("progressbar", { name: "Installieren" })).toHaveAttribute("aria-valuetext", expect.stringMatching(/^42\s%$/))
    expect(screen.getByRole("meter", { name: "Speicher" })).toHaveAttribute("aria-valuetext", expect.stringMatching(/^50\s%$/))
    expect(screen.getByRole("progressbar", { name: "Ring" })).toHaveAttribute("aria-valuetext", "٤٢٪؜")
  })
})
