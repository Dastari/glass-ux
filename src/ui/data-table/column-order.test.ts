import { expect, it } from "vitest";
import { moveColumn, normaliseColumnOrder } from "./column-order.js";
it("drops removed/duplicate ids and appends newly introduced columns", () => {
  expect(
    normaliseColumnOrder(
      ["name", "quantity", "status"],
      ["status", "old", "status"],
    ),
  ).toEqual(["status", "name", "quantity"]);
});
it("keeps pinned and unpinned moves in their group", () => {
  const order = ["name", "code", "quantity", "status"];
  const pinned = new Set(["name", "code"]);
  expect(moveColumn(order, "name", 100, pinned)).toEqual([
    "code",
    "name",
    "quantity",
    "status",
  ]);
  expect(moveColumn(order, "status", 0, pinned)).toEqual([
    "name",
    "code",
    "status",
    "quantity",
  ]);
});
