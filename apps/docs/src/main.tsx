import { createRoot } from "react-dom/client";
import { useState } from "react";
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
  configureAppearance,
} from "glass-ux/appearance";
import { ActionProvider } from "glass-ux/actions";
import { PaletteProvider } from "glass-ux/command-palette";
import { TooltipProvider } from "glass-ux/tooltip";
import { Segmented } from "glass-ux/segmented";
import { SwatchPicker } from "glass-ux/swatch-picker";
import { Button } from "glass-ux/button";
import { usePhoneLayout } from "glass-ux/lib/use-media-query";
import { SearchField } from "glass-ux/input";
import { Surface } from "glass-ux/surface";
import { BrandMark } from "glass-ux/brand";
import { IconSun, IconMoon, IconSystem, IconSidebar } from "glass-ux/icons";
import {
  ComponentDocumentation,
  FoundationDocumentation,
  componentCatalogue,
  configureDemoBrand,
  LibraryGuide,
  libraryGuides,
  sections,
  CatalogueIndex,
  type CatalogueLinkProps,
} from "glass-ux/gallery";
import "./styles.css";

configureDemoBrand();
configureAppearance({ defaults: { palette: "ocean" } });
const COMPONENT_GROUPS = ["Components", "Patterns", "Charts", "AI"] as const;
function componentGroup(family: string) {
  return family === "charts"
    ? "Charts"
    : family === "ai"
      ? "AI"
      : ["shell", "windows"].includes(family)
        ? "Patterns"
        : "Components";
}
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
        size="sm"
        iconOnly
        aria-label="Mode"
        value={appearance.mode}
        onValueChange={(mode) => update({ mode })}
        options={[
          { value: "light", label: "Light", icon: <IconSun /> },
          { value: "dark", label: "Dark", icon: <IconMoon /> },
          { value: "system", label: "Match system", icon: <IconSystem /> },
        ]}
      />
      <SwatchPicker
        size="sm"
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
        size="sm"
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
        size="sm"
        aria-label="Animations"
        value={appearance.motion === "reduced" ? "reduced" : "full"}
        onValueChange={(motion) => update({ motion })}
        options={[
          { value: "full", label: "Animated" },
          { value: "reduced", label: "Still" },
        ]}
      />
      <Segmented
        size="sm"
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
            <div className="gallery-shell docs-layout">
              <Surface
                as="aside"
                material="chrome"
                padding="panel"
                className="docs-sidebar"
                aria-label="Component navigation"
              >
                <div className="docs-sidebar-heading">
                  <Link to="/" className="gallery-brand">
                    <BrandMark mark="product" className="gallery-brand-mark" />
                    <span>
                      <span className="gallery-brand-name">Glass UX</span>
                      <span className="gallery-brand-sub">Design system</span>
                    </span>
                  </Link>
                  {phone ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<IconSidebar />}
                      aria-label="Browse"
                      aria-expanded={browse}
                      onClick={() => setBrowse((value) => !value)}
                    />
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
                  <div className="docs-directory-scroll">
                    <nav className="docs-nav" aria-label="Guides">
                      <span className="type-overline text-fg-muted">
                        Guides
                      </span>
                      {libraryGuides.map((guide) => (
                        <Link
                          key={guide.id}
                          className="fa-item"
                          to="/guides/$guide"
                          params={{ guide: guide.id }}
                        >
                          <span className="fa-item-label">{guide.title}</span>
                        </Link>
                      ))}
                    </nav>
                    <nav className="docs-nav" aria-label="Foundations">
                      <span className="type-overline text-fg-muted">
                        Foundations
                      </span>
                      {foundations.map((section) => (
                        <Link
                          key={section.id}
                          className="fa-item"
                          to="/foundations/$section"
                          params={{ section: section.id }}
                        >
                          <span className="fa-item-label">{section.title}</span>
                        </Link>
                      ))}
                    </nav>
                    <a href={`${import.meta.env.BASE_URL}api/`}>
                      Types and helpers (TypeDoc)
                    </a>

                    <nav className="docs-nav" aria-label="Components">
                      {COMPONENT_GROUPS.map((group) => {
                        const entries = items.filter(
                          (item) => componentGroup(item.family) === group,
                        );
                        return entries.length ? (
                          <div className="docs-nav-group" key={group}>
                            <span className="type-overline text-fg-muted">
                              {group}
                            </span>
                            {entries.map((item) => (
                              <Link
                                key={item.id}
                                className="fa-item"
                                onClick={() => {
                                  setQuery("");
                                  setBrowse(false);
                                }}
                                to="/components/$component"
                                params={{ component: item.id }}
                              >
                                <span className="fa-item-label">
                                  {item.name}
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : null;
                      })}
                    </nav>
                    <a href="https://github.com/Dastari/glass-ux">
                      Source and releases
                    </a>
                  </div>
                </div>
              </Surface>
              <main
                className="gallery-main docs-main"
                tabIndex={0}
                aria-label="Documentation"
              >
                <header className="gallery-header">
                  <div className="gallery-header-title">
                    <span className="type-subtitle">
                      Glass UX component library
                    </span>
                  </div>
                  <Toolbar />
                </header>
                <div
                  className="gallery-content docs-content"
                  data-scroll-container
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
      <CatalogueIndex
        groups={["Foundations", ...COMPONENT_GROUPS]}
        LinkComponent={CatalogueRouteLink}
        entries={[
          ...foundations.map((section) => ({
            id: section.id,
            title: section.title,
            summary: section.summary,
            group: "Foundations",
            href: `/foundations/${section.id}`,
          })),
          ...componentCatalogue.map((item) => ({
            id: item.id,
            title: item.name,
            summary: item.description,
            group: componentGroup(item.family),
            href: `/components/${item.id}`,
          })),
        ]}
      />
    </>
  ),
});
function CatalogueRouteLink({ entry, ...props }: CatalogueLinkProps) {
  return <Link {...props} to={entry.href} />;
}
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
    return <FoundationDocumentation key={id} id={id} />;
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
