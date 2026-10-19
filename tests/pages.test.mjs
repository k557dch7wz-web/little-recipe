import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Pages output includes complete browser code and valid JavaScript',async()=>{
 const html=await readFile('pages/index.html','utf8');
 assert.match(html,/Good recipes/);
 assert.doesNotMatch(html,/\/\*(RECIPE_UTILS|IMPORT_CONFIG)\*\//);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 new vm.Script(script);
 assert.match(script,/const IMPORT_ENDPOINT = "/);
 assert.match(script,/localStorage\.setItem/);
 assert.match(script,/fetch\(IMPORT_ENDPOINT/);
});

test('backend allows only the configured Pages origin',async()=>{
 const {default:worker}=await import('../api/worker.js');
 const allowed='https://cook.github.io';
 const request=(origin,method='OPTIONS')=>new Request('https://import.example.com/api/import',{method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({url:'http://127.0.0.1'})}:{})});
 const preflight=await worker.fetch(request(allowed),{ALLOWED_ORIGIN:allowed});
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),allowed);
 assert.equal(preflight.headers.get('Access-Control-Allow-Methods'),'POST, OPTIONS');
 const denied=await worker.fetch(request('https://another.github.io'),{ALLOWED_ORIGIN:allowed});
 assert.equal(denied.status,403);
 assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null);
 const error=await worker.fetch(request(allowed,'POST'),{ALLOWED_ORIGIN:allowed});
 assert.equal(error.status,422);
 assert.equal(error.headers.get('Access-Control-Allow-Origin'),allowed);
 const unconfigured=await worker.fetch(request(allowed));
 assert.equal(unconfigured.status,403);
});
