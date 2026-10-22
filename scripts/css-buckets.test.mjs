import { test } from "node:test"
import assert from "node:assert/strict"
import { bucketCss, bucketSelector } from "./css-buckets.mjs"

test("splits a rightmost :is() list of equal specificity", () => {
  assert.deepEqual(bucketSelector(":is(.glass-panel, .glass-chrome)::before"), [".glass-panel::before", ".glass-chrome::before"])
  assert.deepEqual(bucketSelector(".fa-dt-rows > :is(.fa-a, .fa-b):focus-visible"), [".fa-dt-rows > .fa-a:focus-visible", ".fa-dt-rows > .fa-b:focus-visible"])
  assert.deepEqual(bucketSelector(':is([data-side="left"], [data-side="right"]):has(> .fa-popup)'), ['[data-side="left"]:has(> .fa-popup)', '[data-side="right"]:has(> .fa-popup)'])
  assert.deepEqual(bucketSelector(".x :is(p, ul)"), [".x p", ".x ul"])
})

test("evens out class and attribute counts by repeating one", () => {
  assert.deepEqual(bucketSelector(":is(.a[data-x], .b, [data-y])"), [".a[data-x]", ".b.b", "[data-y][data-y]"])
})

test("splits :where() lists whatever their arguments' specificity", () => {
  assert.deepEqual(bucketSelector(":where(h1, .title)"), [":where(h1)", ":where(.title)"])
  assert.deepEqual(bucketSelector(':where(:root[data-background="mesh"]) :is(.canvas-ambient, .canvas-background)'), [
    ':where(:root[data-background="mesh"]) .canvas-ambient',
    ':where(:root[data-background="mesh"]) .canvas-background',
  ])
})

test("leaves lists it cannot split without changing what matches or how it ranks", () => {
  // unequal ranks that a repeated class cannot even out
  assert.deepEqual(bucketSelector(":is(#a, .b)"), [":is(#a, .b)"])
  assert.deepEqual(bucketSelector(":is(a, [role=button])"), [":is(a, [role=button])"])
  // a pseudo-class argument could be unsupported, which a forgiving :is() tolerates
  assert.deepEqual(bucketSelector(":is(.a, :popover-open)"), [":is(.a, :popover-open)"])
  // a complex argument
  assert.deepEqual(bucketSelector(".x :is(.a, .b .c)"), [".x :is(.a, .b .c)"])
  // a type selector cannot follow another simple selector
  assert.deepEqual(bucketSelector(".x:is(p, ul)"), [".x:is(p, ul)"])
  // not the rightmost compound: already keyed
  assert.deepEqual(bucketSelector(":is(.a, .b) .c"), [":is(.a, .b) .c"])
  // keyed outside the list
  assert.deepEqual(bucketSelector('[data-palette]:where(:root, [data-mode="light"])'), ['[data-palette]:where(:root, [data-mode="light"])'])
  assert.deepEqual(bucketSelector(".x:where(.a, .b)::before"), [".x:where(.a, .b)::before"])
})

test("keys :scope by its scoping roots", () => {
  const out = bucketCss('@layer base { @scope (:root, [data-mode="light"]) { :scope, [data-palette] { color: red } } }')
  assert.match(out, /:scope:where\(:root\),\n:scope:where\(\[data-mode="light"\]\),\n\[data-palette\]/)
})

test("keeps keyframe stops and unchanged rules as they were", () => {
  const css = "@keyframes k { from { opacity: 0 } }\n.a { color: red }"
  assert.equal(bucketCss(css), css)
})
