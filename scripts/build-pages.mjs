import {readFile,mkdir,writeFile} from 'node:fs/promises';

// Pages hosts the browser interface. The Worker handles requests to recipe publishers.
const endpoint=process.env.RECIPE_API_URL?.trim()||'';
if(endpoint){
 const url=new URL(endpoint);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/api/import'||url.search||url.hash)throw new Error('RECIPE_API_URL must be an HTTPS URL ending in /api/import, with no credentials or query string.');
}
const utils=(await readFile('worker/recipe.js','utf8')).replace(/export /g,'');
let html=await readFile('worker/index.html','utf8');
html=html.replace('/*RECIPE_UTILS*/',utils).replace('/*IMPORT_CONFIG*/',JSON.stringify(endpoint).replace(/</g,'\\u003c'));
await mkdir('pages',{recursive:true});
await writeFile('pages/index.html',html);
await writeFile('pages/.nojekyll','');
await mkdir('api',{recursive:true});
await writeFile('api/worker.js',utils+'\nconst HTML="Little Recipe import service";\n'+await readFile('worker/server.js','utf8'));
console.log(endpoint?'GitHub Pages built with recipe import enabled.':'GitHub Pages built. Set RECIPE_API_URL to enable URL import.');
