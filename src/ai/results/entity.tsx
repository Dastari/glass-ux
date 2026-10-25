import { aiMessages } from "../messages.js"
import { useMessages } from "../../lib/i18n/index.js"
import { resultsMessages } from "./messages.js"
import { IconMoreHorizontal } from "../../icons/generated/icons.js";
import {
  ActionBar,
  ActionContextMenu,
  ActionMenu,
} from "../../ui/actions/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { Button } from "../../ui/button/index.js";
import { FactList } from "../../ui/fact-list/index.js";
import { AiCard } from "../card/index.js";
import { kindSpec } from "../entities.js";
import {
  EntityChip,
  EntityGlyph,
  EntityStateBadge,
  useEntityResolver,
} from "../entity-chip/index.js";
import { formatNumber } from "../format.js";
import { useConversationHandlers } from "../handlers.js";
import type { AiResult } from "../types.js";
import { ResultFrame } from "./frame.js";
import { useLocale } from "../../lib/locale/use-locale.js";

type EntityResult = Extract<AiResult, { type: "entity" }>;
type EntitiesResult = Extract<AiResult, { type: "entities" }>;

/**
 * One entity as a card: its glyph and live state, the data subtitle, a few facts and the
 * entity's own actions (R12: ActionBar from the same definition as its page header).
 */
export function ResultEntity({ result }: {
  /** The entity result: the `entity`, an optional `subtitle` and its `facts`; the resolver's `render` may replace the card body and supplies the actions. */
  result: EntityResult;
}) {
  const resolver = useEntityResolver();
  const set = resolver.actions(result.entity.kind);
  const custom = resolver.render?.(result.entity, "card", {
    facts: result.facts,
    subtitle: result.subtitle,
  });
  if (custom !== undefined) {
    return (
      <AiCard.Root
        breakout
        className="fa-ai-result fa-ai-entity-card"
        data-type="entity"
        aria-label={result.entity.label}
      >
        <AiCard.Body>{custom}</AiCard.Body>
      </AiCard.Root>
    );
  }
  return (
    <AiCard.Root
      breakout
      className="fa-ai-result fa-ai-entity-card"
      data-type="entity"
      aria-label={result.entity.label}
    >
      <AiCard.Header
        icon={<EntityGlyph entity={result.entity} />}
        iconTile
        title={
          <EntityChip
            entity={result.entity}
            variant="plain"
            glyph={false}
            className="fa-ai-entity-name"
          />
        }
        meta={result.subtitle}
      >
        <EntityStateBadge entity={result.entity} />
      </AiCard.Header>
      <AiCard.Body>
        {result.facts.length ? <FactList facts={result.facts} /> : null}
      </AiCard.Body>
      {set ? (
        <AiCard.Footer className="fa-ai-entity-actions">
          <ActionBar
            set={set}
            targets={[result.entity]}
            label={result.entity.label}
            maxButtons={3}
          />
        </AiCard.Footer>
      ) : null}
    </AiCard.Root>
  );
}

/**
 * A list of entities as compact rows: glyph with status, name (a context link), a data
 * detail, the state, and the row ⋯ menu — with the same menu on right-click (R11.6).
 */
export function ResultEntities({ result }: {
  /** The entity-list result: the `entities` shown as rows, each with an optional `detail`, and `total` for the count (defaults to the number of entities). */
  result: EntitiesResult;
}) {
  const messages = useMessages(resultsMessages)
 const entityMessages = useMessages(aiMessages)

  const locale = useLocale();
  const resolver = useEntityResolver();
  const handlers = useConversationHandlers();
  const first = result.entities[0];
  const plural = first
    ? kindSpec(resolver.kinds, first.kind, entityMessages).plural.toLowerCase()
    : messages.items;
  const total = result.total ?? result.entities.length;
  return (
    <ResultFrame
      result={result}
      icon={
        first ? (
          <EntityGlyph entity={{ ...first, status: undefined }} />
        ) : (
          <IconMoreHorizontal />
        )
      }
      meta={
        total > result.entities.length
          ? messages.of(formatNumber(result.entities.length, 0, locale), formatNumber(total, 0, locale))
          : `${formatNumber(total, 0, locale)} ${plural}`
      }
      copyText={result.entities
        .map((entity) =>
          [entity.label, entity.detail].filter(Boolean).join(" · "),
        )
        .join("\n")}
      flush
      footer={
        total > result.entities.length ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.openResultWindow(result)}
          >
            {messages.showAllInWindow(formatNumber(total, 0, locale), plural)} </Button>
        ) : undefined
      }
    >
      <ul className="fa-ai-entity-list" aria-label={result.title}>
        {result.entities.map((entity) => {
          const set = resolver.actions(entity.kind);
          const row = (
            <li className="fa-ai-entity-row" tabIndex={-1}>
              <EntityChip
                entity={entity}
                variant="plain"
                className="fa-ai-entity-row-name"
              />
              {entity.detail ? (
                <TruncatedText className="fa-ai-entity-row-detail">
                  {entity.detail}
                </TruncatedText>
              ) : null}
              <span className="fa-ai-entity-row-state">
                <EntityStateBadge entity={entity} />
              </span>
              {set ? (
                <ActionMenu set={set} targets={[entity]} label={entity.label} />
              ) : null}
            </li>
          );
          return set ? (
            <ActionContextMenu
              key={`${entity.kind}:${entity.id}`}
              set={set}
              targets={[entity]}
              label={entity.label}
            >
              {row}
            </ActionContextMenu>
          ) : (
            <li
              key={`${entity.kind}:${entity.id}`}
              className="fa-ai-entity-row"
            >
              <EntityChip
                entity={entity}
                variant="plain"
                className="fa-ai-entity-row-name"
              />
              {entity.detail ? (
                <TruncatedText className="fa-ai-entity-row-detail">
                  {entity.detail}
                </TruncatedText>
              ) : null}
              <span className="fa-ai-entity-row-state">
                <EntityStateBadge entity={entity} />
              </span>
            </li>
          );
        })}
      </ul>
    </ResultFrame>
  );
}
