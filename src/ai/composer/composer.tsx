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
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text; clear the composer by resolving. */
  onSend?: (text: string) => void | Promise<void>;
  /** Called when stop occurs. The callback type specifies its arguments. */
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
  /** Called when context change occurs. The callback type specifies its arguments. */
  onContextChange?: (context: EntityRef[]) => void;
  /** The workspace's model: read-only here, set in AI settings. */
  model?: ComposerModel;
  /** Called when open settings occurs. The callback type specifies its arguments. */
  onOpenSettings?: () => void;
  /** Attachments selected for the message. */
  attachments?: AiAttachment[];
  /** Called when attach occurs. The callback type specifies its arguments. */
  onAttach?: (files: File[]) => void;
  /** Called when remove attachment occurs. The callback type specifies its arguments. */
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

/** Microphone level (0–1) and speech-to-text where the browser offers it. */
function useDictation(onText: (text: string) => void) {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setActive(false);
    setLevel(0);
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
      setLevel(Math.min(1, peak * 2.2));
      frame = requestAnimationFrame(tick);
    };
    tick();
    const Speech = speechRecognition();
    let recognition: Recognition | null = null;
    if (Speech) {
      recognition = new Speech();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-AU";
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
  }, [onText]);

  useEffect(() => () => stopRef.current?.(), []);
  // False on the server and during hydration, the real answer after: no hydration mismatch.
  const supported = useSyncExternalStore(
    noSubscription,
    microphoneAvailable,
    notOnServer,
  );
  return { active, level, start, stop, supported };
}

/** Five bars that follow the microphone level (a level readout, not decoration). */
function LevelMeter({ level }: { level: number }) {
  return (
    <span
      className="fa-ai-level"
      aria-hidden
      style={{ "--_level": level.toFixed(2) } as CSSProperties}
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
  /** Called when pick occurs. The callback type specifies its arguments. */
  onPick: (command: SlashCommand) => void;
  /** Called when active occurs. The callback type specifies its arguments. */
  onActive: (index: number) => void;
}) {
  if (!commands.length)
    return <div className="fa-ai-options-empty">No commands match</div>;
  return (
    <div id={id} role="listbox" className="fa-ai-options" aria-label="Commands">
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
  /** Called when close occurs. The callback type specifies its arguments. */
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
  /** Called when remove occurs. The callback type specifies its arguments. */
  onRemove?: () => void;
}) {
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
            ? (attachment.reason ?? "Rejected")
            : attachment.state === "scanning"
              ? "Scanning…"
              : uploading
                ? `Uploading · ${Math.round((attachment.progress ?? 0) * 100)}%`
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
          aria-label={`${attachment.name} upload`}
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
          aria-label={`Remove ${attachment.name}`}
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
  placeholder = "Ask Assistant…",
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
  "aria-label": ariaLabel = "Message Assistant",
}: ComposerProps) {
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
        placeholder={listening ? "Listening…" : placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={disabledReason ? `${id}-reason` : undefined}
        role="combobox"
        aria-expanded={Boolean(menu)}
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
                aria-label="Attach files"
                tooltip="Attach files"
                disabledReason={disabledReason}
                onClick={() => fileRef.current?.click()}
              >
                <span className="fa-ai-composer-tool-label">Attach</span>
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
                    aria-label={`Model: ${model.name}`}
                    tooltip={`Model · ${model.name}`}
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
                      label: "Model",
                      value: <TruncatedText>{model.name}</TruncatedText>,
                    },
                    ...(model.effort
                      ? [{ label: "Reasoning", value: model.effort }]
                      : []),
                    ...(model.runtime
                      ? [{ label: "Runtime", value: model.runtime }]
                      : []),
                  ]}
                />
                <p className="fa-hint">
                  The model is chosen for the whole workspace.
                </p>
                {onOpenSettings ? (
                  <Button
                    size="sm"
                    icon={<IconSettings />}
                    block
                    onClick={onOpenSettings}
                  >
                    AI settings
                  </Button>
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
                    aria-label="Context"
                    tooltip="Context"
                    disabledReason={disabledReason}
                  >
                    <span className="fa-ai-composer-tool-label">Context</span>
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
                  <span className="fa-overline">In this conversation</span>
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
                          {kindSpec(resolver.kinds, entity.kind).noun}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<IconClose />}
                          aria-label={`Remove ${entity.label}`}
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
                    Workspace · everything you can access
                  </p>
                )}
                {resolver.search ? (
                  <div className="fa-ai-context-search">
                    <Combobox
                      aria-label="Search entities"
                      placeholder="Add an entity"
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
            <LevelMeter level={dictationPreview ?? dictation.level} />
          ) : null}
          <Button
            variant={listening ? "soft" : "secondary"}
            shape="circle"
            size={size}
            icon={<IconMic />}
            className="fa-ai-composer-mic"
            aria-label={listening ? "Stop dictation" : "Dictate"}
            aria-pressed={listening}
            disabledReason={
              disabledReason ??
              (dictation.supported
                ? undefined
                : "Dictation needs microphone access")
            }
            onClick={() =>
              dictation.active
                ? dictation.stop()
                : void dictation.start().catch(() => {})
            }
          />
          {busy ? (
            <Button
              variant="secondary"
              shape="circle"
              size={size}
              icon={<IconStop />}
              className="fa-ai-composer-stop"
              aria-label="Stop response"
              shortcut="esc"
              status={run === "stopping" ? "pending" : undefined}
              onClick={onStop}
            />
          ) : (
            <Button
              variant="primary"
              shape="circle"
              size={size}
              icon={<IconArrowUp />}
              className="fa-ai-composer-submit"
              aria-label="Send"
              shortcut="enter"
              status={run === "sending" ? "pending" : undefined}
              disabledReason={
                disabledReason ?? (canSend ? undefined : "Type a message first")
              }
              onClick={() => void send()}
            />
          )}
        </div>
      </div>
      {status ? <div className="fa-ai-composer-status">{status}</div> : null}
      <ComposerMenu
        anchor={rootRef}
        open={
          Boolean(menu) && (menu?.type === "slash" ? commands.length > 0 : true)
        }
        onClose={() => setMenu(null)}
        label={menu?.type === "slash" ? "Commands" : "Mention"}
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
            <div className="fa-popup-group-label">Mention</div>
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
                menu.query ? `Nothing matches "${menu.query}"` : "Type a name"
              }
            />
          </>
        ) : null}
      </ComposerMenu>
    </div>
  );
}
