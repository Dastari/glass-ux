import { describe, expect, it } from "vitest"
import { IconUser } from "../../icons/generated/icons.js"
import { addLinks, initialRelation, orderTargets, referenceQuery, relationsFor, setRelation, stepKind, type ReferenceRelation, type ReferenceTarget } from "./references.js"

type Rel = "related" | "assigned-to" | "used-by" | "located-in"
const RELATIONS: ReferenceRelation<Rel>[] = [
  { value: "related", label: "Related" },
  { value: "assigned-to", label: "Assigned to", kinds: ["user"], exclusive: true },
  { value: "used-by", label: "Used by", kinds: ["user"] },
  { value: "located-in", label: "Located in", kinds: ["site"] },
]
const sam: ReferenceTarget = { kind: "user", id: "sam", label: "Jamie Wells", organisation: { id: "fa", name: "Orbit Workspace" } }
const mira: ReferenceTarget = { kind: "user", id: "mira", label: "Mira Rowan", organisation: { id: "northstar", name: "Northstar Studio" } }
const level2: ReferenceTarget = { kind: "site", id: "l2", label: "Level 2", organisation: { id: "fa", name: "Orbit Workspace" } }
const ricoh: ReferenceTarget = { kind: "device", id: "FA-RICOH-L2", label: "FA-RICOH-L2", organisation: { id: "fa", name: "Orbit Workspace" } }

describe("references", () => {
  it("offers only the relations a kind can take", () => {
    expect(relationsFor(level2, RELATIONS).map((r) => r.value)).toEqual(["related", "located-in"])
    expect(relationsFor(sam, RELATIONS).map((r) => r.value)).toEqual(["related", "assigned-to", "used-by"])
    expect(initialRelation(ricoh, RELATIONS, "related")).toBe("related")
  })

  it("skips duplicates and stops at the limit", () => {
    const first = addLinks([], [sam, ricoh], () => "related" as Rel)
    expect(first.links).toHaveLength(2)
    const again = addLinks(first.links, [sam], () => "related" as Rel)
    expect(again.duplicates).toEqual(["user:sam"])
    expect(again.links).toHaveLength(2)
    const capped = addLinks(first.links, [level2, mira], () => "related" as Rel, 3)
    expect(capped.links.map((link) => link.target.id)).toEqual(["sam", "FA-RICOH-L2", "l2"])
    expect(capped.overLimit).toBe(true)
  })

  it("moves an exclusive relation off the link that had it", () => {
    const links = [
      { target: sam, relation: "assigned-to" as Rel },
      { target: mira, relation: "used-by" as Rel },
    ]
    const next = setRelation(links, "user:mira", "assigned-to", RELATIONS, "related")
    expect(next.map((link) => link.relation)).toEqual(["related", "assigned-to"])
    // A non-exclusive relation leaves the others alone.
    expect(setRelation(next, "user:sam", "used-by", RELATIONS, "related").map((link) => link.relation)).toEqual(["used-by", "assigned-to"])
  })

  it("orders results by kind, the current organisation first", () => {
    const kinds = [{ id: "user" }, { id: "device" }, { id: "site" }]
    const ordered = orderTargets([level2, mira, ricoh, sam], kinds, "fa")
    expect(ordered.map((target) => target.id)).toEqual(["sam", "mira", "FA-RICOH-L2", "l2"])
    // Without a current organisation the source's order holds within a kind.
    expect(orderTargets([mira, sam], kinds).map((target) => target.id)).toEqual(["mira", "sam"])
  })

  it("reads the query after the @ trigger", () => {
    expect(referenceQuery("@sam")).toBe("sam")
    expect(referenceQuery("  @ ")).toBe("")
    expect(referenceQuery("sam lee")).toBe("sam lee")
  })

  it("steps through the kind filter, wrapping", () => {
    const kinds = [{ id: "user", noun: "Person", plural: "People", icon: IconUser }, { id: "site" }]
    expect(stepKind(null, kinds, 1)).toBe("user")
    expect(stepKind("site", kinds, 1)).toBeNull()
    expect(stepKind(null, kinds, -1)).toBe("site")
  })
})
