import { createRoot } from "react-dom/client";
import { Suspense, useState } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
  Outlet,
} from "@tanstack/react-router";
import {
  AppearanceProvider,
  useAppearance,
  PALETTES,
  PALETTE_LABELS,
} from "glass-ux/appearance";
import { ActionProvider } from "glass-ux/actions";
import { PaletteProvider } from "glass-ux/command-palette";
import { TooltipProvider } from "glass-ux/tooltip";
import { Segmented } from "glass-ux/segmented";
import { SwatchPicker } from "glass-ux/swatch-picker";
import { Button } from "glass-ux/button";
import { usePhoneLayout } from "glass-ux/lib/use-media-query";
import { SearchField } from "glass-ux/input";
import {
  ComponentDocumentation,
  componentCatalogue,
  configureDemoBrand,
  LibraryGuide,
  libraryGuides,
  sections,
} from "glass-ux/gallery";
import "./styles.css";

configureDemoBrand();
const foundations = sections.filter(
  (section) => section.group === "Foundations",
);
function Toolbar() {
  const { appearance, update } = useAppearance();
  return (
    <div
      className="docs-toolbar"
      role="region"
      aria-label="Appearance controls"
      tabIndex={0}
    >
      <Segmented
        aria-label="Mode"
        value={appearance.mode}
        onValueChange={(mode) => update({ mode })}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]}
      />
      <SwatchPicker
        aria-label="Palette"
        value={appearance.palette}
        onValueChange={(palette) => update({ palette, accentHue: null })}
        options={PALETTES.map((palette) => ({
          value: palette,
          label: PALETTE_LABELS[palette] ?? palette,
          palette,
        }))}
      />
      <Segmented
        aria-label="Material"
        value={appearance.glass}
        onValueChange={(glass) => update({ glass })}
        options={[
          { value: "full", label: "Glass" },
          { value: "reduced", label: "Frosted" },
          { value: "solid", label: "Solid" },
        ]}
      />
      <Segmented
        aria-label="Animations"
        value={appearance.motion === "reduced" ? "reduced" : "full"}
        onValueChange={(motion) => update({ motion })}
        options={[
          { value: "full", label: "Animated" },
          { value: "reduced", label: "Still" },
        ]}
      />
      <Segmented
        aria-label="Density"
        value={appearance.density}
        onValueChange={(density) => update({ density })}
        options={[
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ]}
      />
    </div>
  );
}
function Layout() {
  const [query, setQuery] = useState("");
  const [browse, setBrowse] = useState(false);
  const phone = usePhoneLayout();
  const items = componentCatalogue.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <AppearanceProvider>
      <TooltipProvider>
        <ActionProvider>
          <PaletteProvider>
            <div className="docs-layout">
              <aside
                className="glass-panel docs-sidebar"
                aria-label="Component navigation"
              >
                <div className="docs-sidebar-heading">
                  <Link to="/" className="type-subtitle">
                    Glass UX
                  </Link>
                  {phone ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={browse}
                      onClick={() => setBrowse((value) => !value)}
                    >
                      Browse
                    </Button>
                  ) : null}
                </div>
                <div
                  className="docs-directory"
                  hidden={phone && !browse && !query}
                >
                  <SearchField
                    aria-label="Find a component"
                    value={query}
                    onValueChange={setQuery}
                  />
                  <nav className="docs-nav" aria-label="Guides">
                    {libraryGuides.map((guide) => (
                      <Link
                        key={guide.id}
                        to="/guides/$guide"
                        params={{ guide: guide.id }}
                      >
                        {guide.title}
                      </Link>
                    ))}
                  </nav>
                  <nav className="docs-nav" aria-label="Foundations">
                    {foundations.map((section) => (
                      <Link
                        key={section.id}
                        to="/foundations/$section"
                        params={{ section: section.id }}
                      >
                        {section.title}
                      </Link>
                    ))}
                  </nav>
                  <a href={`${import.meta.env.BASE_URL}api/`}>
                    Types and helpers (TypeDoc)
                  </a>

                  <nav className="docs-nav" aria-label="Components">
                    {items.map((item) => (
                      <Link
                        onClick={() => {
                          setQuery("");
                          setBrowse(false);
                        }}
                        key={item.id}
                        to="/components/$component"
                        params={{ component: item.id }}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                  <a href="https://github.com/Dastari/glass-ux">
                    Source and releases
                  </a>
                </div>
              </aside>
              <main
                className="docs-main"
                tabIndex={0}
                aria-label="Documentation"
              >
                <Toolbar />
                <div
                  className="docs-content"
                  tabIndex={0}
                  role="region"
                  aria-label="Documentation content"
                >
                  <Outlet />
                </div>
              </main>
            </div>
          </PaletteProvider>
        </ActionProvider>
      </TooltipProvider>
    </AppearanceProvider>
  );
}
const rootRoute = createRootRoute({ component: Layout });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <>
      <div className="gallery-documentation">
        <h1>Glass UX</h1>
        <p>
          React components for glass interfaces, data applications and assistant
          experiences.
        </p>
      </div>
      <div className="docs-index">
        {componentCatalogue
          .filter((item) => item.family !== "icons")
          .map((item) => (
            <Link
              className="glass-panel docs-card"
              key={item.id}
              to="/components/$component"
              params={{ component: item.id }}
            >
              <strong>{item.name}</strong>
              <span>{item.entry}</span>
            </Link>
          ))}
      </div>
    </>
  ),
});
const componentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/components/$component",
  component: () => {
    const { component } = componentRoute.useParams();
    return <ComponentDocumentation key={component} id={component} />;
  },
});
const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guides/$guide",
  component: () => {
    const { guide } = guideRoute.useParams();
    return <LibraryGuide key={guide} id={guide} />;
  },
});
const foundationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/foundations/$section",
  component: () => {
    const { section: id } = foundationRoute.useParams();
    const section = foundations.find((section) => section.id === id);
    if (!section) return <p>Foundation not found.</p>;
    if (id === "icons") return <ComponentDocumentation id="icons" />;
    const { Component } = section;
    return (
      <>
        <h1>{section.title}</h1>
        <p>{section.summary}</p>
        <Suspense fallback={<p>Loading examples…</p>}>
          <Component />
        </Suspense>
      </>
    );
  },
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    indexRoute,
    componentRoute,
    guideRoute,
    foundationRoute,
  ]),
  basepath: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
});
createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
