import { aiMessages } from "../messages.js"
import { useMessages } from "../../lib/i18n/index.js"
import { composerMessages } from "./messages.js"
import { Popover as BasePopover } from "@base-ui/react/popover";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  IconArrowUp,
  IconAttach,
  IconChevronDown,
  IconClose,
  IconLayers,
  IconMic,
  IconSettings,
  IconStop,
  IconWarning,
} from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { FactList } from "../../ui/fact-list/index.js";
import { Combobox } from "../../ui/combobox/index.js";
import { Button } from "../../ui/button/index.js";
import { OptionRow } from "../../ui/combobox/index.js";
import { formatBytes } from "../../ui/file-drop/index.js";
import type { IconComponent } from "../../ui/icon/index.js";
import { Popover } from "../../ui/popover/index.js";
import { ProgressRing } from "../../ui/progress/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { EntityOptionList } from "../asks/index.js";
import { kindSpec } from "../entities.js";
import {
  EntityChip,
  EntityGlyph,
  useEntityResolver,
} from "../entity-chip/index.js";
import { FileGlyph } from "../results/index.js";
import { useCardMaterial } from "../surface/index.js";
import type { AiAttachment, EntityRef, RunState } from "../types.js";
import { useLocale } from "../../lib/locale/use-locale.js";

export interface SlashCommand {
  /** Typed after the slash: "summarise". */
  id: string;
  /** What it does, one line: "Summarise this conversation". */
  description: string;
  icon?: IconComponent;
  /** Text placed in the composer when chosen (default: "/id "). */
  insert?: string;
}

export interface ComposerModel {
  /** "gpt-5.6-terra". */
  name: string;
  /** "OpenAI API", "Codex". */
  runtime?: string;
  /** "Medium". */
  effort?: string;
}

export interface ComposerProps {
  value?: string;
  defaultValue?: string;
  /** Called with the full text on every edit, pick from a menu, dictation and the clear after a send (`""`). Pair with `value` to control it. */
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text; clear the composer by resolving. */
  onSend?: (text: string) => void | Promise<void>;
  /** Called when the person stops a running response: the Stop button or Esc while `run` is `running` or `stopping` and no menu is open. */
  onStop?: () => void;
  /** ↑ in an empty composer edits the last prompt. */
  onEditLast?: () => void;
  /** Operation invoked by the component. */
  run?: RunState;
  placeholder?: string;
  /** Rows shown when empty (the landing composer uses 2). */
  minRows?: number;
  /** Rows before the composer scrolls. */
  maxRows?: number;
  /** The conversation's scope and references, as chips above the text. */
  context?: EntityRef[];
  /** Called with the whole new context list when an entity is added (an @-mention or the Context search) or removed. Supplying it shows the Context menu and removable chips; pair with `context`. */
  onContextChange?: (context: EntityRef[]) => void;
  /** The workspace's model: read-only here, set in AI settings. */
  model?: ComposerModel;
  /** Called from the AI settings button in the model popover; the button is shown only when this is supplied. */
  onOpenSettings?: () => void;
  /** Attachments selected for the message. */
  attachments?: AiAttachment[];
  /** Called with the files chosen in the file picker (filtered by `accept`). Supplying it shows the Attach button; add them to `attachments` to show them. */
  onAttach?: (files: File[]) => void;
  /** Called with the attachment `id` when the person removes its chip; the chip shows a remove button only when this is supplied. */
  onRemoveAttachment?: (id: string) => void;
  /** Accepted file types for Attach (GlassUxAiAttachmentConfiguration.SupportedFormats). */
  accept?: string;
  /** Available slash commands and their typed arguments. */
  commands?: SlashCommand[];
  /** Why nothing can be sent (budget used, provider unavailable). Keeps the box, disables it. */
  disabledReason?: string;
  /** Gallery: show the dictation state with this input level (0–1). */
  dictationPreview?: number;
  /** Focus the text on mount. */
  autoFocus?: boolean;
  /** md: conversations and panes · lg: the landing hero (bigger send circle). */
  size?: "md" | "lg";
  /** The conversation's status line (AiStatusStrip), the last row inside the composer. */
  status?: ReactNode;
  className?: string;
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string;
}

