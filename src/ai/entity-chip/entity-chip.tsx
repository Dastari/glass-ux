import { DirectionPortal } from "../../lib/direction-portal.js"
import { aiMessages } from "../messages.js"
import { useMessages } from "../../lib/i18n/index.js"
import { entityChipMessages } from "./messages.js"
import { PreviewCard } from "@base-ui/react/preview-card";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { IconClose, IconPopOut } from "../../icons/generated/icons.js";
import { resolveActions, splitForHeader } from "../../lib/actions/actions.js";
import { cx } from "../../lib/cx.js";
import { usePopupMetrics } from "../../lib/popup-metrics.js";
import { ActionContextMenu, useActionRunner } from "../../ui/actions/index.js";
import { Badge, StatusBadge, StatusDot } from "../../ui/badge/index.js";
import { FactList } from "../../ui/fact-list/index.js";
import { Button } from "../../ui/button/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { entityHref, entityName, kindSpec } from "../entities.js";
import type { EntityRef } from "../types.js";
import { useEntityResolver, type EntityPreview } from "./entity-resolver.js";
import { popupContainer } from "../../lib/popup-container.js";

/** Hover delay before the preview opens; quicker than a tooltip, it is the point of the chip. */
const PREVIEW_DELAY_MS = 400;
const PREVIEW_CLOSE_MS = 150;

export type EntityChipSize = "inline" | "sm";

/** The glyph of an entity, with its live status dot when it has one. */
export function EntityGlyph({
  entity,
  className,
}: {
  /** Entity reference supplied by the host. */
  entity: EntityRef;
  className?: string;
}) {
  const resolver = useEntityResolver();
  const custom = resolver.render?.(entity, "icon", { className });
  if (custom !== undefined) return <>{custom}</>;
  const Icon = kindSpec(resolver.kinds, entity.kind).icon;
  return (
    <span
      className={cx("fa-ai-glyph", className)}
      data-kind={entity.kind}
      data-tone={entity.tone}
    >
      <Icon />
      {entity.status ? (
        <StatusDot status={entity.status} overlay className="fa-ai-glyph-dot" />
      ) : null}
    </span>
  );
}

function ChipInner({
  entity,
  glyph = true,
}: {
  /** Entity reference supplied by the host. */
  entity: EntityRef;
  glyph?: boolean;
}) {
  return (
    <>
      {glyph ? (
        <EntityGlyph entity={entity} className="fa-ai-chip-glyph" />
      ) : null}
      <TruncatedText className="fa-ai-chip-label">{entity.label}</TruncatedText>
      {entity.meta ? (
        <span className="fa-ai-chip-meta" data-numeric>
          {entity.meta}
        </span>
      ) : null}
      {entity.state ? (
        <span className="fa-ai-chip-meta" data-tone={entity.state.tone}>
          {entity.state.label}
        </span>
      ) : null}
    </>
  );
}

export interface EntityChipProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  /** Entity reference supplied by the host. */
  entity: EntityRef;
  /** inline: inside prose (20px, sits in the line box) · sm: rows, composer, cards (24px). */
  size?: EntityChipSize;
  /** chip: a soft pill (prose, composer) · plain: glyph and name only (table cells, lists). */
  variant?: "chip" | "plain";
  /** Show the preview card on hover and focus (default for links). */
  preview?: boolean;
  /** Draw the entity glyph (off when a tile beside it already shows it). */
  glyph?: boolean;
  /** Render a removable, non-navigating chip (composer context, picked entities). */
  onRemove?: () => void;
}

/**
 * A Glass UX entity mentioned by the assistant, the user or the composer: glyph (with the
 * endpoint's live status dot), name, and one data meta (ticket state, version). It is a
 * link: click navigates, hover or focus opens a preview card, right-click (Shift+F10)
 * opens the entity's actions — the same definition as its own page (R12).
 */
