import { createRoot } from "react-dom/client";
import {
  createContext,
  lazy,
  Suspense,
  use,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import {
  AppearanceProvider,
  useAppearance,
  PALETTES,
  PALETTE_LABELS,
  BACKGROUNDS,
  BACKGROUND_LABELS,
  configureAppearance,
  type Appearance,
} from "glass-ux/appearance";
import { ActionProvider } from "glass-ux/actions";
import { PaletteProvider } from "glass-ux/command-palette";
import { TooltipProvider } from "glass-ux/tooltip";
import { Segmented } from "glass-ux/segmented";
import { SwatchPicker } from "glass-ux/swatch-picker";
import { Select } from "glass-ux/select";
import { Button } from "glass-ux/button";
import { ButtonLink } from "glass-ux/button-link";
import { Dialog } from "glass-ux/dialog";
import { Popover } from "glass-ux/popover";
import { usePhoneLayout } from "glass-ux/dialog";
import { DrawerPlacement, SectionDrawer } from "glass-ux/shell";
import { BrandMark } from "glass-ux/brand";
import { DOCUMENTATION_VERSION } from "glass-ux/gallery/release.generated";
import {
  IconSun,
  IconMoon,
  IconSystem,
  IconSidebar,
  IconSettings,
  IconGithub,
  IconCode,
} from "glass-ux/icons";
import { Skeleton } from "glass-ux/skeleton";
// Navigation reads metadata modules only; each route's content loads on demand.
import { sections } from "glass-ux/gallery/registry";
import { componentFamilies } from "glass-ux/gallery/component-families";
import { libraryGuides } from "glass-ux/gallery/library-guides";
import { configureDemoBrand } from "glass-ux/gallery/fixtures/brand";
import "./styles.css";

const Showcase = lazy(() =>
  import("./showcase").then((module) => ({ default: module.Showcase })),
);
const ComponentDocumentation = lazy(() =>
  import("glass-ux/gallery/documentation").then((module) => ({
    default: module.ComponentDocumentation,
  })),
);
const FoundationDocumentation = lazy(() =>
  import("glass-ux/gallery/documentation").then((module) => ({
    default: module.FoundationDocumentation,
  })),
);
const LibraryGuide = lazy(() =>
  import("glass-ux/gallery/guide").then((module) => ({
    default: module.LibraryGuide,
  })),
);

/**
 * A route's placeholder while its code loads: the document column's heading and opening
 * lines, in the place the page will occupy, so the shell and toolbar never move.
 */
function RouteLoading() {
  return (
    <div
      className="docs-route-loading"
      role="status"
      aria-label="Loading the page"
    >
      <Skeleton.Text type="display" width="45%" />
      <Skeleton.Text lines={3} />
      <Skeleton.Block className="docs-route-loading-block" radius="surface" />
    </div>
  );
}

configureDemoBrand();
configureAppearance({ defaults: { palette: "ocean" } });

function RepositoryLink() {
  return (
    <ButtonLink
      href="https://github.com/Dastari/glass-ux"
      target="_blank"
      rel="noopener noreferrer"
      variant="ghost"
      size="sm"
      className="docs-repository-link"
      icon={<IconGithub />}
      aria-label="Glass UX on GitHub"
      title="GitHub repository"
    >
      {null}
    </ButtonLink>
  );
}

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

function DirectoryGroup({
  id,
  title,
  count,
  searching,
  children,
}: {
  id: string;
  title: string;
  count: number;
  searching: boolean;
  children: ReactNode;
}) {
  return searching ? (
    <div className="docs-filtered-group">
      <span className="type-overline text-fg-muted">{title}</span>
      {children}
    </div>
  ) : (
    <SectionDrawer.Group id={`docs.${id}`} title={title} count={count}>
      {children}
    </SectionDrawer.Group>
  );
}

/** The expanded controls' size: md in the phone sheet, sm in the desktop popover. */
const ChoiceSize = createContext<"sm" | "md">("md");

function AppearanceChoices<V extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: V;
  options: Array<{ value: V; label: string; icon?: ReactNode }>;
  onValueChange: (value: V) => void;
}) {
  const size = use(ChoiceSize);
  return (
    <div className="docs-appearance-control">
      <span className="type-label">{label}</span>
      <div className="docs-appearance-options" role="group" aria-label={label}>
        {options.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? "soft" : "secondary"}
            size={size}
            icon={option.icon}
            aria-pressed={value === option.value}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Toolbar({ expanded = false }: { expanded?: boolean }) {
  const { appearance, update } = useAppearance();
  const choiceSize = use(ChoiceSize);
  if (expanded)
    return (
      <div
        className="docs-toolbar"
        data-expanded=""
        role="region"
        aria-label="Appearance controls"
      >
        <AppearanceChoices<Appearance["mode"]>
          label="Mode"
          value={appearance.mode}
          onValueChange={(mode) => update({ mode })}
          options={[
            { value: "light", label: "Light", icon: <IconSun /> },
            { value: "dark", label: "Dark", icon: <IconMoon /> },
            { value: "system", label: "Match system", icon: <IconSystem /> },
          ]}
        />
        <div className="docs-appearance-control">
          <span className="type-label">Palette</span>
          <SwatchPicker
            aria-label="Palette"
            size={choiceSize}
            collapse="none"
            value={appearance.palette}
            onValueChange={(palette) => update({ palette, accentHue: null })}
            options={PALETTES.map((palette) => ({
              value: palette,
              label: PALETTE_LABELS[palette] ?? palette,
              palette,
            }))}
          />
        </div>
        <AppearanceChoices<Appearance["glass"]>
          label="Material"
          value={appearance.glass}
          onValueChange={(glass) => update({ glass })}
          options={[
            { value: "full", label: "Glass" },
            { value: "reduced", label: "Frosted" },
            { value: "solid", label: "Solid" },
          ]}
        />
        <AppearanceChoices<"full" | "reduced">
          label="Animations"
          value={appearance.motion === "reduced" ? "reduced" : "full"}
          onValueChange={(motion) => update({ motion })}
          options={[
            { value: "full", label: "Animated" },
            { value: "reduced", label: "Still" },
          ]}
        />
        <AppearanceChoices<Appearance["density"]>
          label="Density"
          value={appearance.density}
          onValueChange={(density) => update({ density })}
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
          ]}
        />
        <AppearanceChoices<NonNullable<Appearance["background"]>>
          label="Background"
          value={appearance.background ?? "silk"}
          onValueChange={(background) => update({ background })}
          options={BACKGROUNDS.map((value) => ({
            value,
            label: BACKGROUND_LABELS[value],
          }))}
        />
      </div>
    );
  // One line that gives way in order (fa-fit-row): the palette folds to its menu first, then
  // density, animations and material; the background select truncates last; the mode switch
  // keeps its icons.
  return (
    <div
      className="docs-toolbar fa-fit-row"
      role="region"
      aria-label="Appearance controls"
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
        className="fa-fit-1"
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
        className="fa-fit-4"
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
        className="fa-fit-3"
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
        className="fa-fit-2"
        aria-label="Density"
        value={appearance.density}
        onValueChange={(density) => update({ density })}
        options={[
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ]}
      />
      <Select
        size="sm"
        className="docs-background-select fa-fit-5"
        aria-label="Background"
        value={appearance.background ?? "silk"}
        onValueChange={(background) => {
          if (background) update({ background });
        }}
        options={BACKGROUNDS.map((value) => ({
          value,
          label: BACKGROUND_LABELS[value],
        }))}
      />
    </div>
  );
}
/**
 * The desktop header's appearance controls: the toolbar while its folded controls fit
 * (a container query on this box), else one Appearance button whose popover holds them.
 */