type Menu =
  | { type: "slash"; query: string }
  | { type: "mention"; query: string; start: number }
  | null;

/** Find a slash command or @-mention being typed at the caret. */
function menuAt(text: string, caret: number): Menu {
  const before = text.slice(0, caret);
  const slash = before.match(/^\/([\w-]*)$/);
  if (slash) return { type: "slash", query: slash[1]! };
  const mention = before.match(/(^|\s)@([\w.-]{0,40})$/);
  if (mention)
    return {
      type: "mention",
      query: mention[2]!,
      start: caret - mention[2]!.length - 1,
    };
  return null;
}

/* ── Dictation ────────────────────────────────────────────────────────────── */

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onend: (() => void) | null;
};

const noSubscription = () => () => {};
const microphoneAvailable = () => Boolean(navigator.mediaDevices?.getUserMedia);
const notOnServer = () => false;

function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Microphone level and speech-to-text where the browser offers it. The level (0–1) is
 * written each frame to the meter element's own --_level (meterRef), never to React state,
 * so the composer does not re-render 60 times a second while dictating.
 */
function useDictation(onText: (text: string) => void) {
  const locale = useLocale();
  const [active, setActive] = useState(false);
  const meterRef = useRef<HTMLSpanElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setActive(false);
    meterRef.current?.style.setProperty("--_level", "0");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const value of data)
        peak = Math.max(peak, Math.abs(value - 128) / 128);
      meterRef.current?.style.setProperty("--_level", Math.min(1, peak * 2.2).toFixed(2));
      frame = requestAnimationFrame(tick);
    };
    tick();
    const Speech = speechRecognition();
    let recognition: Recognition | null = null;
    if (Speech) {
      recognition = new Speech();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = locale;
      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        if (last?.isFinal && last[0]) onText(last[0].transcript);
      };
      recognition.onend = () => stopRef.current?.();
      recognition.start();
    }
    stopRef.current = () => {
      cancelAnimationFrame(frame);
      recognition?.stop();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    };
    setActive(true);
  }, [onText, locale]);

  useEffect(() => () => stopRef.current?.(), []);
  // False on the server and during hydration, the real answer after: no hydration mismatch.
  const supported = useSyncExternalStore(
    noSubscription,
    microphoneAvailable,
    notOnServer,
  );
  return { active, meterRef, start, stop, supported };
}

/**
 * Five bars that follow the microphone level (a level readout, not decoration). A live
 * level is written to the element by useDictation; `level` fixes it (gallery preview).
 */
function LevelMeter({ level, meterRef }: { level?: number; meterRef?: RefObject<HTMLSpanElement | null> }) {
  return (
    <span
      ref={meterRef}
      className="fa-ai-level"
      aria-hidden
      style={level === undefined ? undefined : ({ "--_level": level.toFixed(2) } as CSSProperties)}
    >
      {[0.55, 0.85, 1, 0.75, 0.5].map((weight, index) => (
        <span key={index} style={{ "--_w": weight } as CSSProperties} />
      ))}
    </span>
  );
}

/* ── Menus ────────────────────────────────────────────────────────────────── */

