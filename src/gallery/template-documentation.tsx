import { lazy, type ComponentType, type ReactElement, type ReactNode } from "react";
import { Notice } from "../ui/notice/index.js";
import { templates } from "./template-catalogue.js";
import { TemplateDocumentation as TemplatePage, TemplatePreview as TemplateAlone } from "./template-page.js";
import ApplicationShell from "./templates/application-shell.js";

const loaders = import.meta.glob<{ default: ComponentType }>("./templates/*.js");
const screens = new Map(
  templates.flatMap(({ id }) => {
    const loader = loaders[`./templates/${id}.js`];
    return loader ? [[id as string, lazy(loader)] as const] : [];
  }),
);

/** A template's page in this site, from its id in the catalogue. */
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
    <TemplatePage
      title={template.title}
      summary={template.summary}
      screen={Screen}
      fullScreen={fullScreen}
      sources={[
        { section: `template-${id}`, title: "Source", headingId: "template-source" },
        { section: "template-application-shell", title: "Application shell", headingId: "template-shell" },
      ]}
    />
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
  return <TemplateAlone screen={Screen} shell={(screen) => <ApplicationShell current={id} link={link}>{screen}</ApplicationShell>} />;
}
