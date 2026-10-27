import { useRef, useState } from "react"
import { Rules, SectionPage, Specimen } from "../kit.js"
import { Panel, PanelBody } from "../../ui/surface/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { Switch } from "../../ui/switch/index.js"
import { SCHEDULER_EVENT_TYPE, Scheduler, type SchedulerDrop, type SchedulerEvent, type SchedulerEventChange, type SchedulerSlot } from "../../ui/scheduler/index.js"
import { addDays } from "../../ui/date-picker/index.js"
import { Avatar } from "../../ui/avatar/index.js"
import { Badge } from "../../ui/badge/index.js"
import { Button } from "../../ui/button/index.js"
import { Input } from "../../ui/input/index.js"
import { DragDropProvider, Draggable, DropZone, type DropEvent } from "../../ui/drag-drop/index.js"
import { IconClose, IconSearch, IconSend } from "../../icons/generated/icons.js"
import { PLANT_RESOURCES, WEEK_START, plantEvents, type PlantEvent } from "./scheduler.fixtures.js"
import { BACKLOG, CREW, CREW_BLOCKS, PEOPLE, availability, crewJobs, type Backlog, type CrewJob, type CrewMember } from "./scheduler-timeline.fixtures.js"

/** Apply a move or resize to the host's events: all-day events store days, timed events instants. */
function applyChange<E extends SchedulerEvent>(events: E[], change: SchedulerEventChange<E>): E[] {
  return events.map((event) => (event.id === change.event.id ? { ...event, start: change.days?.start ?? change.start, end: change.days?.end ?? change.end } : event))
}

function MaintenanceSchedule() {
  const [events, setEvents] = useState(plantEvents)
  const [status, setStatus] = useState("")
  const next = useRef(1)
  const add = (slot: SchedulerSlot) => {
    const id = `new-${next.current++}`
    setEvents((current) => [...current, { id, title: "New work order", start: slot.days?.start ?? slot.start, end: slot.days?.end ?? slot.end, allDay: slot.allDay, tone: 3 }])
    setStatus(`Added a work order`)
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <Panel className="h-160 w-full">
        <PanelBody>
          <Scheduler
            aria-label="Maintenance schedule"
            events={events}
            resources={PLANT_RESOURCES}
            editable
            onEventChange={(change) => {
              setEvents((current) => applyChange(current, change))
              setStatus(`${change.kind === "move" ? "Moved" : "Resized"} ${change.event.title}`)
            }}
            onSlotSelect={add}
            onEventClick={(event) => setStatus(`Opened ${event.title}`)}
          />
        </PanelBody>
      </Panel>
      <p className="h-5 text-xs text-fg-muted" data-testid="scheduler-status">
        {status}
      </p>
    </div>
  )
}

function MonthSchedule() {
  const [events, setEvents] = useState(plantEvents)
  return (
    <Panel className="h-160 w-full">
      <PanelBody>
        <Scheduler aria-label="Maintenance month" events={events} resources={PLANT_RESOURCES} defaultView="month" editable onEventChange={(change) => setEvents((current) => applyChange(current, change))} />
      </PanelBody>
    </Panel>
  )
}

function SavingSchedule() {
  const [events, setEvents] = useState(plantEvents)
  return (
    <Panel className="h-140 w-full">
      <PanelBody>
        <Scheduler
          aria-label="Saved schedule"
          events={events}
          resources={PLANT_RESOURCES}
          defaultView="day"
          editable
          onEventChange={(change) =>
            // A save that takes a moment; Substation B is locked, so its changes fail and go back.
            new Promise<void>((resolve, reject) =>
              window.setTimeout(() => {
                if (change.event.resourceId === "substation") return reject(new Error("Substation B is locked"))
                setEvents((current) => applyChange(current, change))
                resolve()
              }, 700),
            )
          }
        />
      </PanelBody>
    </Panel>
  )
}

