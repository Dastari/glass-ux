import { useMemo, useRef, useState } from "react";
import { CodeBlock } from "../../ai/code-block/index.js";
import {
  appearanceConfig,
  configureAppearance,
  exportAppearance,
  importAppearance,
  useAppearance,
  type AppearanceImportIssue,
} from "../../lib/appearance/index.js";
import { AppearanceSettings } from "../../ui/appearance-settings/index.js";
import { Button } from "../../ui/button/index.js";
import { formatBytes } from "../../ui/byte-size-field/index.js";
import { CopyButton } from "../../ui/copy-button/index.js";
import { Field } from "../../ui/field/index.js";
import { Notice } from "../../ui/notice/index.js";
import { Panel, PanelBody, PanelHeader } from "../../ui/surface/index.js";
import { Textarea } from "../../ui/textarea/index.js";
import { IconDownload, IconUpload } from "../../icons/generated/icons.js";
import { SectionPage } from "../kit.js";

/** A picture embedded in a theme can run to megabytes: too long to highlight on the page. */
const LONGEST_SHOWN = 20_000;

const issueText = ({ field, reason }: AppearanceImportIssue) =>
  reason === "unreadable"
    ? "This is not a theme. Paste the contents of theme.ts or its JSON."
    : reason === "picture-remote"
      ? "backgroundImage loads from another site, so it was refused."
      : `${field} has a value this version does not accept.`;

function download(name: string, text: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** One generated file: the text with Copy and Download. */
function ThemeFile({ name, language, type, text }: { name: string; language: string; type: string; text: string }) {
  const tooLong = text.length > LONGEST_SHOWN;
  return (
    <div className="flex min-w-0 flex-col gap-controls" data-theme-file={name}>
      {tooLong ? (
        <Notice>{`${name} embeds a picture (${formatBytes(text.length)}), so it is too long to show. Copy and Download include it.`}</Notice>
      ) : (
        <CodeBlock code={text} language={language} title={name} label={name} headingLevel={2} wrap maxLines={0} />
      )}
      <div className="flex flex-wrap justify-end gap-controls">
        {tooLong ? <CopyButton value={text} label={`Copy ${name}`} showLabel /> : null}
        <Button size="sm" variant="secondary" icon={<IconDownload />} onClick={() => download(name, text, type)}>
          {`Download ${name}`}
        </Button>
      </div>
    </div>
  );
}

function ThemeImport() {
  const { update } = useAppearance();
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<readonly AppearanceImportIssue[]>([]);
  const [restored, setRestored] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const restore = () => {
    const result = importAppearance(text);
    setRestored(result.ok);
    setIssues(result.ok ? [] : result.issues);
    if (!result.ok) return;
    // An application sets glass rendering once; the documentation lets a visitor try both.
    configureAppearance({ ...appearanceConfig(), glassRendering: result.theme.glassRendering ?? "live" });
    update(result.appearance);
  };
  return (
    <Panel aria-label="Restore a theme">
      <PanelHeader title="Restore a theme" />
      <PanelBody>
        <div className="flex flex-col gap-fields">
          <Field label="Theme">
            <Textarea
              minRows={6}
              maxRows={12}
              value={text}
              data-testid="theme-import-text"
              onValueChange={(value) => {
                setText(value);
                setRestored(false);
                setIssues([]);
              }}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-controls">
            <input
              ref={input}
              type="file"
              accept=".ts,.json,text/plain,application/json"
              hidden
              aria-label="Theme file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) setText(await file.text());
              }}
            />
            <Button size="sm" variant="secondary" icon={<IconUpload />} onClick={() => input.current?.click()}>
              Choose file
            </Button>
            <Button size="sm" variant="primary" disabled={!text.trim()} onClick={restore}>
              Restore
            </Button>
          </div>
          {/* The status keeps its height, so a result does not move the page below it (R9.1). */}
          <div className="min-h-12" role="status" data-testid="theme-import-status">
            {restored ? <p className="type-caption text-fg-muted">Theme restored.</p> : null}
            {issues.length ? (
              <ul className="type-caption text-danger-text">
                {issues.map((issue) => (
                  <li key={issue.field}>{issueText(issue)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}

export default function ThemeExportSection() {
  const { appearance } = useAppearance();
  const { source, css, omitted } = useMemo(() => exportAppearance(appearance), [appearance]);
  return (
    <SectionPage>
      <div className="@container w-full" data-wide="">
        <div className="grid items-start gap-panels @4xl:grid-cols-2">
          <Panel aria-label="Appearance">
            <PanelBody>
              <AppearanceSettings sections={["theme", "colours", "background", "display", "size", "shape", "fonts"]} />
            </PanelBody>
          </Panel>
          <div className="flex min-w-0 flex-col gap-panels">
            {omitted.includes("backgroundImage") ? <Notice tone="warning">This picture exists only in this browser, so the theme leaves it out.</Notice> : null}
            <ThemeFile name="theme.ts" language="ts" type="text/plain" text={source} />
            <ThemeFile name="theme.css" language="css" type="text/css" text={css} />
            <ThemeImport />
          </div>
        </div>
      </div>
    </SectionPage>
  );
}
