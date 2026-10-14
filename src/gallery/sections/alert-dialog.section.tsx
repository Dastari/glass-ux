import { useState } from "react"
import { Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconRestart, IconTrash } from "../../icons/generated/icons.js"
import { AlertDialog, AlertDialogPreview, ConfirmHost, confirm } from "../../ui/alert-dialog/index.js"
import { Button } from "../../ui/button/index.js"
import { Switch } from "../../ui/switch/index.js"
import { Toaster, toast } from "../../ui/toast/index.js"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function AlertDialogSection() {
  const [fail, setFail] = useState(false)
  const outcome = async () => {
    await wait(1200)
    if (fail) throw new Error("Agent offline — retry when NST-C106 reconnects")
  }

  return (
    <SectionPage>
      <Toaster />
      <ConfirmHost />
      <Specimen
        title="Live"
        description="Cancel takes focus first and Esc cancels. The confirm runs the action in place; while it runs the dialog cannot be dismissed."
      >
        <Example label="Danger · warning · default">
          <AlertDialog
            trigger={
              <Button variant="danger-soft" icon={<IconTrash />}>
                Remove device
              </Button>
            }
            title="Remove NST-C106 from Northstar Studio?"
            description="The agent uninstalls at its next check-in. Its history stays in reports."
            confirmLabel="Remove device"
            pendingLabel="Removing…"
            tone="danger"
            onConfirm={outcome}
          />
          <AlertDialog
            trigger={<Button icon={<IconRestart />}>Restart</Button>}
            title="Restart NST-C106?"
            description="AzureAD\MiraRowan is signed in and loses unsaved work."
            confirmLabel="Restart now"
            pendingLabel="Restarting…"
            tone="warning"
            onConfirm={outcome}
          />
          <AlertDialog
            trigger={<Button>Enrol in pilot ring</Button>}
            title="Move LMN-4E5E to the pilot ring?"
            description="It receives agent releases a week before production."
            confirmLabel="Move to pilot"
            tone="default"
            onConfirm={outcome}
          />
        </Example>
        <Example label="Imperative confirm()">
          <Button
            onClick={async () => {
              const confirmed = await confirm({
                title: "Remove 3 endpoints from Orbit Workspace?",
                description: "Their agents uninstall at the next check-in.",
                confirmLabel: "Remove 3 endpoints",
                tone: "danger",
                onConfirm: outcome,
              })
              if (confirmed) toast.success("3 endpoints removed from Orbit Workspace")
            }}
          >
            Remove 3 endpoints
          </Button>
        </Example>
        <Example label="Outcome">
          <Switch checked={fail} onCheckedChange={setFail} label="Next confirm fails" />
        </Example>
      </Specimen>

      <Specimen title="Anatomy" description="Tone tile, a title that names the target, one sentence, Cancel, then the confirm — the only solid danger button in the product.">
        <AlertDialogPreview
          tone="danger"
          title="Remove NST-C106 from Northstar Studio?"
          description="The agent uninstalls at its next check-in. Its history stays in reports."
          confirmLabel="Remove device"
        />
      </Specimen>

      <Specimen title="Tones" description="Danger for destructive or irreversible work, warning when work is lost or someone is interrupted, default for a consequential but safe step." wide>
        <AlertDialogPreview tone="danger" title="Wipe CDV-6231?" description="All data on the disk is erased. This cannot be undone." confirmLabel="Wipe device" />
        <AlertDialogPreview tone="warning" title="Discard changes to LMN-7C71?" description="Your edits in this dialog are lost." confirmLabel="Discard changes" cancelLabel="Keep editing" />
        <AlertDialogPreview tone="default" title="Move LMN-4E5E to the pilot ring?" description="It receives agent releases a week before production." confirmLabel="Move to pilot" />
      </Specimen>

      <Specimen title="States" description="The confirm button keeps its width from rest to pending to ✓ or ✕. On ✓ the dialog closes; on ✕ it stays and a toast gives the reason." wide>
        <AlertDialogPreview tone="danger" title="Remove NST-C106?" description="The agent uninstalls at its next check-in." confirmLabel="Remove device" pendingLabel="Removing…" status="pending" />
        <AlertDialogPreview tone="danger" title="Remove NST-C106?" description="The agent uninstalls at its next check-in." confirmLabel="Remove device" status="success" />
        <AlertDialogPreview tone="danger" title="Remove NST-C106?" description="The agent uninstalls at its next check-in." confirmLabel="Remove device" status="error" />
      </Specimen>

      <Specimen title="Over imagery" backdrop>
        <AlertDialogPreview tone="warning" title="Restart NST-C106?" description="AzureAD\MiraRowan is signed in and loses unsaved work." confirmLabel="Restart now" />
      </Specimen>

      <Rules
        do={[
          "Name the target and its context in the title: “Remove NST-C106 from Northstar Studio?”.",
          "Say in one sentence what happens and whether it can be undone.",
          "Label the confirm with the outcome (“Remove device”), never “OK” or “Yes”.",
          "Run the action from the confirm button so pending and failure show in place.",
          "Use warning for lost work and interruptions; keep danger for what cannot be undone.",
        ]}
        dont={[
          "Confirm actions that are easy to undo; offer Undo in a toast instead.",
          "Use a solid danger button anywhere but an alert dialog's confirm.",
          "Close the dialog on failure; leave it open with the reason in a toast.",
          "Ask “Are you sure?” — the title is the question.",
          "Stack an alert on top of two dialogs.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--danger", "Confirm fill (danger)"],
          ["--warning", "Confirm fill (warning)"],
          ["--danger-soft", "Tile tint (danger)"],
          ["--warning-soft", "Tile tint (warning)"],
          ["--radius-dialog", "Frame corners"],
          ["--inset-dialog", "Inset"],
          ["--feedback-hold", "How long ✓ / ✕ shows"],
        ]}
      />
    </SectionPage>
  )
}