function LoadingSchedule() {
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"month" | "week" | "agenda">("week")
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <Switch size="sm" checked={loading} onCheckedChange={setLoading} label="Loading" />
      </div>
      <Panel className="h-140 w-full">
        <PanelBody>
          <Scheduler aria-label="Loading schedule" events={loading ? [] : plantEvents()} loading={loading} view={view} onViewChange={(next) => setView(next as typeof view)} views={["month", "week", "agenda"]} />
        </PanelBody>
      </Panel>
    </div>
  )
}

// A change window fixed in UTC: each zone's grid shows it at its own wall-clock time.
const WINDOWS: SchedulerEvent[] = [
  { id: "w1", title: "Global change window", start: `${addDays(WEEK_START, 1)}T22:00:00Z`, end: `${addDays(WEEK_START, 2)}T01:00:00Z`, tone: 7, description: "22:00–01:00 UTC" },
  { id: "w2", title: "Firmware rollout", start: `${addDays(WEEK_START, 3)}T08:00:00Z`, end: `${addDays(WEEK_START, 3)}T10:00:00Z`, tone: 2 },
]
const ZONES = [
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "America/New_York", label: "New York" },
]

function ZonedSchedule() {
  const [zone, setZone] = useState("Australia/Sydney")
  return (
    <div className="flex w-full flex-col gap-3">
      <Segmented size="sm" options={ZONES} value={zone} onValueChange={setZone} aria-label="Time zone" />
      <Panel className="h-140 w-full">
        <PanelBody>
          <Scheduler aria-label="Change windows" events={WINDOWS} timeZone={zone} scrollToTime="06:00" />
        </PanelBody>
      </Panel>
    </div>
  )
}

function CompactSchedule({ view }: { view: "week" | "month" }) {
  const [events, setEvents] = useState<PlantEvent[]>(plantEvents)
  return (
    <Panel className="h-160 w-full max-w-90">
      <PanelBody>
        <Scheduler aria-label={view === "week" ? "Narrow week" : "Narrow month"} events={events} resources={PLANT_RESOURCES} defaultView={view} views={["month", "week", "agenda"]} editable onEventChange={(change) => setEvents((current) => applyChange(current, change))} />
      </PanelBody>
    </Panel>
  )
}

/** Apply a timeline change: a move or resize (to another row too), or a copy of a repeating job. */
function applyCrewChange(jobs: CrewJob[], change: SchedulerEventChange<CrewJob>, id: () => string): CrewJob[] {
  const placed = { start: change.days?.start ?? change.start, end: change.days?.end ?? change.end, ...(change.resourceId ? { resourceId: change.resourceId } : {}) }
  if (change.effect === "copy") return [...jobs, { ...change.event, ...placed, id: id(), repeats: false, sent: false }]
  return jobs.map((job) => (job.id === change.event.id ? { ...job, ...placed } : job))
}

