// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FactList } from "./fact-list.js";

afterEach(cleanup);

describe("FactList", () => {
  it("keeps the compact markup without icons", () => {
    const { container } = render(<FactList facts={[{ label: "Owner", value: "Mira Rowan" }]} />);
    const list = container.querySelector("dl")!;
    expect(list).not.toHaveAttribute("data-variant");
    expect(list).not.toHaveAttribute("data-icons");
    expect(container.querySelector(".fa-fact-list-icon")).toBeNull();
  });

  it("draws rows with an icon cell in every label once any fact has an icon (#21)", () => {
    const { container } = render(
      <FactList
        variant="rows"
        facts={[
          { label: "Job", icon: <svg data-testid="job" />, value: "JB-2041" },
          { label: "Due", value: "Friday" },
        ]}
      />,
    );
    const list = container.querySelector("dl")!;
    expect(list).toHaveAttribute("data-variant", "rows");
    expect(list).toHaveAttribute("data-icons");
    // The icon is decorative; each term keeps its label as its name, and a fact without an icon keeps its cell.
    expect([...container.querySelectorAll("dt")].map((term) => term.textContent)).toEqual(["Job", "Due"]);
    expect(container.querySelectorAll("dt > .fa-fact-list-icon[aria-hidden]")).toHaveLength(2);
    expect(screen.getByTestId("job").closest(".fa-fact-list-icon")).toBeTruthy();
  });
});
