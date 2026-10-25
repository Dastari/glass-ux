import { aiMessages } from "../messages.js"
import { useMessages } from "../../lib/i18n/index.js"
import { asksMessages } from "./messages.js"
import { useId, useMemo, useRef, useState } from "react";
import { cx } from "../../lib/cx.js";
import { ActionButton } from "../../ui/button/index.js";
import { Combobox, OptionRow } from "../../ui/combobox/index.js";
import { MultiSelect } from "../../ui/multi-select/index.js";
import { kindSpec } from "../entities.js";
import { EntityGlyph, useEntityResolver } from "../entity-chip/index.js";
import type { AiAsk, EntityRef } from "../types.js";
import { useAskAnswer } from "./choice.js";
import { AskLayout, AskShell } from "./frame.js";

type Ask = Extract<AiAsk, { type: "entity" }>;

const key = (entity: EntityRef) => `${entity.kind}:${entity.id}`;

export interface EntityOptionListProps {
  id: string;
  /** The text being searched for; matches are emphasised. */
  query?: string;
  options: EntityRef[];
  /** Marks the current destination or active choice. */
  active: number;
  /** The selected state or collection. */
  selected: (entity: EntityRef) => boolean;
  /** Called with the entity the person clicks or presses Enter or Space on; adding or removing the pick is up to the caller. */
  onPick: (entity: EntityRef) => void;
  /** Called with the zero-based index of the row under the pointer. Pair with `active` to move the highlight. */
  onActive: (index: number) => void;
  /** Content shown when there are no matching items. */
  empty?: string;
  className?: string;
}

/**
 * The option rows for entity search (the composer's @-mentions and entity-picker asks):
 * fa-item rows with the shared OptionRow — the entity glyph, the name with the match
 * emphasised, a data meta and a ✓ when picked. The input stays the combobox
 * (aria-activedescendant), so focus never leaves the text.
 */
export function EntityOptionList({
  id,
  query = "",
  options,
  active,
  selected,
  onPick,
  onActive,
  empty: emptyProp,
  className,
}: EntityOptionListProps) {
  const messages = useMessages(asksMessages)
  const empty = emptyProp ?? messages.noMatches

  if (!options.length) {
    return (
      <div className={cx("fa-ai-options-empty", className)} role="status">
        {empty}
      </div>
    );
  }
  return (
    <div
      id={id}
      role="listbox"
      className={cx("fa-ai-options", className)}
      aria-multiselectable
    >
      {options.map((entity, index) => {
        const picked = selected(entity);
        return (
          <div
            key={key(entity)}
            id={`${id}-${index}`}
            role="option"
            aria-selected={picked}
            className="fa-item fa-ai-option"
            data-highlighted={index === active ? "" : undefined}
            tabIndex={-1}
            onPointerMove={() => onActive(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(entity)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onPick(entity);
            }}
          >
            <OptionRow
              query={query}
              check={picked}
              item={{
                value: key(entity),
                label: entity.label,
                icon: (
                  <EntityGlyph entity={entity} className="fa-ai-option-glyph" />
                ),
                meta: entity.meta ?? entity.state?.label,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Pick one or more entities: a search field over the application's resolver, the agent's
 * suggestions as the starting list, and the picks as removable chips.
 */
export function EntityPickerAsk({ ask }: {
  /** The entity ask: the question, the `entityKind` searched through the entity resolver, the agent's `suggestions` and whether `multiple` picks are allowed. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask;
}) {
  const messages = useMessages(asksMessages)

  const id = useId();
  const resolver = useEntityResolver();
  const { answered, submit, record } = useAskAnswer(ask);
  const [picked, setPicked] = useState<EntityRef[]>([]);
  const entityMessages = useMessages(aiMessages)
  const spec = kindSpec(resolver.kinds, ask.entityKind, entityMessages);
  const known = useRef(
    new Map(ask.suggestions.map((entity) => [key(entity), entity])),
  );
  const option = (entity: EntityRef) => {
    known.current.set(key(entity), entity);
    return {
      value: key(entity),
      label: entity.label,
      icon: <EntityGlyph entity={entity} />,
    };
  };
  const options = ask.suggestions.map(option);
  const source = useMemo(
    () => ({
      suggestions: ask.suggestions.map(option),
      search: async (query: string) => {
        const found = resolver.search
          ? await Promise.resolve(resolver.search(query, ask.entityKind))
          : ask.suggestions.filter((entity) =>
              entity.label.toLowerCase().includes(query.toLowerCase()),
            );
        return found.map(option);
      },
    }),
    [ask.entityKind, ask.suggestions, resolver],
  );
  const choose = (values: string[]) =>
    setPicked(
      values.flatMap((value) =>
        known.current.get(value) ? [known.current.get(value)!] : [],
      ),
    );
  const labels = picked.map((entity) => entity.label);
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<spec.icon />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footerStart={
          <span className="fa-ai-ask-count" data-numeric aria-live="polite">
            {picked.length
              ? messages.selectedCount(picked.length)
              : ask.multiple ? messages.chooseEntities(spec.plural.toLowerCase()) : messages.chooseOneEntity(spec.noun.toLowerCase())}
          </span>
        }
        footer={
          <ActionButton
            variant="primary"
            size="sm"
            disabledReason={
              picked.length
                ? undefined
                : messages.chooseFirst(ask.multiple ? messages.atLeastOne : "one")
            }
            pendingLabel={messages.sending}
            successLabel={messages.sent}
            onAction={() =>
              submit(
                {
                  type: "entities",
                  ids: picked.map((entity) => entity.id),
                  label: labels.join(", "),
                },
                messages.chosenEntities(labels.join(", ")),
              )
            }
          >
            {ask.submitLabel ?? messages.useSelected}
          </ActionButton>
        }
      >
        {ask.multiple ? (
          <MultiSelect
            aria-label={messages.search(spec.plural.toLowerCase())}
            options={options}
            source={source}
            value={picked.map(key)}
            onValueChange={choose}
            wrap
            placeholder={messages.find(spec.plural.toLowerCase())}
          />
        ) : (
          <Combobox
            aria-label={messages.search(spec.plural.toLowerCase())}
            options={options}
            source={source}
            value={picked[0] ? key(picked[0]) : null}
            onValueChange={(value) => choose(value ? [value] : [])}
            placeholder={messages.find(spec.noun.toLowerCase())}
          />
        )}
      </AskLayout>
    </AskShell>
  );
}
