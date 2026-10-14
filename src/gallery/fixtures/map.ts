import type { MapConfig } from '../../ui/map/index.js'
export const DEMO_MAP_CONFIG: MapConfig = {basemap:null,minZoom:1.5,maxZoom:18,regions:'/geo/admin1/{country}/{code}.json',regionAttribution:{label:'Natural Earth',href:'https://www.naturalearthdata.com/',licence:'Public domain'}}
export const MOCK_SITES = [
 {id:'studio-east',name:'East studio',address:'12 Example Lane, Melbourne',location:{lat:-37.812,lng:144.972}},
 {id:'studio-west',name:'West studio',address:'24 Sample Avenue, Melbourne',location:{lat:-37.805,lng:144.945}},
 {id:'workshop',name:'Workshop',address:'8 Fiction Road, Melbourne',location:{lat:-37.828,lng:144.953}}
]
