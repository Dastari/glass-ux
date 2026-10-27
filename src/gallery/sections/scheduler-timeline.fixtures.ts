import { addDays, type IsoDate } from "../../ui/date-picker/index.js"
import type { SchedulerBlock, SchedulerEvent, SchedulerResource } from "../../ui/scheduler/index.js"
import { WEEK_START } from "./scheduler.fixtures.js"

/** A fictional grounds crew, planned by day around the current week. */
export interface CrewMember extends SchedulerResource {
  role?: string
}

export const UNASSIGNED = "unassigned"
export const WHOLE_SITE = "site"

export const CREW: CrewMember[] = [
  { id: UNASSIGNED, title: "Unassigned", description: "Dated work without a person", sticky: true },
  { id: WHOLE_SITE, title: "Whole site", description: "Everyone", sticky: true },
  { id: "ari", title: "Ari Moss", role: "Supervisor" },
  { id: "bea", title: "Bea Lund", role: "Arborist" },
  { id: "cal", title: "Cal Ortiz", role: "Operator" },
  { id: "dee", title: "Dee Hart", role: "Labourer" },
  { id: "eli", title: "Eli Brandt", role: "Irrigation" },
  { id: "fay", title: "Fay Nakamura", role: "Labourer" },
  { id: "gus", title: "Gus Okafor", role: "Operator" },
]

export interface CrewJob extends SchedulerEvent {
  /** Sent to the person's phone: locked in place. */
  sent?: boolean
  /** Repeats each week: dragging copies it. */
  repeats?: boolean
}

const day = (offset: number) => addDays(WEEK_START, offset)

export function crewJobs(): CrewJob[] {
  return [
    { id: "j01", title: "Mow north fields", start: day(0), allDay: true, resourceId: "dee", tone: 2, repeats: true },
    { id: "j02", title: "Hedge line, east gate", start: day(0), end: day(2), allDay: true, resourceId: "fay", tone: 2 },
    { id: "j03", title: "Tree survey, car park", start: day(0), allDay: true, resourceId: "bea", tone: 4, sent: true },
    { id: "j04", title: "Irrigation zone 3 fault", start: `${day(1)}T07:30`, end: `${day(1)}T11:00`, resourceId: "eli", tone: "warning" },
    { id: "j05", title: "Excavator to depot", start: day(1), allDay: true, resourceId: "cal", tone: 6 },
    { id: "j06", title: "Mulch beds, west lawn", start: day(2), end: day(4), allDay: true, resourceId: "gus", tone: 2 },
    { id: "j07", title: "Toolbox talk", start: `${day(2)}T06:45`, end: `${day(2)}T07:15`, resourceId: "ari", tone: 3, repeats: true },
    { id: "j08", title: "Pine removal", start: day(3), allDay: true, resourceId: "bea", tone: 4 },
    { id: "j09", title: "Path edging", start: day(3), allDay: true, resourceId: UNASSIGNED, tone: 2 },
    { id: "j10", title: "Pump station check", start: day(4), allDay: true, resourceId: "eli", tone: 1 },
    { id: "j11", title: "Weekly site walk", start: day(4), allDay: true, resourceId: "ari", tone: 3 },
    { id: "j12", title: "Leaf blowing, courts", start: day(1), allDay: true, resourceId: UNASSIGNED, tone: 2 },
    { id: "j13", title: "Site induction", start: day(0), allDay: true, resourceId: WHOLE_SITE, tone: 3 },
    { id: "j14", title: "Public holiday prep", start: day(1), allDay: true, resourceId: WHOLE_SITE, tone: 5 },
  ]
}

export const CREW_BLOCKS: SchedulerBlock[] = [
  { id: "b1", resourceId: "cal", start: day(3), end: day(5), title: "Annual leave" },
  { id: "b2", resourceId: "fay", start: day(4), title: "Training" , tone: "info" },
]

/** Work not yet on a day: dragged from the list onto a person and day. */
export interface Backlog {
  id: string
  title: string
}

export const BACKLOG: Backlog[] = [
  { id: "w1", title: "Replace bench slats" },
  { id: "w2", title: "Clear storm drain" },
  { id: "w3", title: "Fence repair, paddock 2" },
  { id: "w4", title: "Re-turf goal mouth" },
]

const FIRST = ["Ana", "Ben", "Cleo", "Dev", "Eda", "Finn", "Gia", "Hal", "Ines", "Jon", "Kai", "Lena", "Max", "Nia", "Oto", "Pia", "Quin", "Rae", "Sol", "Tia"]
const LAST = ["Abbott", "Brooks", "Chen", "Duarte", "Ekwueme", "Fischer", "Grant"]

/** Sixty people for the availability strip: enough rows that only those in view render. */
export const PEOPLE: SchedulerResource[] = Array.from({ length: 60 }, (_, index) => ({
  id: `p${index}`,
  title: `${FIRST[index % FIRST.length]} ${LAST[(index * 3) % LAST.length]}`,
}))

/** Leave and training spread over three months around today. */
export function availability(): SchedulerEvent[] {
  const events: SchedulerEvent[] = []
  for (let index = 0; index < PEOPLE.length; index++) {
    const start: IsoDate = addDays(WEEK_START, ((index * 11) % 70) - 35)
    events.push({ id: `a${index}`, title: index % 4 === 0 ? "Training" : "Annual leave", start, end: addDays(start, 2 + (index % 6)), allDay: true, tone: index % 4 === 0 ? 5 : 1, resourceId: PEOPLE[index]!.id })
    if (index % 3 === 0) {
      const second = addDays(start, 20 + (index % 9))
      events.push({ id: `b${index}`, title: "Rostered day off", start: second, allDay: true, tone: 8, resourceId: PEOPLE[index]!.id })
    }
  }
  return events
}