function HeaderAppearance() {
  return (
    <div className="docs-header-appearance">
      <Toolbar />
      <Popover.Root>
        <Popover.Trigger
          render={
            <Button
              variant="ghost"
              size="sm"
              icon={<IconSettings />}
              className="docs-appearance-button"
            >
              Appearance
            </Button>
          }
        />
        <Popover.Popup
          align="end"
          size="lg"
          className="docs-appearance-popover"
        >
          <ChoiceSize value="sm">
            <Toolbar expanded />
          </ChoiceSize>
        </Popover.Popup>
      </Popover.Root>
    </div>
  );
}

function Layout() {
  const [query, setQuery] = useState("");
  const [browse, setBrowse] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const browseButton = useRef<HTMLButtonElement>(null);
  const appearanceButton = useRef<HTMLButtonElement>(null);
  const phone = usePhoneLayout();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activePath = pathname.startsWith(import.meta.env.BASE_URL)
    ? `/${pathname.slice(import.meta.env.BASE_URL.length)}`
    : pathname;
  const search = query.trim().toLowerCase();
  const matches = (...text: string[]) =>
    text.join(" ").toLowerCase().includes(search);
  const items = componentFamilies.filter((item) =>
    item.components.some((component) =>
      matches(
        component.name,
        component.description,
        component.id,
        componentGroup(item.family),
      ),
    ),
  );
  const guides = libraryGuides.filter((guide) =>
    matches(guide.title, guide.id, "Guides"),
  );
  const foundationItems = foundations.filter((section) =>
    matches(section.title, section.summary, section.id, "Foundations"),
  );
  const showTypes = matches("Types and helpers", "TypeDoc", "API reference");
  const showSource = matches("Source and releases", "GitHub");
  const empty =
    !items.length &&
    !guides.length &&
    !foundationItems.length &&
    !showTypes &&
    !showSource;
  const activate = () => {
    setQuery("");
    setBrowse(false);
  };
  const directory = (
    <div className="docs-directory">
      <SectionDrawer.Search
        noun="documentation"
        placeholder="Search"
        value={query}
        onValueChange={setQuery}
      />
      <SectionDrawer.Body className="docs-directory-scroll">
        {empty ? (
          <p role="status" className="type-caption text-fg-muted">
            No documentation matches “{query.trim()}”.
          </p>
        ) : null}
        {guides.length ? (
          <nav className="docs-nav" aria-label="Guides">
            <DirectoryGroup
              id="guides"
              title="Guides"
              count={guides.length}
              searching={Boolean(search)}
            >
              <SectionDrawer.List>
                {guides.map((guide) => (
                  <SectionDrawer.Item
                    key={guide.id}
                    onClick={activate}
                    active={activePath === `/guides/${guide.id}`}
                    label={
                      <SectionDrawer.Match
                        text={guide.title}
                        query={query.trim()}
                      />
                    }
                    render={
                      <Link to="/guides/$guide" params={{ guide: guide.id }} />
                    }
                  />
                ))}
              </SectionDrawer.List>
            </DirectoryGroup>
          </nav>
        ) : null}
        {foundationItems.length ? (
          <nav className="docs-nav" aria-label="Foundations">
            <DirectoryGroup
              id="foundations"
              title="Foundations"
              count={foundationItems.length}
              searching={Boolean(search)}
            >
              <SectionDrawer.List>
                {foundationItems.map((section) => (
                  <SectionDrawer.Item
                    key={section.id}
                    onClick={activate}
                    active={activePath === `/foundations/${section.id}`}
                    label={
                      <SectionDrawer.Match
                        text={section.title}
                        query={query.trim()}
                      />
                    }
                    render={
                      <Link
                        to="/foundations/$section"
                        params={{ section: section.id }}
                      />
                    }
                  />
                ))}
              </SectionDrawer.List>
            </DirectoryGroup>
          </nav>
        ) : null}

        {items.length ? (
          <nav className="docs-nav" aria-label="Components">
            {COMPONENT_GROUPS.map((group) => {
              const entries = items.filter(
                (item) => componentGroup(item.family) === group,
              );
              return entries.length ? (
                <DirectoryGroup
                  key={group}
                  id={group.toLowerCase()}
                  title={group}
                  count={entries.length}
                  searching={Boolean(search)}
                >
                  <SectionDrawer.List>
                    {entries.map((item) => (
                      <SectionDrawer.Item
                        key={item.id}
                        onClick={activate}
                        active={item.components.some(
                          (component) =>
                            activePath === `/components/${component.id}`,
                        )}
                        label={
                          <SectionDrawer.Match
                            text={item.name}
                            query={query.trim()}
                          />
                        }
                        render={
                          <Link
                            to="/components/$component"
                            params={{ component: item.id }}
                            hash={
                              search &&
                              !matches(item.name, item.description, item.id)
                                ? item.components.find((component) =>
                                    matches(
                                      component.name,
                                      component.description,
                                      component.id,
                                    ),
                                  )?.id
                                : undefined
                            }
                          />
                        }
                      />
                    ))}
                  </SectionDrawer.List>
                </DirectoryGroup>
              ) : null;
            })}
          </nav>
        ) : null}
      </SectionDrawer.Body>
      {showTypes || showSource ? (
        <SectionDrawer.Footer>
          <SectionDrawer.List>
            {showTypes ? (
              <SectionDrawer.Item
                icon={<IconCode />}
                label="API reference"
                render={<a href={`${import.meta.env.BASE_URL}api/`} />}
                onClick={activate}
              />
            ) : null}
            {showSource ? (
              <SectionDrawer.Item
                icon={<IconGithub />}
                label="Source and releases"
                render={<a href="https://github.com/Dastari/glass-ux" />}
                onClick={activate}
              />
            ) : null}
          </SectionDrawer.List>
        </SectionDrawer.Footer>
      ) : null}
    </div>
  );
  return (
    <AppearanceProvider>
      <TooltipProvider>
        <ActionProvider>
          <PaletteProvider>
            <div className="gallery-shell docs-layout">
              {phone ? (
                <header className="docs-mobile-header">
                  <Link to="/" className="gallery-brand" onClick={activate}>
                    <BrandMark mark="product" tones="palette" className="gallery-brand-mark" />
                    <span className="gallery-brand-name">Glass UX</span>
                  </Link>
                  <div className="docs-mobile-actions">
                    <RepositoryLink />
                    <Button
                      ref={browseButton}
                      variant="ghost"
                      icon={<IconSidebar />}
                      aria-label="Browse"
                      aria-expanded={browse}
                      aria-haspopup="dialog"
                      onClick={() => setBrowse(true)}
                    >
                      <span className="docs-mobile-action-label">Browse</span>
                    </Button>
                    <Button
                      ref={appearanceButton}
                      variant="ghost"
                      icon={<IconSettings />}
                      aria-label="Appearance"
                      aria-expanded={appearanceOpen}
                      aria-haspopup="dialog"
                      onClick={() => setAppearanceOpen(true)}
                    >
                      <span className="docs-mobile-action-label">
                        Appearance
                      </span>
                    </Button>
                  </div>
                </header>
              ) : (
                <SectionDrawer.Root
                  className="docs-sidebar"
                  aria-label="Component navigation"
                >
                  <SectionDrawer.Header
                    icon={<BrandMark mark="product" tones="palette" />}
                    title={
                      <Link to="/" onClick={activate}>
                        Glass UX
                      </Link>
                    }
                    subtitle={`v${DOCUMENTATION_VERSION}`}
                  />
                  {directory}
                </SectionDrawer.Root>
              )}
              <main
                className="gallery-main docs-main"
                tabIndex={0}
                aria-label="Documentation"
              >
                {!phone ? (
                  <header className="gallery-header docs-header">
                    <RepositoryLink />
                    <HeaderAppearance />
                  </header>
                ) : null}
                <div
                  className="gallery-content docs-content"
                  data-scroll-container
                  tabIndex={0}
                  role="region"
                  aria-label="Documentation content"
                >
                  <Suspense fallback={<RouteLoading />}>
                    <Outlet />
                  </Suspense>
                </div>
              </main>
              {phone ? (
                <>
                  <Dialog.Root open={browse} onOpenChange={setBrowse}>
                    <Dialog.Popup
                      className="docs-mobile-dialog docs-navigation-dialog"
                      initialFocus={() =>
                        document.querySelector<HTMLInputElement>(
                          '.docs-navigation-dialog [aria-label="Search documentation"]',
                        )
                      }
                      finalFocus={browseButton}
                    >
                      <Dialog.Header
                        role="presentation"
                        title="Documentation"
                      />
                      <DrawerPlacement value="sheet">
                        {directory}
                      </DrawerPlacement>
                    </Dialog.Popup>
                  </Dialog.Root>
                  <Dialog.Root
                    open={appearanceOpen}
                    onOpenChange={setAppearanceOpen}
                  >
                    <Dialog.Popup
                      className="docs-mobile-dialog docs-appearance-dialog"
                      finalFocus={appearanceButton}
                    >
                      <Dialog.Header role="presentation" title="Appearance" />
                      <Dialog.Body>
                        <Toolbar expanded />
                      </Dialog.Body>
                    </Dialog.Popup>
                  </Dialog.Root>
                </>
              ) : null}
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
  component: Showcase,
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
