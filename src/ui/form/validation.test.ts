import { describe, expect, it } from "vitest"
import { z } from "zod"
import { firstError, issuePath, messageFor, normalisePath } from "./validation.js"

const schema = z.object({
  name: z.string().min(1, "Enter a name"),
  contacts: z.array(z.object({ email: z.string().email("Enter an email") })),
})

describe("validation helpers", () => {
  it("normalises bracket paths", () => {
    expect(normalisePath("contacts[0].email")).toBe("contacts.0.email")
  })
  it("reads one field's message from the form schema", () => {
    const values = { name: "", contacts: [{ email: "nope" }] }
    expect(messageFor(schema, values, "name")).toBe("Enter a name")
    expect(messageFor(schema, values, "contacts[0].email")).toBe("Enter an email")
    expect(messageFor(schema, { name: "Avery", contacts: [] }, "name")).toBeUndefined()
  })
  it("joins issue paths", () => {
    expect(issuePath({ message: "x", path: ["contacts", 0, { key: "email" }] })).toBe("contacts.0.email")
  })
  it("takes the first message from strings or issues", () => {
    expect(firstError([undefined, "Enter a name"])).toBe("Enter a name")
    expect(firstError([{ message: "From a schema" }])).toBe("From a schema")
    expect(firstError([])).toBeUndefined()
  })
})
