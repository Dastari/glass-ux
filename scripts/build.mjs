import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
rmSync('dist',{recursive:true,force:true})
execFileSync('pnpm',['exec','tsc','-p','tsconfig.build.json'],{stdio:'inherit'})
function assets(dir){for(const f of readdirSync(dir,{withFileTypes:true})){const p=join(dir,f.name);if(f.isDirectory())assets(p);else if(!/\.tsx?$/.test(f.name)){const out=p.replace(/^src/,'dist');mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});cpSync(p,out)}}}
assets('src')
