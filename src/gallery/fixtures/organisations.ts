import type { ContextItem } from '../../shell/context-switcher/index.js'
export const MOCK_ORGANISATIONS: ContextItem[] = [
 {id:'northstar',name:'Northstar Studio',code:'NST'}, {id:'north-branch',name:'Northstar Annex',parentId:'northstar'},
 {id:'cedarvale',name:'Cedar Vale Collective',code:'CDV'}, {id:'orbit',name:'Orbit Workspace',code:'ORB'},
 {id:'mossbridge',name:'Mossbridge Workshop',code:'MOS'}, {id:'lumen',name:'Lumen Fieldworks',code:'LMN'}
]
export const toContextItem = (value: ContextItem) => value
export const PORTRAITS = [new URL("../assets/portraits/feab4fd97387d2f5-192.webp", import.meta.url).href,
new URL("../assets/portraits/cbf27adc675e7b25-192.webp", import.meta.url).href,
new URL("../assets/portraits/8ad46f910079e080-192.webp", import.meta.url).href,
new URL("../assets/portraits/4c58d03dfff85365-192.webp", import.meta.url).href,
new URL("../assets/portraits/7c8269db549f6bd6-192.webp", import.meta.url).href,
new URL("../assets/portraits/4b075342fc56c704-192.webp", import.meta.url).href,
new URL("../assets/portraits/9db8033793934864-192.webp", import.meta.url).href,
new URL("../assets/portraits/54364f7083147b44-192.webp", import.meta.url).href,
new URL("../assets/portraits/3a1cf88d234f0989-192.webp", import.meta.url).href,
new URL("../assets/portraits/d2e92a141d14c831-192.webp", import.meta.url).href,
new URL("../assets/portraits/a71048e3b707356c-192.webp", import.meta.url).href,
new URL("../assets/portraits/4ab1cf405e682062-192.webp", import.meta.url).href]
export const DEMO_DATASET = {organisations:MOCK_ORGANISATIONS,people:[
 {id:'mira.rowan',name:'Mira Rowan',photo:PORTRAITS[0]}, {id:'avery.quinn',name:'Avery Quinn',photo:PORTRAITS[1]},
 {id:'jamie.wells',name:'Jamie Wells',photo:PORTRAITS[2]}, {id:'ellis.park',name:'Ellis Park',photo:PORTRAITS[3]}
]}
