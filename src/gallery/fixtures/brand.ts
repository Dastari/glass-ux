import { configureBrand, type BrandSource } from '../../ui/brand/index.js'
import { IconDashboard, IconFolder, IconUsers, IconTickets } from '../../icons/generated/icons.js'
export const DEMO_LOGO: BrandSource = {id:'glass-ux',viewBox:'0 0 24 24',primary:[{d:'M3 8 12 3 21 8 12 13Z'}],secondary:[{d:'M3 13 12 18 21 13 21 17 12 22 3 17Z'}]}
export const BRAND_SOURCES = {product:DEMO_LOGO,wordmark:{...DEMO_LOGO,id:'glass-ux-wordmark'},ai:{...DEMO_LOGO,id:'glass-ux-assistant'}}
export function configureDemoBrand() {configureBrand({marks:BRAND_SOURCES})}
export const WORKSPACE_SETTINGS = {label:'Workspace settings',shortcut:'mod+,'}
export const ORGANISATION_SETTINGS = {label:'Organisation settings',shortcut:'mod+shift+,'}
export const moduleRail = (_module: string) => [
 {label:'Overview',icon:IconDashboard,shortcut:'mod+1'}, {label:'Projects',icon:IconFolder,shortcut:'mod+2'},
 {label:'People',icon:IconUsers,shortcut:'mod+3'}, {label:'Requests',icon:IconTickets,shortcut:'mod+4'}
]
