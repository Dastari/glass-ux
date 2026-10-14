import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(join(dir,f.name)):[join(dir,f.name)])}
const failures=[]
const forbidden=new RegExp(['\\bf'+'ame\\b','first.?assist','\\bg'+'ema\\b','\\bj'+'im2\\b','ninja'+'rmm','glamorgan','flinders island','toby martin','maureen ferris'].join('|'),'i')
for(const file of [...walk('src'),...walk('docs')]){
 if(!/\.(tsx?|css|md|json)$/.test(file))continue
 const text=readFileSync(file,'utf8')
 if(forbidden.test(text))failures.push(`${file}: application branding or customer sample data`)
 if(/(?:from\s+|import\s*\(\s*)["']~\//.test(text))failures.push(`${file}: unresolved application import alias`)
 if(/(?:from\s+|import\s*\(\s*)["'][^"']*(?:\/app\/|\/server\/|\/routes\/)/.test(text))failures.push(`${file}: application import`)
}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('boundaries: neutral package, fictional data, no application imports')