export function EntityChip({
  entity,
  size = "inline",
  variant = "chip",
  preview = true,
  glyph = true,
  onRemove,
  className,
  ...rest
}: EntityChipProps) {
  const messages = useMessages(entityChipMessages)
 const entityMessages = useMessages(aiMessages)

  const resolver = useEntityResolver();
  const popup = usePopupMetrics();
  const custom = resolver.render?.(
    entity,
    variant === "plain" ? "row" : "chip",
    { size, onRemove, preview, className },
  );
  if (custom !== undefined) return <>{custom}</>;
  if (onRemove) {
    return (
      <span
        {...rest}
        className={cx("fa-ai-chip", className)}
        data-size={size}
        data-kind={entity.kind}
        data-removable=""
      >
        <EntityGlyph entity={entity} className="fa-ai-chip-glyph" />
        <TruncatedText className="fa-ai-chip-label">
          {entity.label}
        </TruncatedText>
        <Button
          variant="ghost"
          shape="circle"
          size="xs"
          className="fa-ai-chip-remove"
          aria-label={messages.remove(entity.label)}
          onClick={onRemove}
        >
          <IconClose />
        </Button>
      </span>
    );
  }

  const href = entityHref(resolver.kinds, entity);
  const set = resolver.actions(entity.kind);
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    resolver.open(entity);
  };
  const chipProps = {
    className: cx("fa-ai-chip fa-ai-chip-link", className),
    "data-size": size,
    "data-kind": entity.kind,
    "data-variant": variant === "plain" ? "plain" : undefined,
    "data-unverified": entity.verified === false ? "" : undefined,
    "aria-label": `${entityName(resolver.kinds, entity, entityMessages)}${entity.verified === false ? messages.notVerified : ""}`,
    href,
    onClick: navigate,
  };

  const trigger = preview ? (
    <PreviewCard.Trigger
      {...(rest as object)}
      {...chipProps}
      delay={PREVIEW_DELAY_MS}
      closeDelay={PREVIEW_CLOSE_MS}
    >
      <ChipInner entity={entity} glyph={glyph} />
    </PreviewCard.Trigger>
  ) : (
    <a {...(rest as ComponentProps<"a">)} {...chipProps}>
      <ChipInner entity={entity} glyph={glyph} />
    </a>
  );
  const withMenu = set ? (
    <ActionContextMenu set={set} targets={[entity]} label={entity.label}>
      {trigger}
    </ActionContextMenu>
  ) : (
    trigger
  );
  if (!preview) return withMenu;
  return (
    <PreviewCard.Root>
      {withMenu}
      <PreviewCard.Portal render={<DirectionPortal />} container={popupContainer()}>
        <PreviewCard.Positioner
          className="fa-ai-preview-positioner"
          sideOffset={popup.offset}
          collisionPadding={popup.collisionPadding}
        >
          <PreviewCard.Popup className="glass-overlay fa-popup fa-ai-preview">
            <EntityPreviewContent
              entity={entity}
              data={resolver.preview(entity)}
            />
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

/** The entity's state as a badge: its live status or its toned state (ticket, alert). */
export function EntityStateBadge({ entity }: {
  /** The entity whose `status` (preferred) or toned `state` is shown; renders nothing when it has neither. */
  entity: EntityRef;
}) {
  if (entity.status) return <StatusBadge status={entity.status} size="sm" />;
  if (entity.state) {
    return (
      <Badge size="sm" tone={entity.state.tone} marker="dot">
        {entity.state.label}
      </Badge>
    );
  }
  return null;
}

/** Up to `max` promoted actions from the entity's set (R12), as small buttons. */
export function EntityQuickActions({
  entity,
  max = 2,
}: {
  /** Entity reference supplied by the host. */
  entity: EntityRef;
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number;
}) {
  const resolver = useEntityResolver();
  const { start } = useActionRunner();
  const set = resolver.actions(entity.kind);
  const promoted = set
    ? splitForHeader(resolveActions(set, [entity], "header"), max).promoted
    : [];
  return (
    <div className="fa-ai-preview-actions">
      {promoted.map((action) => {
        const Icon = action.definition.icon;
        return (
          <Button
            key={action.id}
            size="sm"
            variant={action.definition.primary ? "soft" : "secondary"}
            icon={Icon ? <Icon /> : undefined}
            disabledReason={action.disabledReason ?? undefined}
            onClick={() => void start(action, [entity], "context")}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

function OpenWindowButton({ entity }: { entity: EntityRef }) {
  const messages = useMessages(entityChipMessages)

  const resolver = useEntityResolver();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="fa-ai-preview-window"
      icon={<IconPopOut />}
      aria-label={messages.openInAWindow(entity.label)}
      onClick={() => resolver.openWindow(entity)}
    />
  );
}

/** The inside of the preview card: identity, state, three or four facts, primary actions. */
export function EntityPreviewContent({
  entity,
  data,
  actions = true,
}: {
  /** Entity reference supplied by the host. */
  entity: EntityRef;
  /** Typed records rendered by the component. */
  data?: EntityPreview;
  /** Supporting actions rendered in the action slot. */
  actions?: boolean;
}) {
  const messages = useMessages(entityChipMessages)

  const custom = useEntityResolver().render?.(entity, "preview", {
    subtitle: data?.subtitle,
    facts: data?.facts,
  });
  // A custom preview brings its own body (the application's identity sets its own insets).
  if (custom !== undefined) return <>{custom}</>;
  return (
    <div className="fa-ai-preview-body">
      <div className="fa-ai-preview-head">
        <span className="fa-tile-icon fa-ai-preview-icon">
          <EntityGlyph entity={entity} />
        </span>
        <div className="fa-ai-preview-title">
          <TruncatedText className="fa-ai-preview-name">
            {entity.label}
          </TruncatedText>
          {data?.subtitle ? (
            <TruncatedText className="fa-ai-preview-subtitle">
              {data.subtitle}
            </TruncatedText>
          ) : null}
        </div>
        {actions ? <OpenWindowButton entity={entity} /> : null}
      </div>
      <EntityStateBadge entity={entity} />
      {entity.verified === false ? (
        <p className="fa-hint">
          {messages.namedByAssistantNotConfirmedByTheApplication} </p>
      ) : null}
      {data?.facts?.length ? (
        <FactList
          facts={data.facts.map((fact) => ({
            ...fact,
            value: <span data-numeric>{fact.value}</span>,
          }))}
        />
      ) : null}
      {actions ? <EntityQuickActions entity={entity} /> : null}
    </div>
  );
}

/** The preview card drawn statically, for documentation. */
export function EntityPreviewCard({
  entity,
  data,
  children,
}: {
  /** Entity reference supplied by the host. */
  entity: EntityRef;
  /** Typed records rendered by the component. */
  data?: EntityPreview;
  children?: ReactNode;
}) {
  return (
    <div className="glass-overlay fa-popup fa-ai-preview fa-ai-preview-static">
      <EntityPreviewContent entity={entity} data={data} />
      {children}
    </div>
  );
}
