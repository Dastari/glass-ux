import { createContext, useContext, useId, type ReactNode } from "react";
import { IconExternalLink } from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { Tooltip } from "../../ui/tooltip/index.js";
import { EntityGlyph, useEntityResolver } from "../entity-chip/index.js";
import { hostOf, safeExternalHref } from "../entities.js";
import type { AiSource } from "../types.js";

const SourcesContext = createContext<AiSource[]>([]);

/** Make a message's sources available to the citation markers in its text. */
export function SourcesProvider({
  sources,
  children,
}: {
  /** Citations or data sources associated with the content. */
  sources: AiSource[] | undefined;
  children: ReactNode;
}) {
  return <SourcesContext value={sources ?? []}>{children}</SourcesContext>;
}

/**
 * A footnote marker in assistant text (`[^2]`): a small numbered pill. Hover or focus
 * names the source; activating it opens the source (external sources in a new tab).
 */
export function CitationMarker({ index }: {
  /** The footnote number, matched against `index` in the message's sources; an unmatched number renders as a plain superscript. */
  index: number;
}) {
  const source = useContext(SourcesContext).find(
    (item) => item.index === index,
  );
  const resolver = useEntityResolver();
  if (!source)
    return (
      <sup className="fa-ai-cite" data-missing="">
        {index}
      </sup>
    );
  const external = safeExternalHref(source.href);
  const label = `Source ${index}: ${source.title}`;
  return (
    <Tooltip
      content={source.site ? `${source.title} · ${source.site}` : source.title}
      describe={false}
    >
      <a
        className="fa-ai-cite"
        href={external ?? source.href}
        aria-label={label}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={(event) => {
          if (external || !source.entity) return;
          event.preventDefault();
          resolver.open(source.entity);
        }}
      >
        {index}
      </a>
    </Tooltip>
  );
}

/** A monogram tile standing in for a site favicon (no third-party favicon requests). */
function SiteMark({ source }: { source: AiSource }) {
  if (source.entity) {
    return (
      <span className="fa-ai-source-mark" data-entity="">
        <EntityGlyph entity={source.entity} />
      </span>
    );
  }
  const host = source.site ?? hostOf(source.href);
  return (
    <span className="fa-ai-source-mark" aria-hidden>
      {host.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * The sources behind an answer: numbered to match the markers in the text, with the site
 * or the Glass UX record each came from. External sources open in a new tab and say so.
 */
export function SourceList({
  sources,
  className,
}: {
  /** Citations or data sources associated with the content. */
  sources: AiSource[];
  className?: string;
}) {
  const resolver = useEntityResolver();
  const listId = useId();
  return (
    <section className={cx("fa-ai-sources", className)}>
      <h4 className="fa-overline fa-ai-sources-title">Sources</h4>
      <ol className="fa-ai-sources-list">
        {sources.map((source) => {
          const external = safeExternalHref(source.href);
          return (
            <li key={source.id} id={`${listId}-source-${source.index}`}>
              <a
                className="glass-control fa-pressable fa-ai-source"
                href={external ?? source.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                onClick={(event) => {
                  if (external || !source.entity) return;
                  event.preventDefault();
                  resolver.open(source.entity);
                }}
              >
                <span className="fa-ai-source-index" data-numeric>
                  {source.index}
                </span>
                <SiteMark source={source} />
                <span className="fa-ai-source-text">
                  <TruncatedText className="fa-ai-source-title">
                    {source.title}
                  </TruncatedText>
                  <TruncatedText className="fa-ai-source-site">
                    {source.site ?? hostOf(source.href)}
                  </TruncatedText>
                </span>
                {external ? (
                  <IconExternalLink
                    className="fa-ai-source-external"
                    label="Opens in a new tab"
                  />
                ) : null}
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
