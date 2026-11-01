// oxlint-disable jsx-a11y/no-noninteractive-tabindex -- documentation scrollers must be keyboard reachable
import { Suspense, use, useEffect, useMemo, useRef, useState } from "react";
import { DemoScope, HiddenSpecimens, specimenAnchor } from "./demo-scope.js";
import { siteRuntime, useDocsSite, type DocsSite, type SiteCollection } from "./site.js";
import { VerticalTabNav } from "../ui/vertical-tabs/index.js";
import { Skeleton } from "../ui/skeleton/index.js";
import { Notice } from "../ui/notice/index.js";
import { Markdown } from "../ai/markdown/index.js";
import { Badge } from "../ui/badge/index.js";
import { useMediaQuery } from "../hooks/index.js";
import { CodeBlock } from "../ai/code-block/index.js";

const PHONE_QUERY = "(width < 48rem)";
interface Prop {
  name: string;
  /** Semantic content or control type. */
  type: string;
  options: Array<string | number | boolean | null>;
  required: boolean;
  default: string | null;
  description: string;
  inherited: boolean;
}
interface Api {
  id: string;
  name: string;
  entry: string;
  description: string;
  props?: Prop[];
  /** Whether the component also accepts its element's standard HTML attributes, which are not listed. */
  htmlAttributes?: boolean;
  /** Icons supplied for the supported choices. */
  icons?: Array<{ name: string; description: string }>;
  /** Overrides for named content slots. */
  slots: Array<{
    name: string;
    description: string;
    props: Prop[];
    htmlAttributes?: boolean;
  }>;
}
const collectionOf = (site: DocsSite, id: string): SiteCollection | undefined =>
  site.collections.find((collection) => collection.id === id);

