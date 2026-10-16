// Fictional fixtures for the documentation showcase. No product or backend dependencies.
import { PORTRAITS } from "glass-ux/gallery/fixtures/organisations";

export interface StudioProject {
  id: string;
  name: string;
  category: string;
  owner: string;
  status: "In progress" | "In review" | "Complete";
  progress: number;
  hours: number;
}

export const studioProjects: StudioProject[] = [
  {
    id: "meridian",
    name: "Meridian identity",
    category: "Brand strategy",
    owner: "Avery Quinn",
    status: "In progress",
    progress: 72,
    hours: 64,
  },
  {
    id: "observatory",
    name: "The Observatory",
    category: "Digital experience",
    owner: "Mira Chen",
    status: "In review",
    progress: 92,
    hours: 112,
  },
  {
    id: "fieldwork",
    name: "Fieldwork journal",
    category: "Editorial design",
    owner: "Ellis Park",
    status: "In progress",
    progress: 46,
    hours: 38,
  },
  {
    id: "cedar",
    name: "Cedar house",
    category: "Art direction",
    owner: "Noah Reed",
    status: "Complete",
    progress: 100,
    hours: 86,
  },
  {
    id: "sundial",
    name: "Sundial collection",
    category: "Campaign design",
    owner: "Mira Chen",
    status: "In progress",
    progress: 34,
    hours: 28,
  },
  {
    id: "morrow",
    name: "Morrow spaces",
    category: "Spatial identity",
    owner: "Avery Quinn",
    status: "In review",
    progress: 88,
    hours: 76,
  },
  {
    id: "wildflower",
    name: "Wildflower press",
    category: "Editorial design",
    owner: "Ellis Park",
    status: "Complete",
    progress: 100,
    hours: 52,
  },
  {
    id: "tideline",
    name: "Tideline festival",
    category: "Campaign design",
    owner: "Noah Reed",
    status: "In progress",
    progress: 58,
    hours: 48,
  },
];

export const studioPeople = [
  { name: "Avery Quinn", src: PORTRAITS[1] },
  { name: "Mira Chen", src: PORTRAITS[0] },
  { name: "Ellis Park", src: PORTRAITS[3] },
  { name: "Noah Reed", src: PORTRAITS[4] },
];
export const studioPortrait = (name: string) =>
  studioPeople.find((person) => person.name === name)?.src;
export const weeklyHours = [28, 42, 35, 56, 48, 68, 58, 74, 65, 84, 76, 94];
export const previousHours = [20, 30, 26, 35, 32, 48, 40, 56, 46, 62, 55, 68];
export const taskNames = [
  "Review the visual direction",
  "Share the identity guidelines",
  "Prepare handover files",
  "Schedule the studio review",
];
