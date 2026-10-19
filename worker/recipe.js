export const fractions = {'½':.5,'⅓':1/3,'⅔':2/3,'¼':.25,'¾':.75,'⅛':.125,'⅜':.375,'⅝':.625,'⅞':.875,'⅙':1/6,'⅚':5/6};
export function formatAmount(value) {
  const whole = Math.floor(value + 0.00001), rem = value - whole;
  for (const [glyph, n] of Object.entries(fractions)) if(Math.abs(rem - n)<.008) return (whole ? whole+' ' : '')+glyph;
  return Number(value.toFixed(2)).toString();
}
export function scaleIngredient(text, multiplier) {
  if(multiplier===1) return text;
  // Try fractions before integers so 1/2 is never interpreted as 1.
  const token='(?:\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*\\/\\s*\\d+|\\d+[½⅓⅔¼¾⅛⅜⅝⅞⅙⅚]|\\d+(?:[.,]\\d+)?|[½⅓⅔¼¾⅛⅜⅝⅞⅙⅚])';
  function parse(s){ s=s.trim();let v=0; s=s.replace(/[½⅓⅔¼¾⅛⅜⅝⅞⅙⅚]/g,g=>{v+=fractions[g];return ''});const parts=s.trim().split(/\s+/).filter(Boolean);for(const p of parts){if(p.includes('/')){const [a,b]=p.split('/').map(Number);v+=a/b}else v+=Number(p.replace(',','.'))}return v;}
  let result=text.replace(new RegExp('^(\\s*)('+token+')(?:\\s*([–—-]|to)\\s*('+token+'))?'),(_,space,a,sep,b)=>space+formatAmount(parse(a)*multiplier)+(b?' '+sep+' '+formatAmount(parse(b)*multiplier):''));
  // A parenthetical size before a package noun describes each package, not the total.
  const packaged=new RegExp('^\\s*'+token+'\\s*\\([^)]*\\)\\s*(?:cans?|packages?|packs?|jars?|bottles?|boxes?|bags?)\\b','i').test(text);
  if(!packaged)result=result.replace(/\(([^)]*)\)/g,(_,inner)=>'('+inner.replace(new RegExp('('+token+')(?=\\s*(?:g|kg|mg|ml|l|oz|lbs?|cups?|tbsp|tsp|tablespoons?|teaspoons?|cans?|cloves?|grams?|milliliters?)\\b)','gi'),n=>formatAmount(parse(n)*multiplier))+')');
  return result;
}
export function cleanText(value) {
 return String(value||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:39|x27);/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),1114111))).replace(/\s+/g,' ').trim();
}
export function extractRecipe(html,source) {
 const found=[];
 function walk(obj){if(!obj||typeof obj!=='object')return;if(Array.isArray(obj)){obj.forEach(walk);return}const types=[obj['@type']].flat();if(types.some(t=>typeof t==='string' && /(?:^|\/)Recipe$/.test(t)))found.push(obj);for(const k of ['@graph','mainEntity','itemListElement','item'])walk(obj[k]);}
 for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1].trim()))}catch{}}
 const r=found.find(x=>x.recipeIngredient?.length&&x.recipeInstructions);if(!r)throw new Error('We couldn’t find a complete recipe on this page. Try a direct recipe link from another website.');
 const steps=[];function flatten(x){if(typeof x==='string'){const lines=x.split(/\r?\n/).map(cleanText).filter(Boolean);steps.push(...lines)}else if(Array.isArray(x))x.forEach(flatten);else if(x&&typeof x==='object'){if(x.itemListElement)flatten(x.itemListElement);else if(x.text)flatten(x.text);}}
 flatten(r.recipeInstructions);if(!steps.length)throw new Error('This page has no readable recipe steps. Please try another link.');
 let img=Array.isArray(r.image)?r.image[0]:r.image;img=typeof img==='object'?img?.url:img;try{img=new URL(img,source);if(!['https:','http:'].includes(img.protocol))img=null;}catch{img=null}
 return {id:crypto.randomUUID(),title:cleanText(r.name)||'Untitled recipe',ingredients:r.recipeIngredient.map(cleanText).map(s=>s.replace(/\s*\(\s*[$£€]\s*[\d.,]+\s*\)/g,'').replace(/,?\s*[$£€]\s*[\d.,]+/g,'').replace(/\(\s*\)/g,'').trim()).filter(Boolean),steps,image:img?.href||'',source,servings:cleanText([r.recipeYield].flat()[0]||''),time:duration(r.totalTime||r.cookTime),category:'Imported',createdAt:Date.now()};
}
function duration(x){if(!x)return '';const m=String(x).match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);if(!m)return '';const n=Number(m[1]||0)*1440+Number(m[2]||0)*60+Number(m[3]||0);return n?`${n} min`:'';}