function Props({
  props,
  label,
  htmlAttributes = false,
}: {
  props: Prop[];
  label: string;
  htmlAttributes?: boolean;
}) {
  const own = props.filter((prop) => !prop.inherited);
  const inherited = props.filter((prop) => prop.inherited);
  const table = (rows: Prop[], inherited = false) => (
    <div
      className="gallery-api-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${label}${inherited ? " inherited" : ""} properties`}
    >
      <table className="gallery-api-table">
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Valid options</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((prop) => (
            <tr key={prop.name}>
              <th scope="row">
                <code>{prop.name}</code>
                {prop.required ? <span> required</span> : null}
              </th>
              <td>
                <code>{prop.type}</code>
              </td>
              <td>
                <code>
                  {prop.options
                    .map((value) => JSON.stringify(value))
                    .join(" · ") || "See type"}
                </code>
              </td>
              <td>
                <code>{prop.default ?? "—"}</code>
              </td>
              <td>{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <>
      {table(own)}
      {inherited.length ? (
        <details>
          <summary>Inherited properties ({inherited.length})</summary>
          {table(inherited, true)}
        </details>
      ) : null}
      {htmlAttributes ? (
        <p>
          Also accepts the element’s standard HTML attributes and React DOM
          events.
        </p>
      ) : null}
    </>
  );
}

/** Rendering options for one export's complete API reference. */
export interface ApiReferenceProps {
  /** Original component catalogue identifier. */
  id: string;
  /** Unique heading anchor when multiple APIs share a document. @defaultValue `"api-title"` */
  headingId?: string;
  /** Heading level within the surrounding article. @defaultValue `2` */
  headingLevel?: 2 | 3;
  /** Heading text; family documents use the individual export's name. @defaultValue `"API"` */
  title?: string;
}

/** The public API reference for a single component, including every compound slot. */
export function ApiReference({
  id,
  headingId = "api-title",
  headingLevel = 2,
  title = "API",
}: ApiReferenceProps) {
  const site = useDocsSite();
  const [api, setApi] = useState<Api>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let active = true;
    setApi(undefined);
    setError(undefined);
    siteRuntime(site)
      .content()
      .then((content) => content.loadApi(id))
      .then((value) => {
        if (active) setApi(value as Api);
      })
      .catch((reason) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, [site, id]);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const SlotHeading = headingLevel === 2 ? "h3" : "h4";
  return (
    <section className="gallery-api">
      <Heading id={headingId}>{title}</Heading>
      {error ? (
        <Notice tone="danger">{error}</Notice>
      ) : !api ? (
        <div aria-busy="true">
          <Skeleton.Text lines={3} />
        </div>
      ) : (
        <>
          <CodeBlock
            code={`import { ${collectionOf(site, api.id)?.sample ?? api.name} } from "${api.entry}"`}
            language="tsx"
            title="Import"
            label={`${api.name} API import`}
            headingLevel={headingLevel === 2 ? 3 : 4}
            wrap
            maxLines={0}
          />
          {api.props ? (
            <Props
              props={api.props}
              label={api.name}
              htmlAttributes={api.htmlAttributes}
            />
          ) : null}
          {api.slots.map((slot) => (
            <section key={slot.name}>
              <SlotHeading id={`${headingId}-${slot.name.toLowerCase()}`}>
                {api.name}.{slot.name}
              </SlotHeading>
              {slot.description ? <p>{slot.description}</p> : null}
              <Props
                props={slot.props}
                label={`${api.name}.${slot.name}`}
                htmlAttributes={slot.htmlAttributes}
              />
            </section>
          ))}
        </>
      )}
    </section>
  );
}

/**
 * For each related export after the base component: the specimens an earlier demo in the
 * document already showed (hidden in its demo), and the titles of its own specimens that are
 * all shown above when nothing new is left.
 */
function sharedSpecimens(
  ids: string[],
  demoSpecimens: ReadonlyMap<string, Array<{ key: string; title: string }>>,
) {
  const shown = new Set<string>();
  const result = new Map<string, { hidden: ReadonlySet<string>; above: Array<{ key: string; title: string }> | null }>();
  ids.forEach((id, index) => {
    const own = demoSpecimens.get(id) ?? [];
    const hidden = new Set(shown);
    const fresh = own.filter((specimen) => !hidden.has(specimen.key));
    result.set(id, { hidden, above: index > 0 && own.length > 0 && fresh.length === 0 ? own : null });
    for (const specimen of own) shown.add(specimen.key);
  });
  return result;
}

const EMPTY: ReadonlySet<string> = new Set();

/** A centered, single-page component document with a section-jump side rail. */
export function ComponentDocumentation({ id }: { id: string }) {
  const site = useDocsSite();
  const runtime = siteRuntime(site);
  const content = use(runtime.content());
  const family = runtime.families.find(id);
  const collection = collectionOf(site, id);
  const component = collection ?? family;
  const components = useMemo(
    () => family?.components ?? (component ? [component] : []),
    [family, component],
  );
  const sharing = useMemo(
    () => sharedSpecimens(components.map((item) => item.id), content.specimens),
    [components, content],
  );
  const documentSections = useMemo(
    () => [
      { value: "examples", label: "Examples" },
      ...components.slice(1).map((item) => ({
        value: item.id,
        label: item.name,
      })),
      { value: "usage", label: "Usage" },
      { value: "api", label: "API" },
    ],
    [components],
  );
  const phone = useMediaQuery(PHONE_QUERY);
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("examples");
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const targets = documentSections
      .map((item) => root.current?.querySelector<HTMLElement>(`#${item.value}`))
      .filter((target): target is HTMLElement => !!target);
    const scrollRoot =
      root.current?.closest<HTMLElement>("[data-scroll-container]") ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (current) setActive(current.target.id);
      },
      {
        root: scrollRoot,
        rootMargin: `0px 0px -${Math.max(0, (scrollRoot?.clientHeight ?? 100) - 80)}px 0px`,
      },
    );
    targets.forEach((target) => observer.observe(target));
    const hash = decodeURIComponent(window.location.hash.slice(1));
    // Old per-export routes still open the same specimen, usage or API within
    // their parent document. Named family anchors also work on a direct load.
    const related = component && id !== component.id;
    const targetId = related
      ? !hash || hash === "examples"
        ? id
        : hash === "api" || hash === "usage"
          ? `${hash}-${id}`
          : hash
      : hash;
    if (targetId) {
      // Large families can finish loading examples above a deep link. Scroll only
      // after their modules, source and API content have committed their layout.
      void Promise.allSettled(
        components.flatMap((item) => [
          content.loadDemo(item.id),
          content.loadApi(item.id),
          content.loadExample(item.id),
        ]),
      ).then(() => {
        if (cancelled) return;
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            if (!cancelled)
              root.current
                ?.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`)
                ?.scrollIntoView({ block: "start" });
          });
        });
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [id, component, components, documentSections, content]);
  if (!component)
    return (
      <Notice tone="warning">This component is not in the catalogue.</Notice>
    );
  const Demo = collection
    ? runtime.findSection(collection.section)?.Component
    : content.focusedDemos.get(component.id);
  return (
    <div ref={root} className="gallery-document-layout">
      <aside className="gallery-document-rail">
        <VerticalTabNav
          aria-label="On this page"
          layout={phone ? "tabs" : "rail"}
          items={documentSections}
          value={active}
          renderLink={(item, props) => (
            <a
              {...props}
              href={`#${item.value}`}
              aria-current={item.value === active ? "location" : undefined}
              onClick={() => setActive(item.value)}
            />
          )}
        />
      </aside>
      <article
        className="gallery-documentation gallery-component-document"
        aria-label={`${component.name} documentation`}
      >
        <header className="gallery-document-intro">
          <Badge>{site.badges[component.family] ?? "Component reference"}</Badge>
          <h1 className="type-display">{component.name}</h1>
          <Markdown
            text={component.description}
            className="gallery-document-description type-body text-fg-muted"
          />
          <CodeBlock
            code={`import { ${collection?.sample ?? component.name} } from "${component.entry}"`}
            language="tsx"
            title="Import"
            label={`${component.name} import`}
            headingLevel={2}
            wrap
            maxLines={0}
          />
        </header>
        <div className="gallery-document-sections">
          <section id="examples" aria-labelledby="examples-title" tabIndex={-1}>
            <h2 id="examples-title">Examples</h2>
            <Suspense fallback={<Skeleton.Text lines={4} />}>
              {Demo ? (
                <Demo />
              ) : (
                <Notice>
                  See the API for this component’s typed contract.
                </Notice>
              )}
            </Suspense>
          </section>
          {components.slice(1).map((item) => {
            const RelatedDemo = content.focusedDemos.get(item.id);
            const shared = sharing.get(item.id);
            return (
              <section
                key={item.id}
                id={item.id}
                aria-labelledby={`${item.id}-title`}
                tabIndex={-1}
                className="gallery-related-component"
              >
                <header>
                  <h2 id={`${item.id}-title`}>{item.name}</h2>
                  <Markdown
                    text={item.description}
                    className="type-body text-fg-muted"
                  />
                </header>
                {shared?.above ? (
                  <p className="type-body text-fg-muted" data-shown-above="">
                    Shown in the examples above:{" "}
                    {shared.above.map((specimen, index) => (
                      <span key={specimen.key}>
                        {index ? ", " : null}
                        <a href={`#${specimenAnchor(specimen.key)}`}>{specimen.title}</a>
                      </span>
                    ))}
                    .
                  </p>
                ) : (
                  <Suspense fallback={<Skeleton.Text lines={4} />}>
                    {RelatedDemo ? (
                      <HiddenSpecimens value={shared?.hidden ?? EMPTY}>
                        <DemoScope value={item.name}>
                          <RelatedDemo />
                        </DemoScope>
                      </HiddenSpecimens>
                    ) : null}
                  </Suspense>
                )}
              </section>
            );
          })}
          <section id="usage" aria-labelledby="usage-title" tabIndex={-1}>
            <h2 id="usage-title">Usage</h2>
            <p>
              Complete examples use the same package as the live demos. Replace
              fictional sample data with your application’s adapters.
            </p>
            {components.map((item) => (
              <UsageExample
                key={item.id}
                section={item.id}
                title={item.name}
                headingId={`usage-${item.id}`}
                headingLevel={3}
              />
            ))}
          </section>
          <section id="api" aria-labelledby="api-title" tabIndex={-1}>
            <h2 id="api-title">API</h2>
            {components.length > 1 ? (
              <nav aria-label="Individual APIs" className="gallery-api-index">
                {components.map((item) => (
                  <a key={item.id} href={`#api-${item.id}`}>
                    {item.name}
                  </a>
                ))}
              </nav>
            ) : null}
            {components.map((item) => (
              <ApiReference
                key={item.id}
                id={item.id}
                title={item.name}
                headingId={`api-${item.id}`}
                headingLevel={3}
              />
            ))}
          </section>
        </div>
      </article>
    </div>
  );
}

export interface FoundationDocumentationProps {
  /** Foundation section identifier, such as colour, typography or space. */
  id: string;
}

/** A Foundation's styled title, introduction and examples in one centered article. Icons retain their usage and API sections. */
export function FoundationDocumentation({ id }: FoundationDocumentationProps) {
  const site = useDocsSite();
  const section = siteRuntime(site).findSection(id);
  if (!section || section.group !== "Foundations")
    return (
      <Notice tone="warning">This Foundation is not in the catalogue.</Notice>
    );
  if (collectionOf(site, id)) return <ComponentDocumentation id={id} />;
  const { Component } = section;
  return (
    <article
      className="gallery-documentation gallery-foundation-document"
      aria-label={`${section.title} foundation`}
    >
      <header className="gallery-document-intro">
        <Badge>Foundation</Badge>
        <h1 className="type-display">{section.title}</h1>
        <p className="gallery-document-description type-body text-fg-muted">
          {section.summary}
        </p>
      </header>
      <Suspense fallback={<Skeleton.Text lines={4} />}>
        <Component />
      </Suspense>
    </article>
  );
}

/** The complete runnable specimen source, using the package’s public import paths. */
export function UsageExample({
  section,
  title = "Usage",
  headingId = "usage-title",
  headingLevel = 2,
}: {
  /** Original component catalogue identifier for the runnable source. */
  section: string;
  /** Visible section heading. @defaultValue `"Usage"` */
  title?: string;
  /** Unique source heading anchor. @defaultValue `"usage-title"` */
  headingId?: string;
  /** Heading level within the surrounding article. @defaultValue `2` */
  headingLevel?: 2 | 3;
}) {
  const site = useDocsSite();
  const [code, setCode] = useState("");
  useEffect(() => {
    let active = true;
    setCode("");
    siteRuntime(site)
      .content()
      .then((content) => content.loadExample(section))
      .then((text) => {
        if (active) setCode(text);
      });
    return () => {
      active = false;
    };
  }, [site, section]);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className="gallery-usage-example">
      <Heading id={headingId}>{title}</Heading>
      {code ? (
        <CodeBlock
          code={code}
          language="tsx"
          title="Complete example"
          label={`${section} complete example`}
          headingLevel={headingLevel === 2 ? 3 : 4}
          lineNumbers
          maxLines={32}
        />
      ) : (
        <Skeleton.Text lines={3} />
      )}
    </section>
  );
}
