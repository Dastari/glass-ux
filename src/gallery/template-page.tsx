import { Suspense, type ComponentType, type ReactNode } from "react";
import { Badge } from "../ui/badge/index.js";
import { Skeleton } from "../ui/skeleton/index.js";
import { UsageExample } from "./documentation.js";

/** One block of source under a template, from a section the docs catalogue has examples for. */
export interface TemplateSource {
  /** The section whose example holds the source ("template-settings"). */
  section: string;
  /** Its heading: "Source". */
  title: string;
  /** The heading's id, for a link to it. */
  headingId: string;
}

export interface TemplateDocumentationProps {
  /** The page's heading. */
  title: string;
  /** One or two sentences under it. */
  summary: string;
  /** The live screen, drawn in a bounded frame on the canvas. Give a lazy component to load it with the page. */
  screen: ComponentType;
  /** Source to copy, in order under the screen. */
  sources?: readonly TemplateSource[];
  /** The host's link to the screen on its own. */
  fullScreen?: ReactNode;
  /** The badge over the title. Default "Template". */
  badge?: string;
}

/** A template's page: the live screen in a bounded frame on the canvas, then its source to copy. */
export function TemplateDocumentation({ title, summary, screen: Screen, sources = [], fullScreen, badge = "Template" }: TemplateDocumentationProps) {
  return (
    <article className="gallery-documentation gallery-template-document" aria-label={`${title} template`}>
      <header className="gallery-document-intro">
        <Badge>{badge}</Badge>
        <h1 className="type-display">{title}</h1>
        <p className="gallery-document-description type-body text-fg-muted">{summary}</p>
      </header>
      {fullScreen ? <div className="flex justify-end">{fullScreen}</div> : null}
      <div className="gallery-template-stage">
        <Suspense fallback={<Skeleton.Block className="h-full" radius="surface" />}>
          <Screen />
        </Suspense>
      </div>
      {sources.map((source) => (
        <UsageExample key={source.section} section={source.section} title={source.title} headingId={source.headingId} />
      ))}
    </article>
  );
}

export interface TemplatePreviewProps {
  /** The live screen. Give a lazy component to load it with the page. */
  screen: ComponentType;
  /** Puts the screen in a frame, such as the application's own shell. Without it the screen fills what it is given. */
  shell?: (screen: ReactNode) => ReactNode;
}

/** A template alone, filling the viewport. */
export function TemplatePreview({ screen: Screen, shell }: TemplatePreviewProps) {
  const screen = (
    <Suspense fallback={<Skeleton.Block className="h-full" radius="surface" />}>
      <Screen />
    </Suspense>
  );
  return shell ? shell(screen) : screen;
}