function CommandList({
  id,
  commands,
  active,
  onPick,
  onActive,
}: {
  id: string;
  /** Available slash commands and their typed arguments. */
  commands: SlashCommand[];
  /** Marks the current destination or active choice. */
  active: number;
  /** Called with the command the person clicks or presses Enter or Space on. */
  onPick: (command: SlashCommand) => void;
  /** Called with the zero-based index of the row under the pointer. Pair with `active` to move the highlight. */
  onActive: (index: number) => void;
}) {
  const messages = useMessages(composerMessages)

  if (!commands.length)
    return <div className="fa-ai-options-empty">{messages.noCommandsMatch}</div>;
  return (
    <div id={id} role="listbox" className="fa-ai-options" aria-label={messages.commands}>
      {commands.map((command, index) => {
        const Icon = command.icon;
        return (
          <div
            key={command.id}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === active}
            className="fa-item fa-ai-option"
            data-highlighted={index === active ? "" : undefined}
            tabIndex={-1}
            onPointerMove={() => onActive(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(command)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onPick(command);
            }}
          >
            <OptionRow
              item={{
                value: command.id,
                label: `/${command.id}`,
                description: command.description,
                icon: Icon ? <Icon /> : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** The composer's floating menus (slash commands, @-mentions): fa-popup on glass-overlay. */
function ComposerMenu({
  anchor,
  open,
  onClose,
  label,
  children,
}: {
  /** Anchor used to position floating content. */
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  /** Called when the popover asks to close (Esc or a press outside); set `open` to false in response. */
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <BasePopover.Root
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
    >
      <Popover.Popup
        side="top"
        align="start"
        className="fa-ai-menu"
        size="md"
        anchor={anchor}
        aria-label={label}
        initialFocus={false}
        finalFocus={false}
      >
        {children}
      </Popover.Popup>
    </BasePopover.Root>
  );
}

/* ── Attachments ──────────────────────────────────────────────────────────── */

/** An attachment in the composer: type glyph, name, size or upload progress, remove. */
export function AttachmentChip({
  attachment,
  onRemove,
}: {
  /** The attachment identifier, label, media type and availability. */
  attachment: AiAttachment;
  /** Called when the remove button is pressed; without it the chip has no remove button. */
  onRemove?: () => void;
}) {
  const messages = useMessages(composerMessages)

  const uploading =
    attachment.state === "uploading" || attachment.state === "scanning";
  const rejected = attachment.state === "rejected";
  return (
    <span
      className="glass-control fa-ai-attachment"
      data-state={attachment.state}
    >
      {attachment.previewUrl ? (
        <img
          className="fa-ai-attachment-thumb"
          src={attachment.previewUrl}
          alt=""
        />
      ) : (
        <span className="fa-ai-attachment-icon" aria-hidden>
          <FileGlyph name={attachment.name} mime={attachment.mime} />
        </span>
      )}
      <span className="fa-ai-attachment-text">
        <TruncatedText className="fa-ai-attachment-name" middle>
          {attachment.name}
        </TruncatedText>
        <span className="fa-ai-attachment-meta" data-numeric>
          {rejected
            ? (attachment.reason ?? messages.rejected)
            : attachment.state === "scanning"
              ? messages.scanning
              : uploading
                ? messages.uploading(Math.round((attachment.progress ?? 0) * 100))
                : formatBytes(attachment.size)}
        </span>
      </span>
      {uploading ? (
        <ProgressRing
          value={
            attachment.state === "scanning"
              ? 100
              : Math.round((attachment.progress ?? 0) * 100)
          }
          size="sm"
          aria-label={messages.upload(attachment.name)}
        />
      ) : null}
      {rejected ? <IconWarning className="fa-ai-attachment-warning" /> : null}
      {onRemove ? (
        <Button
          variant="ghost"
          shape="circle"
          size="xs"
          type="button"
          className="fa-ai-chip-remove fa-pressable"
          aria-label={messages.remove(attachment.name)}
          onClick={onRemove}
        >
          <IconClose />
        </Button>
      ) : null}
    </span>
  );
}

/* ── Composer ─────────────────────────────────────────────────────────────── */

/**
 * Where the person writes. The text grows from one row to ten, then scrolls. Attachments and
 * context sit above it as chips; the toolbar below holds Attach, the workspace model (shown,
 * not chosen: it is set in AI settings), Context, dictation and the send circle, which turns
 * into Stop while a run is active. The conversation's status line can sit under the toolbar.
 *
 * Material   the surface's (useCardMaterial): floating over a conversation it is
 *            glass-overlay, so the transcript scrolling behind it never shows through.
 *
 * Keys   Enter sends · Shift+Enter new line · ↑ in an empty composer edits the last prompt ·
 *        Esc stops the run or closes a menu · / opens commands · @ mentions an entity.
 * Width  container-aware down to the docked pane: labels drop to icons, the model chip folds.
 */
export function Composer({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSend,
  onStop,
  onEditLast,
  run = "idle",
  placeholder: placeholderProp,
  minRows = 1,
  maxRows = 10,
  context = [],
  onContextChange,
  model,
  onOpenSettings,
  attachments = [],
  onAttach,
  onRemoveAttachment,
  accept,
  commands = [],
  disabledReason,
  dictationPreview,
  autoFocus = false,
  size = "md",
  status,
  className,
  "aria-label": ariaLabelProp,
}: ComposerProps) {
  const messages = useMessages(composerMessages)
 const entityMessages = useMessages(aiMessages)
  const placeholder = placeholderProp ?? messages.askAssistant
  const ariaLabel = ariaLabelProp ?? messages.messageAssistant

  const id = useId();
  const resolver = useEntityResolver();
  const material = useCardMaterial();
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp ?? inner;
  const [menu, setMenu] = useState<Menu>(null);
  const [active, setActive] = useState(0);
  const [contextOpen, setContextOpen] = useState(false);
  const contextEntities = useRef(new Map<string, EntityRef>());
  const contextSource = useMemo(
    () => ({
      search: async (query: string) =>
        (resolver.search?.(query) ?? []).map((entity) => {
          const value = `${entity.kind}:${entity.id}`;
          contextEntities.current.set(value, entity);
          return {
            value,
            label: entity.label,
            icon: <EntityGlyph entity={entity} />,
          };
        }),
    }),
    [resolver],
  );
  const disabled = Boolean(disabledReason);
  const busy = run === "running" || run === "stopping";

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) setInner(next);
      onValueChange?.(next);
    },
    [valueProp, onValueChange],
  );
  const dictation = useDictation((text) =>
    setValue(`${value}${value && !value.endsWith(" ") ? " " : ""}${text}`),
  );
  const listening = dictation.active || dictationPreview !== undefined;

  // Grow with the text where field-sizing is missing: measured when the text changes.
  const fit = useCallback(() => {
    const element = textRef.current;
    if (!element || CSS.supports("field-sizing", "content")) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, []);
  useLayoutEffect(fit, [fit]);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const filteredCommands =
    menu?.type === "slash"
      ? commands.filter((command) =>
          command.id.startsWith(menu.query.toLowerCase()),
        )
      : [];
  const mentions =
    menu?.type === "mention" && resolver.search
      ? resolver.search(menu.query).slice(0, 6)
      : [];
  const options =
    menu?.type === "slash" ? filteredCommands.length : mentions.length;

  const addContext = (entity: EntityRef) => {
    if (
      context.some((item) => item.kind === entity.kind && item.id === entity.id)
    )
      return;
    onContextChange?.([...context, entity]);
  };

  const pickCommand = (command: SlashCommand) => {
    setValue(command.insert ?? `/${command.id} `);
    setMenu(null);
    textRef.current?.focus();
  };
  const pickMention = (entity: EntityRef) => {
    if (menu?.type !== "mention") return;
    const caret = textRef.current?.selectionStart ?? value.length;
    setValue(
      `${value.slice(0, menu.start)}@${entity.label} ${value.slice(caret)}`,
    );
    addContext(entity);
    setMenu(null);
    textRef.current?.focus();
  };

  const send = async () => {
    const text = value.trim();
    if (!text || disabled || run !== "idle") return;
    await onSend?.(text);
    setValue("");
    setMenu(null);
    requestAnimationFrame(fit);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (menu && options > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive(
          (index) =>
            (index + (event.key === "ArrowDown" ? 1 : -1) + options) % options,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        if (menu.type === "slash") pickCommand(filteredCommands[active]!);
        else pickMention(mentions[active]!);
        return;
      }
    }
    if (event.key === "Escape") {
      if (menu) {
        event.preventDefault();
        setMenu(null);
      } else if (busy) {
        event.preventDefault();
        onStop?.();
      }
      return;
    }
    if (event.key === "ArrowUp" && !value && onEditLast) {
      event.preventDefault();
      onEditLast();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    setValue(next);
    fit();
    const found = menuAt(next, event.target.selectionStart ?? next.length);
    setMenu(
      found &&
        (found.type === "slash"
          ? commands.length > 0
          : Boolean(resolver.search))
        ? found
        : null,
    );
    setActive(0);
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      ref={rootRef}
      className={cx(material, "fa-ai-composer", className)}
      data-disabled={disabled ? "" : undefined}
      data-listening={listening ? "" : undefined}
      data-size={size}
      style={
        { "--_min-rows": minRows, "--_max-rows": maxRows } as CSSProperties
      }
    >
      {attachments.length || context.length ? (
        <div className="fa-ai-composer-chips">
          {context.map((entity) => (
            <EntityChip
              key={`${entity.kind}:${entity.id}`}
              entity={entity}
              size="sm"
              onRemove={
                onContextChange
                  ? () =>
                      onContextChange(context.filter((item) => item !== entity))
                  : undefined
              }
            />
          ))}
          {attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={
                onRemoveAttachment
                  ? () => onRemoveAttachment(attachment.id)
                  : undefined
              }
            />
          ))}
        </div>
      ) : null}
      <textarea
        ref={textRef}
        className="fa-ai-composer-input"
        value={value}
        rows={minRows}
        placeholder={listening ? messages.listening : placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={disabledReason ? `${id}-reason` : undefined}
        aria-haspopup="listbox"
        aria-controls={menu ? `${id}-menu` : undefined}
        aria-activedescendant={
          menu && options ? `${id}-menu-${active}` : undefined
        }
        aria-autocomplete="list"
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={() => setMenu(null)}
      />
      <div className="fa-ai-composer-bar">
        <div className="fa-ai-composer-tools">
          {onAttach ? (
            <>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={accept}
                hidden
                onChange={(event) => {
                  onAttach(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<IconAttach />}
                className="fa-ai-composer-tool"
                aria-label={messages.attachFiles}
                tooltip={messages.attachFiles}
                disabledReason={disabledReason}
                onClick={() => fileRef.current?.click()}
              >
                <span className="fa-ai-composer-tool-label">{messages.attach}</span>
              </Button>
            </>
          ) : null}
          {model ? (
            <BasePopover.Root>
              <BasePopover.Trigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="fa-ai-composer-tool fa-ai-composer-model"
                    iconEnd={<IconChevronDown />}
                    aria-label={messages.model(model.name)}
                    tooltip={messages.modelSummary(model.name)}
                  >
                    <span className="fa-ai-composer-tool-label">
                      {model.name}
                    </span>
                  </Button>
                }
              />
              <Popover.Popup
                side="top"
                align="start"
                className="fa-ai-model"
                size="sm"
              >
                <FactList
                  facts={[
                    {
                      label: messages.modelLabel,
                      value: <TruncatedText>{model.name}</TruncatedText>,
                    },
                    ...(model.effort
                      ? [{ label: messages.reasoning, value: model.effort }]
                      : []),
                    ...(model.runtime
                      ? [{ label: messages.runtime, value: model.runtime }]
                      : []),
                  ]}
                />
                <p className="fa-hint">
                  {messages.workspaceModel} </p>
                {onOpenSettings ? (
                  <Button
                    size="sm"
                    icon={<IconSettings />}
                    block
                    onClick={onOpenSettings}
                  >
                    {messages.aiSettings} </Button>
                ) : null}
              </Popover.Popup>
            </BasePopover.Root>
          ) : null}
          {onContextChange ? (
            <BasePopover.Root open={contextOpen} onOpenChange={setContextOpen}>
              <BasePopover.Trigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconLayers />}
                    iconEnd={<IconChevronDown />}
                    className="fa-ai-composer-tool"
                    aria-label={messages.context}
                    tooltip={messages.context}
                    disabledReason={disabledReason}
                  >
                    <span className="fa-ai-composer-tool-label">{messages.context}</span>
                  </Button>
                }
              />
              <Popover.Popup
                side="top"
                align="start"
                className="fa-ai-context"
                size="lg"
              >
                <div className="fa-ai-context-head">
                  <span className="fa-overline">{messages.inThisConversation}</span>
                </div>
                {context.length ? (
                  <ul className="fa-ai-context-list">
                    {context.map((entity) => (
                      <li
                        key={`${entity.kind}:${entity.id}`}
                        className="fa-item fa-ai-option"
                      >
                        <EntityGlyph
                          entity={entity}
                          className="fa-ai-option-glyph"
                        />
                        <span className="fa-item-label">{entity.label}</span>
                        <span className="fa-item-trail">
                          {kindSpec(resolver.kinds, entity.kind, entityMessages).noun}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<IconClose />}
                          aria-label={messages.remove(entity.label)}
                          onClick={() =>
                            onContextChange(
                              context.filter((item) => item !== entity),
                            )
                          }
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="fa-ai-options-empty">
                    {messages.workspaceScope} </p>
                )}
                {resolver.search ? (
                  <div className="fa-ai-context-search">
                    <Combobox
                      aria-label={messages.searchEntities}
                      placeholder={messages.addAnEntity}
                      source={contextSource}
                      value={null}
                      onValueChange={(value) => {
                        const entity = value
                          ? contextEntities.current.get(value)
                          : undefined;
                        if (entity) addContext(entity);
                      }}
                    />
                  </div>
                ) : null}
              </Popover.Popup>
            </BasePopover.Root>
          ) : null}
          {disabledReason ? (
            <span className="fa-ai-composer-reason" id={`${id}-reason`}>
              <IconWarning />
              <span>{disabledReason}</span>
            </span>
          ) : null}
        </div>
        <div className="fa-ai-composer-send">
          {listening ? (
            <LevelMeter level={dictationPreview} meterRef={dictation.meterRef} />
          ) : null}
          <Button
            variant={listening ? "soft" : "secondary"}
            shape="circle"
            size={size}
            icon={<IconMic />}
            className="fa-ai-composer-mic"
            aria-label={listening ? messages.stopDictation : messages.dictate}
            aria-pressed={listening}
            disabledReason={
              disabledReason ??
              (dictation.supported
                ? undefined
                : messages.dictationNeedsMicrophoneAccess)
            }
            onClick={() =>
              dictation.active
                ? dictation.stop()
                : void dictation.start().catch(() => {})
            }
          />
          {/* One button that swaps face and handler, so focus survives send ⇄ stop. */}
          <Button
            variant={busy ? "secondary" : "primary"}
            shape="circle"
            size={size}
            icon={busy ? <IconStop /> : <IconArrowUp />}
            className={busy ? "fa-ai-composer-stop" : "fa-ai-composer-submit"}
            aria-label={busy ? messages.stopResponse : messages.send}
            shortcut={busy ? "esc" : "enter"}
            status={
              run === (busy ? "stopping" : "sending") ? "pending" : undefined
            }
            disabledReason={
              busy
                ? undefined
                : (disabledReason ??
                  (canSend ? undefined : messages.typeAMessageFirst))
            }
            onClick={busy ? onStop : () => void send()}
          />
        </div>
      </div>
      {status ? <div className="fa-ai-composer-status">{status}</div> : null}
      <ComposerMenu
        anchor={rootRef}
        open={
          Boolean(menu) && (menu?.type === "slash" ? commands.length > 0 : true)
        }
        onClose={() => setMenu(null)}
        label={menu?.type === "slash" ? messages.commands : messages.mention}
      >
        {menu?.type === "slash" ? (
          <CommandList
            id={`${id}-menu`}
            commands={filteredCommands}
            active={active}
            onPick={pickCommand}
            onActive={setActive}
          />
        ) : menu?.type === "mention" ? (
          <>
            <div className="fa-popup-group-label">{messages.mention}</div>
            <EntityOptionList
              id={`${id}-menu`}
              query={menu.query}
              options={mentions}
              active={active}
              selected={(entity) =>
                context.some(
                  (item) => item.kind === entity.kind && item.id === entity.id,
                )
              }
              onPick={pickMention}
              onActive={setActive}
              empty={
                menu.query ? messages.nothingMatches(menu.query) : messages.typeAName
              }
            />
          </>
        ) : null}
      </ComposerMenu>
    </div>
  );
}