function CrewPlanner({ narrow = false }: { narrow?: boolean }) {
  const [jobs, setJobs] = useState(crewJobs)
  const [backlog, setBacklog] = useState(BACKLOG)
  const [weekends, setWeekends] = useState(false)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const next = useRef(1)
  const id = () => `n${next.current++}`
  const crew = CREW.filter((member) => member.sticky || member.title.toLowerCase().includes(query.trim().toLowerCase()))
  const fromList = (drop: SchedulerDrop) => {
    const work = drop.item.data as Backlog
    setBacklog((current) => current.filter((item) => item.id !== work.id))
    setJobs((current) => [...current, { id: id(), title: work.title, start: drop.day, allDay: true, resourceId: drop.resourceId, tone: 2 }])
    setStatus(`Planned ${work.title}`)
  }
  const toList = (event: DropEvent) => {
    if (event.item.type !== SCHEDULER_EVENT_TYPE) return false
    const job = event.item.data as CrewJob
    setJobs((current) => current.filter((item) => item.id !== job.id))
    setBacklog((current) => [...current, { id: job.id, title: job.title }])
    setStatus(`Moved ${job.title} back to the list`)
  }
  const add = (slot: SchedulerSlot) => {
    setJobs((current) => [...current, { id: id(), title: "New job", start: slot.days?.start ?? slot.start, end: slot.days?.end ?? slot.end, allDay: true, resourceId: slot.resourceId, tone: 3 }])
    setStatus("Added a job")
  }
  const scheduler = (
    <Scheduler<CrewJob, CrewMember>
      aria-label="Crew planner"
      layout="timeline"
      events={jobs}
      resources={crew}
      blocks={CREW_BLOCKS}
      hiddenDays={weekends ? undefined : [6, 7]}
      editable={(job) => (job.sent ? "Sent to the crew; open it to change it" : true)}
      eventEffect={(job) => (job.repeats ? "copy" : "move")}
      onEventChange={(change) => {
        setJobs((current) => applyCrewChange(current, change, id))
        setStatus(`${change.effect === "copy" ? "Copied" : change.kind === "move" ? "Moved" : "Resized"} ${change.event.title}`)
      }}
      onEventClick={(job) => setStatus(`Opened ${job.title}`)}
      onSlotSelect={add}
      dropAccept="work-order"
      onDrop={fromList}
      validateDrop={(_drag, resource, target) => {
        const block = target.blocks[0]
        return block ? { status: "error", reason: `${resource.title}: ${block.title}` } : true
      }}
      resourceHeader={
        <Input size="sm" icon={<IconSearch />} placeholder="Find a person" aria-label="Find a person" value={query} onChange={(event) => setQuery(event.target.value)} />
      }
      renderResource={(member, { compact }) =>
        member.sticky ? (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{member.title}</span>
            {compact ? null : <span className="truncate text-xs text-fg-muted">{member.description}</span>}
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={member.title} size="sm" decorative />
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="truncate text-sm font-medium">{member.title}</span>
              {member.role ? <Badge size="sm">{member.role}</Badge> : null}
            </span>
          </span>
        )
      }
      renderEvent={(job, { time, allDay }) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-semibold">{job.title}</span>
          {allDay ? null : <span className="truncate text-fg-muted">{time}</span>}
          <span className="flex items-center gap-1">
            {job.repeats ? <Badge size="sm">Weekly</Badge> : null}
            <span className="flex-1" />
            {job.sent ? (
              <Badge size="sm" tone="success">
                Sent
              </Badge>
            ) : (
              <Button
                size="xs"
                variant="ghost"
                icon={<IconSend />}
                aria-label={`Send ${job.title}`}
                onClick={() => {
                  setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, sent: true } : item)))
                  setStatus(`Sent ${job.title}`)
                }}
              />
            )}
            <Button size="xs" variant="ghost" icon={<IconClose />} aria-label={`Remove ${job.title}`} onClick={() => setJobs((current) => current.filter((item) => item.id !== job.id))} />
          </span>
        </span>
      )}
      actions={<Switch size="sm" checked={weekends} onCheckedChange={setWeekends} label="Weekends" />}
    />
  )
  if (narrow)
    return (
      <Panel className="h-160 w-full max-w-90">
        <PanelBody>{scheduler}</PanelBody>
      </Panel>
    )
  return (
    <DragDropProvider>
      <div className="flex w-full flex-col gap-2">
        <section className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Unscheduled work">
          <h3 className="text-sm font-medium">Unscheduled</h3>
          <DropZone id="crew-backlog" label="Unscheduled work" accept={["work-order", SCHEDULER_EVENT_TYPE]} onDrop={toList} render={<ul />} className="flex min-h-10 min-w-60 flex-1 flex-wrap items-center gap-2 rounded-[var(--radius-tile)] p-1">
            {backlog.map((work) => (
              <Draggable key={work.id} id={work.id} type="work-order" data={work} label={work.title} render={<li />} className="rounded-[var(--radius-item)] border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-sm">
                {work.title}
              </Draggable>
            ))}
          </DropZone>
        </section>
        <Panel className="h-160 w-full min-w-0">
          <PanelBody>{scheduler}</PanelBody>
        </Panel>
        <p className="h-5 text-xs text-fg-muted" data-testid="timeline-status">
          {status}
        </p>
      </div>
    </DragDropProvider>
  )
}

