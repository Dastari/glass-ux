// @vitest-environment jsdom
import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { EditableValue, EditingContext } from "./editing.js";
import { resolveColumnMeta } from "./columns.js";
import { MessagesProvider } from "../../lib/i18n/use-messages.js";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(cleanup);

function specimen(save = vi.fn(), labels = {}) {
  const announce = vi.fn();
  const result = render(
    <MessagesProvider messages={{ "data-table": labels }}>
      <EditingContext value={{ save, announce }}>
        <EditableValue
          row={{ name: "Cedar", quantity: 2 }}
          rowId="i1"
          columnId="quantity"
          raw={2}
          meta={{
            ...resolveColumnMeta({ header: "Quantity" }),
            edit: {
              kind: "number",
              validate: (value) => (value < 0 ? "Must be positive" : null),
            },
          }}
        >
          2
        </EditableValue>
      </EditingContext>
    </MessagesProvider>,
  );
  const cell = screen.getByRole("group");
  fireEvent.keyDown(cell, { key: "F2" });
  return {
    ...result,
    cell,
    announce,
    save,
    input: screen.getByRole("textbox"),
  };
}
it("validates before invoking the host, commits once, and restores a rejected save", async () => {
  let reject!: (reason: Error) => void;
  const save = vi.fn(
    () =>
      new Promise<void>((_, fail) => {
        reject = fail;
      }),
  );
  const { input, cell, announce } = specimen(save);
  fireEvent.change(input, { target: { value: "-1" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(save).not.toHaveBeenCalled();
  expect(input.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(input, { target: { value: "8" } });
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.blur(input);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0]).toEqual([
    {
      row: { name: "Cedar", quantity: 2 },
      rowId: "i1",
      columnId: "quantity",
      value: 8,
      previous: 2,
    },
  ]);
  expect(cell.textContent).toContain("8");
  expect(cell.hasAttribute("data-pending")).toBe(true);
  await act(async () => reject(new Error("Locked record")));
  expect(cell.textContent).toContain("2");
  expect(cell.hasAttribute("data-error")).toBe(true);
  expect(announce).toHaveBeenLastCalledWith("Locked record");
});
it("Escape discards a draft; provider overrides supply editor wording", () => {
  const { input, cell, save } = specimen(vi.fn(), {
    editCell: (label: string) => `Change ${label}`,
  });
  expect(input.getAttribute("aria-label")).toBe("Change Quantity");
  fireEvent.change(input, { target: { value: "9" } });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(save).not.toHaveBeenCalled();
  expect(cell.textContent).toBe("2");
});

it("restores the prior value when the host has also applied an optimistic record update", async () => {
  let reject!: (reason: Error) => void;
  function Fixture() {
    const [raw, setRaw] = useState(2);
    return (
      <EditingContext
        value={{
          announce: () => {},
          save: (change) => {
            setRaw(change.value as number);
            return new Promise<void>((_, fail) => {
              reject = fail;
            });
          },
        }}
      >
        <EditableValue
          row={{ quantity: raw }}
          rowId="i1"
          columnId="quantity"
          raw={raw}
          meta={{
            ...resolveColumnMeta({ header: "Quantity" }),
            edit: { kind: "number" },
          }}
        >
          {raw}
        </EditableValue>
      </EditingContext>
    );
  }
  render(<Fixture />);
  const cell = screen.getByRole("group");
  fireEvent.keyDown(cell, { key: "Enter" });
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "8" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(cell.textContent).toContain("8");
  await act(async () => reject(new Error("Save rejected")));
  expect(cell.textContent).toContain("2");
  expect(cell.hasAttribute("data-error")).toBe(true);
});
