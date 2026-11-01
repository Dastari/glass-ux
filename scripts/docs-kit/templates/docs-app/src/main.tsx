// The site frame, copied once by `glass-ux-docs init`. It is yours to change: brand, navigation
// and a landing page belong here. Updating the kit does not touch this file.
import { DocsDirection, LANGUAGES, restoreDocsLanguage, setDocsLanguage, useDocsLanguage, type DocsLanguage } from "./language.js";
import { createRoot } from "react-dom/client";
import { createContext, Suspense, use, useRef, useState, type ReactElement, type ReactNode } from "react";
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
  type VisualStyle,
} from "glass-ux/appearance";
import { ActionProvider } from "glass-ux/actions";
import { PaletteProvider } from "glass-ux/command-palette";
import { TooltipProvider } from "glass-ux/tooltip";
import { SwatchPicker } from "glass-ux/swatch-picker";
import { Select } from "glass-ux/select";
import { Button } from "glass-ux/button";
import { ButtonLink } from "glass-ux/button-link";
import { Dialog } from "glass-ux/dialog";
import { Popover } from "glass-ux/popover";
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "glass-ux/sidebar";
import { IconSun, IconMoon, IconSystem, IconSidebar, IconSettings, IconGithub, IconCode } from "glass-ux/icons";
import { Skeleton } from "glass-ux/skeleton";
import {
  CatalogueIndex,
  ComponentDocumentation,
  DocsKitProvider,
  FoundationDocumentation,
  LibraryGuide,
  siteRuntime,
  type CatalogueLinkProps,
} from "glass-ux-docs-kit/react";
import { site } from "../../../src/gallery/site.generated";
import "./styles.css";

const runtime = siteRuntime(site);
const foundations = runtime.sections.filter((section) => section.group === "Foundations");

/** A route's placeholder while its code loads, so the shell and toolbar never move. */
function RouteLoading() {
  return (
    <div className="docs-route-loading" role="status" aria-label="Loading the page">
      <Skeleton.Text type="display" width="45%" />
      <Skeleton.Text lines={3} />
      <Skeleton.Block className="docs-route-loading-block" radius="surface" />
    </div>
  );
}

configureAppearance({ defaults: { palette: "ocean", style: "glass" } });

function RepositoryLink() {
  if (!site.repositoryUrl) return null;
  return (
    <ButtonLink
      href={site.repositoryUrl}
      target="_blank"
      rel="noopener noreferrer"
      variant="ghost"
      size="sm"
      className="docs-repository-link"
      icon={<IconGithub />}
      aria-label={`${site.title} on GitHub`}
      title="GitHub repository"
    >
      {null}
    </ButtonLink>
  );
}

/** A directory group: remembered while browsing, an open group of matches while searching. */
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
  return (
    <Sidebar.Group id={id} collapsible={!searching}>
      <Sidebar.GroupLabel count={searching ? undefined : count}>{title}</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>{children}</Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  );
}

/** One destination: its label with the search's matches marked, and the route's link. */
function DirectoryLink({
  label,
  query,
  active = false,
  icon,
  link,
  onClick,
}: {
  label: string;
  query: string;
  active?: boolean;
  icon?: ReactNode;
  link: ReactElement;
  onClick: () => void;
}) {
  return (
    <Sidebar.MenuItem>
      <Sidebar.MenuButton icon={icon} active={active} render={link} onClick={onClick}>
        <Sidebar.Match text={label} query={query} />
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>
  );
}

/** The expanded controls' size: md in the phone sheet, sm in the desktop popover. */
const ChoiceSize = createContext<"sm" | "md">("md");

