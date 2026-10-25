import { addDays, todayIso, type IsoDate } from "../../ui/date-picker/index.js"
import { startOfWeek, type SchedulerEvent, type SchedulerResource } from "../../ui/scheduler/index.js"

/** A fictional plant's maintenance schedule, laid out around the current week so the demo always has a today. */
export const PLANT_RESOURCES: SchedulerResource[] = [
  { id: "pump", title: "Pump house" },
  { id: "substation", title: "Substation B" },
  { id: "line2", title: "Packing line 2" },
  { id: "cold", title: "Cold store" },
  { id: "boiler", title: "Boiler room" },
]

export interface PlantEvent extends SchedulerEvent {
  crew?: string
}

/** Monday of the week holding today. */
export const WEEK_START: IsoDate = startOfWeek(todayIso(), 1)

const day = (offset: number) => addDays(WEEK_START, offset)
const at = (offset: number, time: string) => `${day(offset)}T${time}`

export function plantEvents(): PlantEvent[] {
  return [
    // Last week
    { id: "e01", title: "Valve exercise", start: at(-6, "09:00"), end: at(-6, "10:30"), tone: 1, resourceId: "pump", description: "Exercise isolation valves V1–V6" },
    { id: "e02", title: "Thermal imaging", start: at(-4, "13:00"), end: at(-4, "15:00"), tone: 7, resourceId: "substation" },
    { id: "e03", title: "Quarterly audit", start: day(-3), end: day(-1), allDay: true, tone: 5, description: "External auditor on site" },
    // This week
    { id: "e10", title: "Chiller filter change", start: at(0, "07:00"), end: at(0, "09:00"), tone: 1, resourceId: "cold", crew: "Crew A" },
    { id: "e11", title: "Conveyor inspection", start: at(0, "08:30"), end: at(0, "10:00"), tone: 2, resourceId: "line2", crew: "Crew B" },
    { id: "e12", title: "Safety walk", start: at(0, "09:00"), end: at(0, "09:30"), tone: 3, description: "Weekly walk with the site lead" },
    { id: "e13", title: "Lubrication round", start: at(0, "11:00"), end: at(0, "12:00"), tone: 2, resourceId: "line2" },
    { id: "e14", title: "Permit review", start: at(0, "14:00"), end: at(0, "14:45"), tone: 3 },
    { id: "e15", title: "Spare parts count", start: at(0, "15:30"), end: at(0, "16:30"), tone: 8, resourceId: "cold" },
    { id: "e20", title: "Pump bearing replacement", start: at(1, "10:00"), end: at(1, "12:30"), tone: 1, resourceId: "pump", description: "Replace drive-end bearing on P-104" },
    { id: "e21", title: "Contractor induction", start: at(1, "13:00"), end: at(1, "14:00"), tone: 3 },
    { id: "e30", title: "Fire system certification", start: day(2), allDay: true, tone: 5, description: "Sprinkler and alarm test" },
    { id: "e31", title: "Packing line 2 shutdown", start: day(2), end: day(5), allDay: true, tone: 6, resourceId: "line2", description: "Planned shutdown for gearbox overhaul" },
    { id: "e32", title: "Gearbox overhaul", start: at(2, "07:30"), end: at(2, "16:00"), tone: 6, resourceId: "line2", crew: "Crew B" },
    { id: "e40", title: "Switchboard thermal scan", start: at(3, "22:00"), end: at(4, "02:00"), tone: 7, resourceId: "substation", description: "After hours, low load" },
    { id: "e41", title: "Boiler inspection", start: at(3, "09:00"), end: at(3, "11:00"), tone: 4, resourceId: "boiler" },
    { id: "e42", title: "Boiler tube clean", start: at(3, "10:00"), end: at(3, "13:00"), tone: 4, resourceId: "boiler" },
    { id: "e43", title: "Water treatment test", start: at(3, "10:30"), end: at(3, "11:15"), tone: 8, resourceId: "boiler" },
    { id: "e50", title: "Line 1 gearbox fault", start: at(4, "08:00"), end: at(4, "11:00"), tone: "danger", description: "Unplanned outage" },
    { id: "e51", title: "Compressor service", start: at(4, "13:00"), end: at(4, "15:00"), tone: 2, resourceId: "cold" },
    { id: "e60", title: "Generator load test", start: at(5, "08:00"), end: at(5, "09:00"), tone: 7, resourceId: "substation" },
    // Next week
    { id: "e70", title: "Cooling tower clean", start: at(8, "07:00"), end: at(8, "12:00"), tone: 1, resourceId: "pump" },
    { id: "e71", title: "Crane certification", start: day(10), allDay: true, tone: 5 },
    { id: "e72", title: "Roof drain check", start: at(11, "09:00"), end: at(11, "10:00"), tone: 8 },
    { id: "e73", title: "Annual shutdown planning", start: at(12, "13:00"), end: at(12, "15:30"), tone: 3 },
    { id: "e80", title: "Motor rewind return", start: at(16, "10:00"), end: at(16, "11:00"), tone: 2, resourceId: "line2" },
  ]
}
