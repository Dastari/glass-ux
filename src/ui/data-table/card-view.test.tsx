// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../tooltip/index.js";
import { createDataTableColumns } from "./columns.js";
import { DataTable } from "./data-table.js";
import type { DataTableCard, DataTableProps } from "./types.js";

const dimensions = vi.hoisted(() => ({ width: 1200 }));
vi.mock("../../lib/use-element-size.js", () => ({
  useElementSize: () => ({ width: dimensions.width, height: 500 }),
}));
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = () => {};
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function () {
      return this.classList.contains("fa-dt-scroll") ? 400 : 0;
    },
  );
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  dimensions.width = 1200;
});
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Device {
  id: string;
  name: string;
  serial: string;
}
const col = createDataTableColumns<Device>();
const columns = col.columns([
  col.accessor("name", { header: "Name", pin: true, cardRole: "title" }),
  col.accessor("serial", { header: "Serial", cardRole: "meta" }),
  col.accessor("id", { header: "Asset", cardRole: "hidden" }),
]);
const rows: Device[] = [
  { id: "a", name: "Acorn workstation", serial: "ACORN-42" },
  { id: "b", name: "Birch laptop", serial: "BIRCH-7" },
];
function Table(props: Partial<DataTableProps<Device>>) {
  return (
    <TooltipProvider>
      <DataTable<Device>
        id="card-view"
        label="Devices"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.name}
        rowCount={2}
        {...props}
      />
    </TooltipProvider>
  );
}
const modeOf = (container: HTMLElement) =>
  container.querySelector(".fa-dt")?.getAttribute("data-mode");

describe("view", () => {
  it("follows the width by default", () => {
    expect(modeOf(render(<Table />).container)).toBe("table");
    cleanup();
    dimensions.width = 300;
    expect(modeOf(render(<Table />).container)).toBe("cards");
  });
  it("holds cards when wide and the table when narrow", () => {
    expect(modeOf(render(<Table view="cards" />).container)).toBe("cards");
    cleanup();
    dimensions.width = 300;
    expect(modeOf(render(<Table view="table" />).container)).toBe("table");
  });
  it("ignores the breakpoint unless automatic", () => {
    const { container } = render(<Table view="table" cardBreakpoint={9999} />);
    expect(modeOf(container)).toBe("table");
  });
  it("keeps the selection across a change of view", () => {
    const { rerender, container } = render(<Table view="table" />);
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Acorn workstation" }),
    );
    rerender(<Table view="cards" />);
    expect(
      container.querySelector('.fa-dt-card[data-row-id="a"]'),
    ).toHaveAttribute("aria-selected", "true");
  });
});

describe("cardMinWidth", () => {
  it("marks the card list as a grid with the minimum as a length", () => {
    const { container } = render(<Table view="cards" cardMinWidth={16} />);
    const list = container.querySelector<HTMLElement>(".fa-dt-cards")!;
    expect(list).toHaveAttribute("data-grid");
    expect(list.style.getPropertyValue("--_card-min")).toBe("16rem");
  });
  it("is one column without it", () => {
    const { container } = render(<Table view="cards" />);
    expect(container.querySelector(".fa-dt-cards")).not.toHaveAttribute(
      "data-grid",
    );
  });
  it("keeps one column while reorderable", () => {
    const { container } = render(
      <Table view="cards" cardMinWidth={16} reorder={{ onReorder: () => {} }} />,
    );
    expect(container.querySelector(".fa-dt-cards")).not.toHaveAttribute(
      "data-grid",
    );
  });
});

