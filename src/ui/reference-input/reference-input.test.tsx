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

describe("ReferenceInput read-only row", () => {
  it("sets the relation and chip in the same parts as the editable row", () => {
    const { container } = render(
      <ReferenceInput
        aria-label="Linked from"
        direction="from"
        kinds={[{ id: "person", noun: "Person", plural: "People" }]}
        relations={[{ value: "owner", label: "Owner", inverseLabel: "Owns", kinds: ["person"] }]}
        value={[{ target: { kind: "person", id: "p-1", label: "Sample person" }, relation: "owner" }]}
      />,
    );
    const parts = container.querySelector(".fa-ref-chip .fa-ref-chip-parts");
    expect(parts?.querySelector(".fa-ref-relation")?.textContent).toBe("Owns");
    expect(parts?.querySelector(".fa-entity, .fa-ref-chip-parts > *:last-child")).toBeTruthy();
  });
});

