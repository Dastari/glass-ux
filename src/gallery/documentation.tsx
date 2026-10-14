// oxlint-disable jsx-a11y/no-noninteractive-tabindex -- documentation scrollers must be keyboard reachable
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import catalogue from "./catalogue.generated.json";
import { findSection } from "./registry.js";
import { VerticalTabNav } from "../ui/vertical-tabs/index.js";
import { Skeleton } from "../ui/skeleton/index.js";
import { Notice } from "../ui/notice/index.js";
import { Markdown } from "../ai/markdown/index.js";
import { Badge } from "../ui/badge/index.js";
import { usePhoneLayout } from "../lib/use-media-query.js";
import { CodeBlock } from "../ai/code-block/index.js";

export const componentCatalogue = catalogue;
interface Prop {
  name: string;
  /** Semantic content or control type. */
  type: string;
  options: Array<string | number | boolean>;
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
  /** Icons supplied for the supported choices. */
  icons?: Array<{ name: string; description: string }>;
  /** Overrides for named content slots. */
  slots: Array<{ name: string; description: string; props: Prop[] }>;
}
const apiPromises = new Map<string, Promise<Api>>();
function loadApi(id: string) {
  let promise = apiPromises.get(id);
  if (!promise) {
    promise = fetch(new URL(`./api/${id}.json`, import.meta.url).href).then(
      (response) => {
        if (!response.ok) throw new Error("The API reference could not load.");
        return response.json() as Promise<Api>;
      },
    );
    apiPromises.set(id, promise);
  }
  return promise;
}

function Props({ props }: { props: Prop[] }) {
  const own = props.filter((prop) => !prop.inherited);
  const inherited = props.filter((prop) => prop.inherited);
  const table = (rows: Prop[]) => (
    <div
      className="gallery-api-scroll"
      tabIndex={0}
      role="region"
      aria-label="API properties"
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
          <summary>
            Inherited React and DOM properties ({inherited.length})
          </summary>
          {table(inherited)}
        </details>
      ) : null}
    </>
  );
}

/** The public API reference for a single component, including every compound slot. */
export function ApiReference({ id }: { id: string }) {
  const [api, setApi] = useState<Api>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let active = true;
    setApi(undefined);
    setError(undefined);
    loadApi(id)
      .then((value) => {
        if (active) setApi(value);
      })
      .catch((reason) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!api)
    return (
      <div aria-busy="true">
        <Skeleton.Text lines={3} />
      </div>
    );
  return (
    <section className="gallery-api">
      <h2 id="api-title">API</h2>
      <CodeBlock
        code={`import { ${api.id === "icons" ? "IconSearch" : api.name} } from "${api.entry}"`}
        language="tsx"
        title="Import"
        label={`${api.name} API import`}
        headingLevel={3}
        wrap
        maxLines={0}
      />
      {api.props ? <Props props={api.props} /> : null}
      {api.slots.map((slot) => (
        <section key={slot.name}>
          <h3>
            {api.name}.{slot.name}
          </h3>
          {slot.description ? <p>{slot.description}</p> : null}
          <Props props={slot.props} />
        </section>
      ))}
    </section>
  );
}

const demoLoaders = import.meta.glob<{
  default: import("react").ComponentType;
}>("./demos/*.js");
const focusedDemos = new Map(
  Object.entries(demoLoaders).map(([path, loader]) => [
    path.split("/").pop()!.replace(".js", ""),
    lazy(loader),
  ]),
);

const DOCUMENT_SECTIONS = [
  { value: "examples", label: "Examples" },
  { value: "usage", label: "Usage" },
  { value: "api", label: "API" },
];

/** A centered, single-page component document with a section-jump side rail. */
export function ComponentDocumentation({ id }: { id: string }) {
  const component =
    id === "icons"
      ? {
          id: "icons",
          name: "Icons",
          entry: "glass-ux/icons",
          family: "icons",
          description:
            "A shared family of scalable icons with accessible labels, theme-aware strokes and tree-shaken named imports.",
          section: "icons",
        }
      : catalogue.find((item) => item.id === id);
  const phone = usePhoneLayout();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("examples");
  useEffect(() => {
    const targets = DOCUMENT_SECTIONS.map((item) =>
      root.current?.querySelector<HTMLElement>(`#${item.value}`),
    ).filter((target): target is HTMLElement => !!target);
    const scrollRoot =
      root.current?.querySelector(".gallery-component-document") ?? null;
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
    const hash = window.location.hash.slice(1);
    if (DOCUMENT_SECTIONS.some((item) => item.value === hash))
      root.current
        ?.querySelector<HTMLElement>(`#${hash}`)
        ?.scrollIntoView({ block: "start" });
    return () => observer.disconnect();
  }, [id]);
  if (!component)
    return (
      <Notice tone="warning">This component is not in the catalogue.</Notice>
    );
  const Demo =
    id === "icons" ? findSection("icons")?.Component : focusedDemos.get(id);
  return (
    <div ref={root} className="gallery-document-layout">
      <aside className="gallery-document-rail">
        <VerticalTabNav
          aria-label="On this page"
          layout={phone ? "chips" : "rail"}
          items={DOCUMENT_SECTIONS}
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
        data-scroll-container
        aria-label={`${component.name} documentation`}
        tabIndex={0}
      >
        <header className="gallery-document-intro">
          <Badge>
            {component.family === "charts"
              ? "Charts"
              : component.family === "ai"
                ? "Assistant components"
                : "Component reference"}
          </Badge>
          <h1 className="type-display">{component.name}</h1>
          <Markdown
            text={component.description}
            className="gallery-document-description type-body text-fg-muted"
          />
          <CodeBlock
            code={`import { ${component.id === "icons" ? "IconSearch" : component.name} } from "${component.entry}"`}
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
          <section id="usage" aria-labelledby="usage-title" tabIndex={-1}>
            <UsageExample section={id} />
          </section>
          <section id="api" aria-labelledby="api-title" tabIndex={-1}>
            <ApiReference id={id} />
          </section>
        </div>
      </article>
    </div>
  );
}

/** The complete runnable specimen source, using the package’s public import paths. */
export function UsageExample({ section }: { section: string }) {
  const [code, setCode] = useState("");
  useEffect(() => {
    let active = true;
    setCode("");
    fetch(new URL(`./examples/${section}.tsx.txt`, import.meta.url).href)
      .then((response) => {
        if (!response.ok) throw new Error("Example source could not load.");
        return response.text();
      })
      .then((text) => {
        if (active) setCode(text);
      });
    return () => {
      active = false;
    };
  }, [section]);
  return (
    <section className="gallery-usage-example">
      <h2 id="usage-title">Usage</h2>
      <p>
        This complete example uses the same package as the live demo. Gallery
        fixtures are sample data; replace them with your application’s adapters.
      </p>
      {code ? (
        <CodeBlock
          code={code}
          language="tsx"
          title="Complete example"
          label={`${section} complete example`}
          headingLevel={3}
          lineNumbers
          maxLines={32}
        />
      ) : (
        <Skeleton.Text lines={3} />
      )}
    </section>
  );
}