function AppearanceChoices<V extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
}: {
  label: string;
  value: V;
  options: Array<{ value: V; label: string; icon?: ReactNode }>;
  onValueChange: (value: V) => void;
  disabled?: boolean;
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
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** The components' interface language; the docs' own prose stays English. */
function LanguageSelect() {
  const { language } = useDocsLanguage();
  return (
    <Select<DocsLanguage>
      size="sm"
      className="docs-language-select"
      aria-label="Interface language"
      value={language}
      onValueChange={(next) => {
        if (next) void setDocsLanguage(next);
      }}
      options={LANGUAGES.map((option) => ({ value: option.value, label: option.label }))}
    />
  );
}

function Toolbar() {
  const { appearance, update } = useAppearance();
  const choiceSize = use(ChoiceSize);
  const flat = appearance.style === "flat";
  return (
    <div className="docs-toolbar" data-expanded="" role="region" aria-label="Appearance controls">
      <AppearanceChoices<VisualStyle>
        label="Visual style"
        value={appearance.style ?? "glass"}
        onValueChange={(style) => update({ style })}
        options={[
          { value: "flat", label: "Flat" },
          { value: "glass", label: "Glass" },
        ]}
      />
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
        value={flat ? "solid" : appearance.glass}
        disabled={flat}
        onValueChange={(glass) => update({ glass })}
        options={[
          { value: "full", label: "Glass" },
          { value: "reduced", label: "Frosted" },
          { value: "solid", label: "Solid" },
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
        value={flat ? "plain" : (appearance.background ?? "silk")}
        disabled={flat}
        onValueChange={(background) => update({ background })}
        options={BACKGROUNDS.map((value) => ({ value, label: BACKGROUND_LABELS[value] }))}
      />
    </div>
  );
}

function Layout() {
  return (
    <DocsKitProvider site={site}>
      <AppearanceProvider>
        <TooltipProvider>
          <ActionProvider>
            <PaletteProvider>
              <SidebarProvider storageKey="docs.sidebar" className="gallery-shell docs-layout">
                <DocsFrame />
              </SidebarProvider>
            </PaletteProvider>
          </ActionProvider>
        </TooltipProvider>
      </AppearanceProvider>
    </DocsKitProvider>
  );
}

/** The directory in a Sidebar (a sheet on phones) beside the routed page. */
function DocsFrame() {
  const [query, setQuery] = useState("");
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const appearanceButton = useRef<HTMLButtonElement>(null);
  const { appearance } = useAppearance();
  const { isMobile: phone, openMobile, setOpenMobile } = useSidebar();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activePath = pathname.startsWith(import.meta.env.BASE_URL)
    ? `/${pathname.slice(import.meta.env.BASE_URL.length)}`
    : pathname;
  const search = query.trim().toLowerCase();
  const matches = (...text: string[]) => text.join(" ").toLowerCase().includes(search);
  const items = runtime.families.all.filter((item) =>
    item.components.some((component) => matches(component.name, component.description, component.id)),
  );
  const guides = site.guides.filter((guide) => matches(guide.title, guide.id, "Guides"));
  const foundationItems = foundations.filter((section) =>
    matches(section.title, section.summary, section.id, "Foundations"),
  );
  const showTypes = matches("Types and helpers", "TypeDoc", "API reference");
  const empty = !items.length && !guides.length && !foundationItems.length && !showTypes;
  const searching = Boolean(search);
  const marked = query.trim();
  // Choosing a destination clears the search; the phone sheet closes itself.
  const activate = () => setQuery("");
  return (
    <>
      {phone ? (
        <header className="docs-mobile-header">
          <Link to="/" className="gallery-brand" onClick={activate}>
            <span className="gallery-brand-name">{site.title}</span>
          </Link>
          <div className="docs-mobile-actions">
            <RepositoryLink />
            <Button
              variant="ghost"
              icon={<IconSidebar />}
              aria-label="Browse"
              aria-expanded={openMobile}
              aria-haspopup="dialog"
              onClick={() => setOpenMobile(true)}
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
              <span className="docs-mobile-action-label">Appearance</span>
            </Button>
          </div>
        </header>
      ) : null}
      <Sidebar
        className="docs-sidebar"
        variant={appearance.style === "flat" ? "sidebar" : "floating"}
        resizable
        aria-label="Documentation navigation"
      >
        <Sidebar.Header
          title={
            <Link to="/" onClick={activate}>
              {site.title}
            </Link>
          }
          subtitle={`v${site.version}`}
          // The page header's trigger toggles the docked sidebar; the sheet keeps its close button.
          toggle={phone}
        />
        <Sidebar.Search
          aria-label="Search documentation"
          placeholder="Search"
          value={query}
          onValueChange={setQuery}
        />
        <Sidebar.Content className="docs-directory">
          {empty ? (
            <p role="status" className="type-caption text-fg-muted docs-directory-empty">
              No documentation matches “{marked}”.
            </p>
          ) : null}
          {guides.length ? (
            <DirectoryGroup id="guides" title="Guides" count={guides.length} searching={searching}>
              {guides.map((guide) => (
                <DirectoryLink
                  key={guide.id}
                  label={guide.title}
                  query={marked}
                  active={activePath === `/guides/${guide.id}`}
                  onClick={activate}
                  link={<Link to="/guides/$guide" params={{ guide: guide.id }} />}
                />
              ))}
            </DirectoryGroup>
          ) : null}
          {foundationItems.length ? (
            <DirectoryGroup id="foundations" title="Foundations" count={foundationItems.length} searching={searching}>
              {foundationItems.map((section) => (
                <DirectoryLink
                  key={section.id}
                  label={section.title}
                  query={marked}
                  active={activePath === `/foundations/${section.id}`}
                  onClick={activate}
                  link={<Link to="/foundations/$section" params={{ section: section.id }} />}
                />
              ))}
            </DirectoryGroup>
          ) : null}
          {items.length ? (
            <DirectoryGroup id="components" title="Components" count={items.length} searching={searching}>
              {items.map((item) => (
                <DirectoryLink
                  key={item.id}
                  label={item.name}
                  query={marked}
                  active={item.components.some((component) => activePath === `/components/${component.id}`)}
                  onClick={activate}
                  link={<Link to="/components/$component" params={{ component: item.id }} />}
                />
              ))}
            </DirectoryGroup>
          ) : null}
        </Sidebar.Content>
        <Sidebar.Footer>
          {showTypes ? (
            <Sidebar.Menu>
              <DirectoryLink
                icon={<IconCode />}
                label="API reference"
                query=""
                onClick={activate}
                link={<a href={`${import.meta.env.BASE_URL}api/`} />}
              />
            </Sidebar.Menu>
          ) : null}
          <div className="docs-language">
            <LanguageSelect />
          </div>
        </Sidebar.Footer>
        <Sidebar.Rail />
      </Sidebar>
      <SidebarInset className="gallery-main docs-main" tabIndex={0} aria-label="Documentation">
        {!phone ? (
          <header className="gallery-header docs-header">
            <SidebarTrigger className="docs-sidebar-trigger" />
            <RepositoryLink />
            <Popover.Root>
              <Popover.Trigger
                render={
                  <Button variant="ghost" size="sm" icon={<IconSettings />}>
                    Appearance
                  </Button>
                }
              />
              <Popover.Popup align="end" size="lg" className="docs-appearance-popover">
                <ChoiceSize value="sm">
                  <Toolbar />
                </ChoiceSize>
              </Popover.Popup>
            </Popover.Root>
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
      </SidebarInset>
      {phone ? (
        <Dialog.Root open={appearanceOpen} onOpenChange={setAppearanceOpen}>
          <Dialog.Popup className="docs-mobile-dialog docs-appearance-dialog" finalFocus={appearanceButton}>
            <Dialog.Header role="presentation" title="Appearance" />
            <Dialog.Body>
              <Toolbar />
            </Dialog.Body>
          </Dialog.Popup>
        </Dialog.Root>
      ) : null}
    </>
  );
}

function CatalogueLink({ entry, ...props }: CatalogueLinkProps) {
  return <Link {...props} to="/components/$component" params={{ component: entry.id }} />;
}

function Catalogue() {
  const entries = runtime.families.all.map((family) => ({
    id: family.id,
    title: family.name,
    summary: family.description,
    group: "Components",
    href: `${import.meta.env.BASE_URL}components/${family.id}`,
  }));
  return (
    <div className="docs-index">
      <CatalogueIndex entries={entries} groups={["Components"]} LinkComponent={CatalogueLink} />
    </div>
  );
}

const rootRoute = createRootRoute({ component: Layout });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Catalogue });
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
    const { section } = foundationRoute.useParams();
    return <FoundationDocumentation key={section} id={section} />;
  },
});
const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, componentRoute, guideRoute, foundationRoute]),
  basepath: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
});
// The interface language: remembered, or previewed with ?lang=ar&dir=rtl for one visit.
restoreDocsLanguage();
createRoot(document.getElementById("root")!).render(
  <DocsDirection>
    <RouterProvider router={router} />
  </DocsDirection>,
);