function Availability() {
  const [events, setEvents] = useState(availability)
  const [range, setRange] = useState("")
  return (
    <div className="flex w-full flex-col gap-2">
      <Panel className="h-140 w-full">
        <PanelBody>
          <Scheduler
            aria-label="Team availability"
            layout="timeline"
            continuous
            defaultView="month"
            views={["month"]}
            events={events}
            resources={PEOPLE}
            resourceWidth="calc(var(--unit) * 48)"
            editable
            onEventChange={(change) =>
              setEvents((current) => current.map((event) => (event.id === change.event.id ? { ...event, start: change.days?.start ?? change.start, end: change.days?.end ?? change.end, ...(change.resourceId ? { resourceId: change.resourceId } : {}) } : event)))
            }
            onRangeChange={(next) => setRange(`${next.first} – ${next.last}`)}
          />
        </PanelBody>
      </Panel>
      <p className="h-5 text-xs text-fg-muted" data-testid="availability-range">
        Loaded {range}
      </p>
    </div>
  )
}

export default function SchedulerSection() {
  return (
    <SectionPage>
      <Specimen
        title="Week"
        description="Overlapping work sits side by side; all-day and multi-day work runs in the band above the hours. Drag across empty time to add a work order, drag an event to move it, or drag its lower edge to change its end. With the keyboard, focus an event and use the arrow keys (Shift changes the end); focus the hours to choose a time with the arrows and Enter."
        layout="stack"
        wide
      >
        <MaintenanceSchedule />
      </Specimen>

      <Specimen title="Month" description="Bars run across days and timed work lists under them in time order. A day with more than fits shows +N more, which opens the whole day. Open a day's number to see its hours." layout="stack" wide>
        <MonthSchedule />
      </Specimen>

      <Specimen title="Agenda" description="The month's days that have events, each a list in time order." layout="stack" wide>
        <Panel className="h-140 w-full">
          <PanelBody>
            <Scheduler aria-label="Maintenance agenda" events={plantEvents()} resources={PLANT_RESOURCES} defaultView="agenda" />
          </PanelBody>
        </Panel>
      </Specimen>

      <Specimen title="Saving" description="onEventChange returns a promise: the event stays at its new time while it saves. Changes to Substation B fail, so they go back and the failure is announced." layout="stack" wide>
        <SavingSchedule />
      </Specimen>

      <Specimen title="Loading" description="Placeholders take the places of events; the header, the grid and its lines stay where they are." layout="stack" wide>
        <LoadingSchedule />
      </Specimen>

      <Specimen title="Time zones" description="The grid shows one zone's wall clock: the browser's, or timeZone. These windows are fixed in UTC." layout="stack" wide>
        <ZonedSchedule />
      </Specimen>

      <Specimen title="Narrow containers" description="Below 40 rem the week shows one day with the week's days to pick from, and the month shows dots with the chosen day's events below it." layout="row" wide>
        <CompactSchedule view="week" />
        <CompactSchedule view="month" />
      </Specimen>

      <Specimen
        title="Timeline"
        description="A row per person, a column per day. Drag jobs between people and days, drag either end to change their days, or drag them back to the list; weekly jobs copy. Leave and training refuse drops; sent jobs are locked. Arrow keys move a focused job, up and down to another person."
        layout="stack"
        wide
      >
        <CrewPlanner />
      </Specimen>

      <Specimen title="Rolling months" description="continuous: one strip from last month to next that scrolls sideways; the title follows the month in the middle. Sixty rows: only those in view render." layout="stack" wide>
        <Availability />
      </Specimen>

      <Specimen title="Narrow timeline" description="Below 40 rem the timeline shows one day, each person above their jobs; previous and next move by a day." layout="stack" wide>
        <CrewPlanner narrow />
      </Specimen>

      <Rules
        do={[
          "Give the scheduler a definite height: a Panel body or a sized region.",
          "Keep events in state and apply onEventChange; return a promise to save before it sticks.",
          "Colour kinds of work with chart slots 1–8; use status tones only for states such as a fault.",
          "Offer another way to reschedule (a form or menu) alongside dragging.",
        ]}
        dont={[
          "Do not wrap the scheduler in a second panel or card.",
          "Do not compute wall times yourself: pass instants, or wall-clock strings with timeZone.",
        ]}
      />
    </SectionPage>
  )
}
