import { expect, it } from "vitest";
import { editReducer } from "./edit-state.js";
it("shows a pending value, then settles or restores the last value on rejection", () => {
  const pending = editReducer(null, {
    type: "save",
    value: 7,
    previous: 2,
    token: 1,
  });
  expect(pending).toMatchObject({ value: 7, status: "pending" });
  expect(editReducer(pending, { type: "resolve", token: 1 })).toMatchObject({
    value: 7,
    status: "saved",
  });
  expect(
    editReducer(pending, { type: "reject", token: 1, error: "Locked" }),
  ).toMatchObject({ value: 2, status: "error", error: "Locked" });
});
it("ignores stale completions after another save starts", () => {
  const pending = editReducer(null, {
    type: "save",
    value: 9,
    previous: 7,
    token: 2,
  });
  expect(editReducer(pending, { type: "reject", token: 1, error: "Old" })).toBe(
    pending,
  );
  expect(editReducer(pending, { type: "resolve", token: 1 })).toBe(pending);
});

it("keeps pending saves across a virtual cell's unsubscribe and resubscribe", async () => {
  const { CellEditStore } = await import("./edit-state.js");
  const store = new CellEditStore();
  let notifications = 0;
  const off = store.subscribe("i1.quantity", () => {
    notifications++;
  });
  const token = store.nextToken();
  store.dispatch("i1.quantity", {
    type: "save",
    token,
    value: 9,
    previous: 2,
    source: 2,
  });
  off();
  store.dispatch("i1.quantity", { type: "reject", token, error: "Locked" });
  expect(notifications).toBe(1);
  expect(store.read("i1.quantity")).toMatchObject({
    value: 2,
    status: "error",
    error: "Locked",
  });
  expect(store.read("i2.quantity")).toBeNull();
});
