// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { IconTag } from "../../icons/generated/icons.js"
import { ReferenceInput } from "./reference-input.js"
import type { ReferenceSource } from "./references.js"

afterEach(cleanup)

const source: ReferenceSource = { search: async () => [] }
const kinds = [{ id: "tag", noun: "Tag", plural: "Tags", icon: IconTag }]

describe("ReferenceInput add label", () => {
  it("reads the message by default", () => {
    render(<ReferenceInput aria-label="Links" source={source} kinds={kinds} />)
    expect(screen.getByRole("button", { name: "Link…" })).toBeTruthy()
  })

  it("takes the instance's label", () => {
    render(<ReferenceInput aria-label="Tags" source={source} kinds={kinds} addLabel="Tag…" />)
    expect(screen.getByRole("button", { name: "Tag…" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Link…" })).toBeNull()
  })
})
