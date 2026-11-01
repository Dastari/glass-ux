import { Suspense, lazy, type ComponentType, type ReactElement, type ReactNode } from "react";
import { Badge } from "../ui/badge/index.js";
import { Notice } from "../ui/notice/index.js";
import { Skeleton } from "../ui/skeleton/index.js";
import { UsageExample } from "./documentation.js";
import { templates } from "./template-catalogue.js";
import ApplicationShell from "./templates/application-shell.js";

const loaders = import.meta.glob<{ default: ComponentType }>("./templates/*.js");
const screens = new Map(
  templates.flatMap(({ id }) => {
    const loader = loaders[`./templates/${id}.js`];
    return loader ? [[id as string, lazy(loader)] as const] : [];
  }),
);

/** A template's page: the live screen in a bounded frame on the canvas, then its source to copy. */
export function TemplateDocumentation({
  id,
  fullScreen,
}: {
  /** The template's id in `templates`. */
  id: string;
  /** The host's link to the screen on its own. */
  fullScreen?: ReactNode;
}) {
  const template = templates.find((item) => item.id === id);
  const Screen = screens.get(id);
  if (!template || !Screen) return <Notice tone="warning">This template is not in the catalogue.</Notice>;
  return (
    <article className="gallery-documentation gallery-template-document" aria-label={`${template.title} template`}>
      <header className="gallery-document-intro">
        <Badge>Template</Badge>
        <h1 className="type-display">{template.title}</h1>
        <p className="gallery-document-description type-body text-fg-muted">{template.summary}</p>
      </header>
      {fullScreen ? <div className="flex justify-end">{fullScreen}</div> : null}
      <div className="gallery-template-stage" data-template={id}>
        <Suspense fallback={<Skeleton.Block className="h-full" radius="surface" />}>
          <Screen />
        </Suspense>
      </div>
      <UsageExample section={`template-${id}`} title="Source" headingId="template-source" />
      <UsageExample section="template-application-shell" title="Application shell" headingId="template-shell" />
    </article>
  );
}

/** A template alone inside the application shell, filling the viewport. */
export function TemplatePreview({
  id,
  link,
}: {
  /** The template's id in `templates`. */
  id: string;
  /** The host's link to another template's preview. */
  link: (id: string) => ReactElement;
}) {
  const Screen = screens.get(id);
  if (!Screen) return <Notice tone="warning">This template is not in the catalogue.</Notice>;
  return (
    <ApplicationShell current={id} link={link}>
      <Suspense fallback={<Skeleton.Block className="h-full" radius="surface" />}>
        <Screen />
      </Suspense>
    </ApplicationShell>
  );
}
