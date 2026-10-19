function validateURL(value) {
 let url;try{url=new URL(value)}catch{throw new Error('Please enter a valid recipe URL.');}
 const host=url.hostname.toLowerCase();
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port)||!host.includes('.')||/^[\d.]+$/.test(host)||host.includes(':')||/(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(host)||/(?:^|\.)(?:localhost|local|internal)$/.test(host)||/\.(?:local|internal|localhost)$/.test(host))throw new Error('Please use a public recipe website URL.');
 return url;
}
async function readLimited(response,max){
 const reader=response.body?.getReader();if(!reader)return '';const chunks=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw new Error('That page is too large to import. Try another recipe link.');}chunks.push(value)}
 const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}return new TextDecoder().decode(bytes);
}
async function importURL(value){
 let url=validateURL(value);const signal=AbortSignal.timeout(18000);
 for(let i=0;i<5;i++){
  const response=await fetch(url.href,{redirect:'manual',signal,headers:{'Accept':'text/html,application/xhtml+xml','User-Agent':'LittleRecipe/1.0 (recipe reader)'}});
  if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');if(!next)throw new Error('This recipe website returned an invalid redirect.');url=validateURL(new URL(next,url).href);continue;}
  if(!response.ok)throw new Error('This website is blocking access or the recipe is unavailable. Try a recipe link from another website.');
  const type=response.headers.get('content-type')||'';if(!/text\/html|application\/xhtml/i.test(type))throw new Error('That link isn’t a recipe webpage. Please paste a direct recipe page URL.');
  const html=await readLimited(response,3000000);return extractRecipe(html,url.href);
 }
 throw new Error('This website redirected too many times. Try the final recipe page URL.');
}
export default {async fetch(request,env={}){
 const url=new URL(request.url);
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'};
 if(url.pathname==='/api/import'){
  const origin=request.headers.get('origin');
  const allowedOrigin=env.ALLOWED_ORIGIN;
  const allowed=origin===url.origin||!!(allowedOrigin&&origin===allowedOrigin);
  if(origin&&!allowed)return Response.json({error:'Please import recipes from this website.'},{status:403,headers});
  if(origin&&allowed){headers['Access-Control-Allow-Origin']=origin;headers['Vary']='Origin';}
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'}});
  if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'POST'}});
  try{const body=await readLimited(request,4096);const data=JSON.parse(body);if(typeof data.url!=='string')throw Error('Please enter a recipe website URL.');const recipe=await importURL(data.url);return Response.json(recipe,{headers});}
  catch(e){const message=e?.name==='TimeoutError'||e?.name==='AbortError'?'This recipe website took too long to respond. Please try again.':e instanceof SyntaxError?'Please enter a recipe website URL.':e?.message||'We couldn’t reach that website. Try another recipe link.';return Response.json({error:message},{status:422,headers});}
 }
 if(url.pathname==='/favicon.ico')return new Response(null,{status:204});
 if(url.pathname!=='/')return new Response('Not found',{status:404,headers});
 return new Response(HTML,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: http: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'"}});
}};
