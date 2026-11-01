import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { forbiddenPattern } from './config.mjs'

function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(join(dir,f.name)):[join(dir,f.name)])}

/** The project's forbidden terms stay out of source and docs, and components stay application-free. */
export function checkBoundaries(kit){
 const failures=[]
 const forbidden=kit.checks.forbidden.map(forbiddenPattern)
 for(const file of [...walk(kit.srcDir),...walk(kit.docsDir)]){
  if(!/\.(tsx?|css|md|json)$/.test(file))continue
  const text=readFileSync(file,'utf8')
  if(forbidden.some(term=>term.test(text)))failures.push(`${file}: application branding or customer sample data`)
  if(/(?:from\s+|import\s*\(\s*)["']~\//.test(text))failures.push(`${file}: unresolved application import alias`)
  if(/(?:from\s+|import\s*\(\s*)["'][^"']*(?:\/app\/|\/server\/|\/routes\/)/.test(text))failures.push(`${file}: application import`)
 }
 // Server adapters depend on the core components, never the reverse: only the gallery (which
 // demonstrates them) and the adapters themselves may import from the adapters folder.
 for(const file of walk(kit.srcDir)){
  if(!/\.(tsx?|mts)$/.test(file)||file.startsWith(`${kit.srcDir}/adapters/`)||file.startsWith(`${kit.galleryDir}/`))continue
  const text=readFileSync(file,'utf8')
  if(/(?:from\s+|import\s*\(\s*)["'][^"']*\/adapters\//.test(text))failures.push(`${file}: core imports an optional server adapter`)
 }
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1;return}
 console.log('boundaries: neutral package, fictional data, no application imports')
}