describe("renderCard", () => {
  const renderCard = (row: Device, card: DataTableCard) => (
    <div data-testid={`card-${row.id}`}>
      {card.select}
      <span>{row.name}</span>
      {card.cell("serial")}
      {card.actions}
    </div>
  );
  it("replaces the card's content inside the table's frame", () => {
    const { container } = render(<Table view="cards" renderCard={renderCard} />);
    const frame = container.querySelector('.fa-dt-card[data-row-id="a"]')!;
    expect(frame).toHaveAttribute("role", "row");
    expect(frame.querySelector('[role="gridcell"]')).toContainElement(
      screen.getByTestId("card-a"),
    );
    expect(frame.querySelector(".fa-dt-card-head")).toBeNull();
    expect(screen.getByTestId("card-a")).toHaveTextContent("ACORN-42");
  });
  it("is used only where cards show", () => {
    render(<Table view="table" renderCard={renderCard} />);
    expect(screen.queryByTestId("card-a")).toBeNull();
  });
  it("hands over a working checkbox and the row's state", () => {
    const seen: DataTableCard[] = [];
    render(
      <Table
        view="cards"
        renderCard={(row, card) => {
          if (row.id === "a") seen.push(card);
          return renderCard(row, card);
        }}
      />,
    );
    expect(seen.at(-1)).toMatchObject({
      label: "Acorn workstation",
      selected: false,
      open: false,
      tabIndex: 0,
      expander: null,
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Acorn workstation" }),
    );
    expect(seen.at(-1)?.selected).toBe(true);
  });
  it("gives no checkbox on a table that is not selectable, and no cell for an unknown column", () => {
    const seen: DataTableCard[] = [];
    render(
      <Table
        view="cards"
        selectable={false}
        renderCard={(_, card) => {
          seen.push(card);
          return null;
        }}
      />,
    );
    expect(seen[0]?.select).toBeNull();
    expect(seen[0]?.cell("nothing")).toBeNull();
  });
  it("leaves column choices out of the settings menu, and keeps density", () => {
    render(<Table view="cards" renderCard={renderCard} />);
    fireEvent.click(screen.getByRole("button", { name: "Columns and density" }));
    expect(screen.queryByRole("menuitemcheckbox")).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Reset columns" })).toBeNull();
    expect(screen.getByRole("menuitemradio", { name: "Compact" })).toBeInTheDocument();
  });
  it("draws renderCardSkeleton while loading", () => {
    const { container } = render(
      <Table
        view="cards"
        rows={[]}
        loading
        renderCard={renderCard}
        renderCardSkeleton={() => <div data-testid="placeholder" />}
      />,
    );
    expect(container.querySelector(".fa-dt-skel-card .fa-dt-card-slot")).not.toBeNull();
    expect(screen.getAllByTestId("placeholder").length).toBeGreaterThan(0);
  });
  it("falls back to the default placeholder without one", () => {
    const { container } = render(
      <Table view="cards" rows={[]} loading renderCard={renderCard} />,
    );
    expect(container.querySelector(".fa-dt-skel-card .fa-dt-card-head")).not.toBeNull();
  });
});

describe("media column (#22)", () => {
  const mediaColumns = col.columns([
    col.display({ id: "preview", header: "Preview", cardRole: "media", media: { ratio: "16 / 9" }, cell: ({ row }) => <img alt="" data-testid={`img-${row.original.id}`} /> }),
    col.accessor("name", { header: "Name", pin: true }),
    col.accessor("serial", { header: "Serial", cardRole: "meta" }),
  ]);

  it("draws the column across the top of each card, above the title, in its ratio", () => {
    const { container } = render(<Table view="cards" columns={mediaColumns} />);
    const card = container.querySelector(".fa-dt-card")!;
    const media = card.querySelector(".fa-dt-card-cell > .fa-dt-card-media") as HTMLElement;
    expect(media).not.toBeNull();
    expect(media.nextElementSibling).toHaveClass("fa-dt-card-head");
    expect(media.style.getPropertyValue("--_media-ratio")).toBe("16 / 9");
    expect(media.querySelector("img")).not.toBeNull();
    // The title is still the first column that is not media, and the media is not also a field.
    expect(card.querySelector(".fa-dt-card-title")!.textContent).toBe("Acorn workstation");
    expect(card.querySelectorAll('[data-col="preview"]')).toHaveLength(1);
  });

  it("keeps the media box while loading", () => {
    const { container } = render(<Table view="cards" rows={[]} loading columns={mediaColumns} />);
    expect(container.querySelector(".fa-dt-skel-card .fa-dt-card-media")).not.toBeNull();
  });

  it("marks the table cell, which draws the thumbnail", () => {
    const { container } = render(<Table columns={mediaColumns} />);
    const cell = container.querySelector('[role="gridcell"][data-col="preview"]') as HTMLElement;
    expect(cell).toHaveAttribute("data-media");
    expect(cell.style.getPropertyValue("--_media-ratio")).toBe("16 / 9");
  });
});
