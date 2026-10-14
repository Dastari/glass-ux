import { ContainerLab, Example, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconBell, IconShield } from "../../icons/generated/icons.js"
import { Badge, CountBadge, NotificationDot, STATUS, StatusBadge, StatusDot, type BadgeTone, type EndpointStatus } from "../../ui/badge/index.js"
import { Button } from "../../ui/button/index.js"

const TONES: BadgeTone[] = ["neutral", "accent", "success", "warning", "danger", "info"]
const TONE_LABEL: Record<BadgeTone, string> = {
  neutral: "Workstation",
  accent: "Favourite",
  success: "Compliant",
  warning: "Reboot pending",
  danger: "Agent outdated",
  info: "Beta channel",
}
const STATUSES = Object.keys(STATUS) as EndpointStatus[]

export default function BadgeSection() {
  return (
    <SectionPage>
      <Specimen title="Tones" description="Soft pills. Status tones only for status; accent for brand or selection; neutral for categories." wide>
        <Matrix
          columns={["md", "md · dot", "sm", "sm · dot"]}
          rows={TONES.map((tone) => ({
            label: tone,
            cells: [
              <Badge key="a" tone={tone}>
                {TONE_LABEL[tone]}
              </Badge>,
              <Badge key="b" tone={tone} marker="dot">
                {TONE_LABEL[tone]}
              </Badge>,
              <Badge key="c" tone={tone} size="sm">
                {TONE_LABEL[tone]}
              </Badge>,
              <Badge key="d" tone={tone} size="sm" marker="dot">
                {TONE_LABEL[tone]}
              </Badge>,
            ],
          }))}
        />
      </Specimen>

      <Specimen
        title="Endpoint status"
        description="One definition per state, shared by badges, dots, the tree and the dock. Only live and connecting pulse; installing spins. Reduced motion stops the pulse."
        layout="stack"
      >
        <Example label="StatusBadge · md">
          {STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </Example>
        <Example label="StatusBadge · sm">
          {STATUSES.map((status) => (
            <StatusBadge key={status} status={status} size="sm" />
          ))}
        </Example>
        <Example label="StatusDot">
          {STATUSES.map((status) => (
            <span key={status} className="inline-flex items-center gap-inline type-caption text-fg-muted">
              <StatusDot status={status} />
              {STATUS[status].label}
            </span>
          ))}
        </Example>
      </Specimen>

      <Specimen title="Counts and notification dot" description="Counts beside navigation and groups use tabular figures and cap at a maximum. The dot sits on the corner of an icon button.">
        <Example label="CountBadge">
          <CountBadge value={12} />
          <CountBadge value={3} tone="accent" />
          <CountBadge value={1284} />
          <CountBadge value={2400} max={999} tone="danger" />
        </Example>
        <Example label="NotificationDot">
          <span className="relative inline-flex">
            <Button variant="ghost" icon={<IconBell />} aria-label="Notifications" />
            <NotificationDot label="3 unread notifications" />
          </span>
          <span className="relative inline-flex">
            <Button variant="ghost" icon={<IconShield />} aria-label="Security alerts" />
            <NotificationDot label="Critical alert" tone="danger" />
          </span>
        </Example>
      </Specimen>

      <Specimen title="Over imagery" description="On a card over busy content the rim keeps each pill's shape." backdrop>
        <div className="glass-control flex flex-wrap items-center gap-2 rounded-tile p-tile">
          {STATUSES.slice(0, 5).map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
          <CountBadge value={12} />
        </div>
      </Specimen>

      <ContainerLab description="Badges never wrap; when the row runs out of room a long label truncates inside its pill.">
        {() => (
          <div className="flex min-w-0 items-center gap-2 p-2">
            <StatusBadge status="online" />
            <StatusBadge status="installing" className="min-w-0 shrink">
              Installing Google Chrome 129.0
            </StatusBadge>
          </div>
        )}
      </ContainerLab>

      <Rules
        do={[
          "Use StatusBadge for endpoint state so every screen shows it the same way.",
          "Keep labels to one or two words; the badge is a label, not a sentence.",
          "Use the dot marker for states, no marker for categories.",
          "Give a NotificationDot a label that says what is waiting.",
        ]}
        dont={[
          "Use status tones to decorate; green means healthy, nothing else.",
          "Pulse anything that is not live or connecting.",
          "Make a badge clickable; use a button or a filter chip.",
          "Stack more than two badges beside a title.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--control-h-xs", "md height"],
          ["--radius-badge", "Pill radius"],
          ["--success-soft", "Success fill"],
          ["--success-text", "Success label"],
          ["--success", "Success dot"],
          ["--fill-muted", "Neutral fill and count"],
          ["--duration-shimmer", "Pulse beat (live only)"],
          ["--duration-spin", "Installing spinner"],
        ]}
      />
    </SectionPage>
  )
}
