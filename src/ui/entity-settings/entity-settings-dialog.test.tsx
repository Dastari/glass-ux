// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { useAppForm } from "../form/index.js";
import { TooltipProvider } from "../tooltip/index.js";
import { EntitySettingsDialog } from "./entity-settings-dialog.js";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

function Editor({
  reason,
  submit,
  verify,
}: {
  reason?: string;
  submit: () => Promise<void>;
  verify?: () => Promise<void>;
}) {
  const form = useAppForm({
    defaultValues: { name: "Initial name" },
    onSubmit: submit,
  });
  return (
    <TooltipProvider>
      <EntitySettingsDialog
        open
        preview
        onOpenChange={() => {}}
        form={form}
        saveDisabledReason={reason}
        onVerify={verify}
        privileged={["name"]}
        tabs={[
          {
            value: "general",
            label: "General",
            fields: ["name"],
            content: (
              <form.AppField name="name">
                {(field) => <field.TextField label="Name" />}
              </form.AppField>
            ),
          },
        ]}
      />
    </TooltipProvider>
  );
}

describe("draft-only settings", () => {
  it("retains editable values but blocks button and native submit without a fake pending state", async () => {
    const submit = vi.fn(async () => {});
    const verify = vi.fn(async () => {});
    render(
      <Editor
        reason="Saving this draft is unavailable"
        submit={submit}
        verify={verify}
      />,
    );
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("Initial name");
    fireEvent.change(name, { target: { value: "Edited draft" } });
    expect(name).toHaveValue("Edited draft");
    const save = screen.getByRole("button", { name: /^Verify and save/ });
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(save).toHaveAttribute(
      "aria-description",
      "Saving this draft is unavailable",
    );
    fireEvent.click(save);
    fireEvent.submit(save.closest("form")!);
    expect(submit).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    expect(save).not.toHaveAttribute("aria-busy", "true");
  });
  it("preserves the pristine gate and allows a valid edited form after the reason is removed", async () => {
    const submit = vi.fn(async () => {});
    const view = render(<Editor submit={submit} />);
    expect(screen.getByRole("button", { name: /^Save/ })).toHaveAttribute(
      "aria-description",
      "No changes to save",
    );
    view.rerender(<Editor reason="Save unavailable" submit={submit} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Valid edit" },
    });
    expect(screen.getByRole("button", { name: /^Save/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    view.rerender(<Editor submit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: /^Save/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
  });
});

function CancelEditor({ confirmOnCancel, onOpenChange }: { confirmOnCancel?: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useAppForm({ defaultValues: { name: "Initial name" }, onSubmit: async () => {} });
  return (
    <TooltipProvider>
      <EntitySettingsDialog
        open
        preview
        onOpenChange={onOpenChange}
        confirmOnCancel={confirmOnCancel}
        form={form}
        entityName="NST-C106"
        tabs={[
          {
            value: "general",
            label: "General",
            fields: ["name"],
            content: <form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>,
          },
        ]}
      />
    </TooltipProvider>
  );
}

describe("Cancel", () => {
  it("reverts and closes at once by default", () => {
    const onOpenChange = vi.fn();
    render(<CancelEditor onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Edited" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before discarding with confirmOnCancel, then resets and closes", async () => {
    const onOpenChange = vi.fn();
    render(<CancelEditor confirmOnCancel onOpenChange={onOpenChange} />);
    const name = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(name, { target: { value: "Edited" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    // Nothing is reverted or closed yet: the guard asks.
    expect(onOpenChange).not.toHaveBeenCalled();
    expect((name as HTMLInputElement).value).toBe("Edited");
    const ask = await screen.findByRole("alertdialog");
    expect(ask.textContent).toContain("Discard changes to NST-C106?");
    fireEvent.click(within(ask).getByRole("button", { name: /^Discard changes/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect((name as HTMLInputElement).value).toBe("Initial name");
  });

  it("closes a clean form at once with confirmOnCancel", () => {
    const onOpenChange = vi.fn();
    render(<CancelEditor confirmOnCancel onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
