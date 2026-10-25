// @vitest-environment jsdom
import { cleanup, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { renderWithGlass } from "../../testing/render.js";
import { installGlassTestEnvironment } from "../../testing/environment.js";
import { EmailField, emailSchema } from "../email-field/index.js";
import { IpField, ipSchema } from "../ip-field/index.js";
import { PortField, portSchema } from "../port-field/index.js";
import { MoneyField, moneySchema } from "../money-field/index.js";
import {
  AddressField,
  addressSchema,
  emptyAddress,
} from "../address-field/index.js";
import { Checkbox } from "../checkbox/index.js";
import { Field } from "../field/index.js";
import { RhfField, RhfForm, rhfFormBehaviour, useRhfField } from "./index.js";

let restore: () => void;
beforeAll(() => {
  restore = installGlassTestEnvironment();
});
afterEach(cleanup);
afterAll(() => restore());
const schema = z.object({
  email: emailSchema({ required: true }),
  ip: ipSchema({ required: true }),
  port: portSchema({ required: true }),
  money: moneySchema({ required: true }),
});
const saved = vi.fn();
function Example() {
  const form = useForm({
    ...rhfFormBehaviour,
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      ip: "192.0.2.1",
      port: 443 as number | null,
      money: 12500 as number | null,
    },
  });
  return (
    <RhfForm form={form} onSubmit={saved} aria-label="Contact">
      <RhfField
        control={form.control}
        name="email"
        component={EmailField}
        label="Email"
      />
      <RhfField
        control={form.control}
        name="ip"
        component={IpField}
        label="Gateway"
      />
      <RhfField
        control={form.control}
        name="port"
        component={PortField}
        label="Port"
      />
      <RhfField
        control={form.control}
        name="money"
        component={MoneyField}
        label="Budget"
      />
      <button type="submit">Save</button>
      <button type="button" onClick={() => form.reset()}>
        Reset
      </button>
    </RhfForm>
  );
}

it("shows shared schema messages after blur, clears them on change and focuses the first invalid control", async () => {
  renderWithGlass(<Example />);
  const user = userEvent.setup();
  const email = screen.getByRole("textbox", { name: "Email" });
  await user.type(email, "wrong");
  expect(screen.queryByText(/Enter an email such as/)).toBeNull();
  await user.tab();
  await screen.findByText(/Enter an email such as/);
  expect(email).toHaveAttribute("aria-invalid", "true");
  await user.click(screen.getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(email).toHaveFocus());
  await user.clear(email);
  await user.type(email, "avery@northstar.example");
  await waitFor(() =>
    expect(screen.queryByText(/Enter an email such as/)).toBeNull(),
  );
});

it("normalises on blur, submits typed money and port values and follows reset", async () => {
  saved.mockClear();
  renderWithGlass(<Example />);
  const user = userEvent.setup();
  const email = screen.getByRole("textbox", { name: "Email" });
  await user.type(email, "Avery@NORTHSTAR.EXAMPLE");
  await user.tab();
  expect(email).toHaveValue("Avery@northstar.example");
  const ip = screen.getByRole("textbox", { name: "Gateway" });
  await user.clear(ip);
  await user.type(ip, "192.000.002.010");
  await user.tab();
  expect(ip).toHaveValue("192.0.2.10");
  const port = screen.getByRole("textbox", { name: "Port" });
  fireEvent.change(port, { target: { value: "8443" } });
  fireEvent.blur(port);
  await user.click(screen.getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls.at(-1)![0]).toEqual({
    email: "Avery@northstar.example",
    ip: "192.0.2.10",
    port: 8443,
    money: 12500,
  });
  await user.click(screen.getByRole("button", { name: "Reset" }));
  expect(email).toHaveValue("");
});

it("supports checked controls through useRhfField", async () => {
  function Consent() {
    const form = useForm({ defaultValues: { consent: false } });
    const binding = useRhfField({ control: form.control, name: "consent" });
    return (
      <Field {...binding.fieldProps} label="Consent" orientation="horizontal">
        <Checkbox {...binding.checkedProps} />
      </Field>
    );
  }
  renderWithGlass(<Consent />);
  const checkbox = screen.getByRole("checkbox", { name: "Consent" });
  await userEvent.setup().click(checkbox);
  expect(checkbox).toHaveAttribute("aria-checked", "true");
});

it("keeps nested AddressField validation on the individual parts", async () => {
  const submit = vi.fn();
  function Address() {
    const form = useForm({
      ...rhfFormBehaviour,
      defaultValues: { address: emptyAddress() },
      resolver: zodResolver(
        z.object({ address: addressSchema({ required: true }) }),
      ),
    });
    return (
      <RhfForm form={form} onSubmit={submit}>
        <RhfField
          control={form.control}
          name="address"
          component={AddressField}
          label="Site address"
        />
        <button>Save address</button>
      </RhfForm>
    );
  }
  renderWithGlass(<Address />);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Save address" }));
  await waitFor(() =>
    expect(
      document.querySelectorAll(".fa-field[data-invalid]").length,
    ).toBeGreaterThan(0),
  );
  expect(
    screen.getByText("Enter the street address, or a PO Box"),
  ).toBeTruthy();
  expect(document.querySelector(".fa-address")).not.toHaveAttribute(
    "data-expanded",
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Enter manually" }));
  expect(document.querySelector(".fa-address")).toHaveAttribute(
    "data-expanded",
  );
  const invalid = screen
    .getByRole("textbox", { name: "Street address" })
    .closest(".fa-field");
  await waitFor(() => expect(invalid).toHaveAttribute("data-invalid"));
  expect(invalid!.querySelector(".fa-field-error")).toHaveTextContent(
    "Enter the street address, or a PO Box",
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByRole("textbox", { name: "Street address" }),
    "12 Sample Lane",
  );
  await user.tab();
  await waitFor(() => expect(invalid).not.toHaveAttribute("data-invalid"));
  await user.type(
    screen.getByRole("textbox", { name: "Suburb or town" }),
    "Northstar Bay",
  );
  await user.click(screen.getByRole("button", { name: "Save address" }));
  await waitFor(() => expect(submit).toHaveBeenCalledOnce());
  expect(submit.mock.calls[0]![0].address).toMatchObject({
    line1: "12 Sample Lane",
    locality: "Northstar Bay",
    country: { code: "AU" },
  });
});
