import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, relative, join } from 'node:path';
import { build, transform } from 'esbuild';
import { maintenanceEnabled, maintenancePage } from '../maintenance.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));const source=join(root,'public');const output=join(root,'dist');
async function files(directory){const entries=await readdir(directory,{withFileTypes:true});const nested=await Promise.all(entries.map(e=>e.isDirectory()?files(join(directory,e.name)):[join(directory,e.name)]));return nested.flat();}
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});await cp(source,output,{recursive:true});
const all=await files(source);const pages=all.filter(f=>extname(f)==='.html');
// Keep the reference's shared CSS and page structure; cache shared assets once.
for(const file of all.filter(f=>extname(f)==='.css')){const result=await transform(await readFile(file,'utf8'),{loader:'css',minify:true,target:['chrome110','firefox115','safari16.4']});await writeFile(join(output,relative(source,file)),result.code);}
for(const path of ['assets/js/site.js','assets/js/green-flux.mjs','preventivo/wizard.mjs']){
 await build({entryPoints:[join(source,path)],outfile:join(output,path),bundle:true,minify:true,platform:'browser',format:'iife',target:'es2022',legalComments:'none'});
}
if(maintenanceEnabled){for(const path of [...pages.map(p=>relative(source,p)),'404.html'])await writeFile(join(output,path),maintenancePage);}
const origin='https://green-flux-nine.vercel.app';
const routes=pages.filter(p=>p.endsWith('index.html')).map(p=>'/'+relative(source,p).replace(/index\.html$/,'').split('\\').join('/')).sort();
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route=>`  <url><loc>${origin}${route}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(join(output,'sitemap.xml'),sitemap);await writeFile(join(source,'sitemap.xml'),sitemap);
console.log(`Built ${pages.length} pages, ${routes.length} sitemap routes and shared assets.${maintenanceEnabled?' Maintenance enabled.':''}`);
