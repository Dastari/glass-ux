import { useState } from "react";
import {
  MOCK_ORGANISATIONS,
  toSwitcherOrganisation,
} from "../fixtures/organisations.js";
import {
  ContainerLab,
  Example,
  Rules,
  SectionPage,
  Specimen,
  TokenTable,
} from "../kit.js";
import { IconTerminal } from "../../icons/generated/icons.js";
import {
  OrgAvatar,
  OrgSwitcher,
  OrgSwitcherPanel,
  type OrgTint,
} from "../../shell/org-switcher/index.js";
import {
  WindowFrame,
  WindowScopeChip,
  WindowScopeProvider,
  type WindowScopes,
} from "../../windows/index.js";
import { RemoteOrgSwitcherExample } from "./org-switcher-remote.js";

const ORGS = MOCK_ORGANISATIONS.map(toSwitcherOrganisation);
const RECENT = ["cedarvale", "mossbridge", "orbit"];
const byId = (id: string) => ORGS.find((org) => org.id === id)!;

/** One switcher with its own state, so each specimen can be tried. */
function Switcher({ initial }: { initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <OrgSwitcher
      organisations={ORGS}
      value={value}
      onValueChange={setValue}
      recent={RECENT}
    />
  );
}

function Panel() {
  const [value, setValue] = useState<string | null>("northstar");
  return (
    <div className="glass-overlay gallery-switcher-panel" data-clip-boundary="">
      <OrgSwitcherPanel
        organisations={ORGS}
        value={value}
        onValueChange={setValue}
        recent={RECENT}
      />
    </div>
  );
}

const SCOPES: WindowScopes = {
  current: "cedarvale",
  describe: (id) => {
    const org = ORGS.find((item) => item.id === id);
    return org
      ? { label: org.name, avatar: <OrgAvatar org={org} size="xs" /> }
      : undefined;
  },
};

function ScopedWindow({ scope }: { scope: string }) {
  return (
    <WindowScopeProvider value={SCOPES}>
      <WindowFrame.Root focused state="floating" aria-label="Terminal">
        <WindowFrame.AppBar
          icon={<IconTerminal />}
          title="Terminal"
          subtitle="NST-C106"
          scope={<WindowScopeChip scope={scope} />}
        />
      </WindowFrame.Root>
    </WindowScopeProvider>
  );
}

export default function OrgSwitcherSection() {
  return (
    <SectionPage>
      <Specimen
        title="Trigger"
        description="First in the top bar, after the logo, on the canvas. The organisation's avatar and name, All organisations when unscoped, and +N when a parent includes the organisations under it. The breadcrumb continues after it."
        wide
      >
        <Example label="All organisations">
          <Switcher initial={null} />
        </Example>
        <Example label="One organisation">
          <Switcher initial="cedarvale" />
        </Example>
        <Example label="A parent includes its children">
          <Switcher initial="northstar" />
        </Example>
        <Example label="With a logo">
          <Switcher initial="orbit" />
        </Example>
      </Specimen>

      <Specimen
        title="List"
        description="The popup's contents: search, All organisations, Recent, then every organisation as a tree. Typing ranks matches by name, word, initials, then anywhere, and names a child's parent. Arrow keys move, Enter chooses, Esc closes. On phones the same list is a bottom sheet."
        layout="bare"
      >
        <Panel />
      </Specimen>

      <Specimen
        title="Server directory"
        description="A bounded flat directory: the host searches, cancels stale requests and loads one more page at a time. Summit Loom remains selected outside the first page. Search for coastal to match an alternate name, or simulate a read failure and retry. No parent or descendant relationship is inferred."
        layout="bare"
      >
        <RemoteOrgSwitcherExample />
      </Specimen>

      <Specimen
        title="Avatar"
        description="A rounded square, so an organisation never reads as a person. Initials sit in ink on one of the eight identity colours (never the data hues); a logo replaces them. In a narrow top bar the trigger shows the avatar and the short code (“NST”)."
      >
        <Example label="Sizes">
          <div className="gallery-avatar-row">
            {(["xs", "sm", "md", "lg"] as const).map((size) => (
              <OrgAvatar key={size} org={byId("northstar")} size={size} />
            ))}
          </div>
        </Example>
        <Example label="Tints">
          <div className="gallery-avatar-row">
            {([1, 2, 3, 4, 5, 6, 7, 8] as OrgTint[]).map((tint) => (
              <OrgAvatar
                key={tint}
                org={{ ...byId("cedarvale"), tint }}
                size="md"
              />
            ))}
          </div>
        </Example>
        <Example label="Logo · All organisations">
          <div className="gallery-avatar-row">
            <OrgAvatar org={byId("orbit")} size="md" />
            <OrgAvatar org={null} size="md" />
          </div>
        </Example>
      </Specimen>

      <Specimen
        title="Window scope chip"
        description="Windows sit above the scope (R14.4). A window from another organisation than the current one carries its chip; the dock groups windows by organisation behind each group's avatar."
        wide
        layout="stack"
      >
        <Example label="Another organisation (in Cedar Vale)">
          <div className="gallery-shell-window">
            <ScopedWindow scope="northstar" />
          </div>
        </Example>
        <Example label="The current organisation: no chip">
          <div className="gallery-shell-window">
            <ScopedWindow scope="cedarvale" />
          </div>
        </Example>
        <Example label="A narrow window keeps the avatar">
          <div className="gallery-shell-window" data-width="phone">
            <ScopedWindow scope="northstar" />
          </div>
        </Example>
      </Specimen>

      <ContainerLab
        title="Trigger in the container lab"
        description="The trigger truncates its name with a tooltip and never wraps."
      >
        {() => <Switcher initial="cedarvale" />}
      </ContainerLab>

      <Rules
        do={[
          "Put the switcher first in the top bar and let the breadcrumb continue from it.",
          "Keep the scope in the URL (/o/$org/…); the switcher only reports a choice.",
          "Keep the user's place when switching: the same section, the same entity if it is in scope.",
          "Label every window and list row from another organisation with its avatar or name.",
        ]}
        dont={[
          "Narrow settings, appearance or window layout by the organisation (R6.9).",
          "Close, pause or reload a window when the organisation changes.",
          "Keep the scope in storage: each browser tab keeps its own.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--identity-1", "Avatar tint 1 of 8 (src/styles/identity.css)"],
          ["--identity-8", "Avatar tint 8"],
          ["--control-h-md", "Trigger height"],
          ["--inset-overlay", "Popup inset"],
          ["--radius-control", "Trigger radius"],
        ]}
      />
    </SectionPage>
  );
}
