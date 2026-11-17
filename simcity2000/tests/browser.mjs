/** Real original DOS binary, SVGA frames, mouse/keyboard, audio and city files. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {inspectCity,sameBytes} from '../cities.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const engine=process.env.SC2K_ENGINE==='webkit'?webkit:chromium;
const root=new URL('../../',import.meta.url),output=process.env.SCREENSHOT_DIR??new URL('../test-results/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith('/games/')||pathname.includes('..'))return res.writeHead(404).end();
  const file=pathname.slice(7)+(pathname.endsWith('/')?'index.html':'');
  try{const data=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':{mjs:'text/javascript',js:'text/javascript',json:'application/json',css:'text/css',wasm:'application/wasm',svg:'image/svg+xml',jpg:'image/jpeg',zip:'application/zip',txt:'text/plain'}[file.split('.').at(-1)]??'text/html'}).end(data);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/games/simcity2000/`,browser=await engine.launch({headless:true}),contexts=[],errors=[],external=[];
let count=0;const pass=text=>console.log(`PASS ${++count}: ${text}`);
async function page({blocked=false,context=null}={}){
  context??=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});contexts.push(context);
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==new URL(base).origin&&!['blob:','data:'].includes(url.protocol)){external.push(url.href);return route.abort();}return route.continue();});
  await context.addInitScript(({blocked})=>{
    if(blocked){Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Blocked','SecurityError');}});}
    const NativeAudio=window.AudioContext;window.AudioContext=class extends NativeAudio{constructor(...args){super(...args);window.__audio=this;}};
    const NativeNode=window.AudioWorkletNode;window.AudioWorkletNode=class extends NativeNode{constructor(ctx,...args){super(ctx,...args);const analyser=ctx.createAnalyser();analyser.fftSize=2048;this.connect(analyser);window.__analyser=analyser;}};
  },{blocked});
  const p=await context.newPage();p.on('pageerror',error=>errors.push(error.message));
  await p.goto(base);await p.waitForFunction(()=>document.querySelector('#boot').hidden);
  assert.equal(await p.locator('script[src*="emulators.js"]').count(),0);
  await observe(p);return p;
}
async function observe(p){await p.evaluate(async()=>{const {DosSession}=await import('./session.mjs');const start=DosSession.prototype.start;DosSession.prototype.start=async function(...args){window.__dos=this;return start.apply(this,args);};});}
async function click(p,x,y,{button='left'}={}){const r=await p.locator('#screen').boundingBox();await p.mouse.move(r.x+r.width*x/640,r.y+r.height*y/480);await p.waitForTimeout(100);await p.mouse.down({button});await p.waitForTimeout(120);await p.mouse.up({button});await p.waitForTimeout(180);}
async function menu(p,x,y){const r=await p.locator('#screen').boundingBox();await p.mouse.move(r.x+r.width*120/640,r.y+r.height*8/480);await p.waitForTimeout(100);await p.mouse.down();await p.waitForTimeout(250);await p.mouse.move(r.x+r.width*x/640,r.y+r.height*y/480);await p.waitForTimeout(150);await p.mouse.up();await p.waitForTimeout(300);}
async function drag(p,x,y,toX,toY){const r=await p.locator('#screen').boundingBox();await p.mouse.move(r.x+r.width*x/640,r.y+r.height*y/480);await p.waitForTimeout(120);await p.mouse.down();await p.waitForTimeout(100);for(let i=1;i<=24;i++){await p.mouse.move(r.x+r.width*(x+(toX-x)*i/24)/640,r.y+r.height*(y+(toY-y)*i/24)/480);await p.waitForTimeout(25);}await p.mouse.up();await p.waitForTimeout(200);}
async function combo(p,key){await p.locator('#screen').focus();await p.keyboard.down('Alt');await p.waitForTimeout(120);await p.keyboard.press(key,{delay:180});await p.keyboard.up('Alt');await p.waitForTimeout(200);}
async function title(p){await p.waitForFunction(()=>{const c=document.querySelector('#screen');if(c.width!==640||c.height!==480)return false;const ctx=c.getContext('2d');return [150,200,250,300].every(y=>{const a=ctx.getImageData(250,y,1,1).data;return a[0]>=150&&a[0]<=220&&a[0]===a[1]&&a[1]===a[2];});},{},{timeout:45000});}
async function boot(p){await p.locator('#start').click();await p.waitForFunction(()=>document.body.dataset.state==='playing',{},{timeout:60000});await title(p);assert.equal(await p.evaluate(()=>__dos.ci.getRunningProgram()),'SC2000');}
async function save(p,name='city'){
  const download=p.waitForEvent('download',{timeout:15000});await p.locator('#save').click();const file=await download;const path=`${output}/${name}.SC2`;await file.saveAs(path);await p.waitForTimeout(1800);return new Uint8Array(await readFile(path));
}
function decode(src){const out=[];for(let i=0;i<src.length;){const v=src[i++];if(v<128){out.push(...src.subarray(i,i+v));i+=v;}else if(v>128){out.push(...new Array(v-127).fill(src[i++]));}assert.ok(out.length<=32768);}return Uint8Array.from(out);}
function city(bytes){const {chunks}=inspectCity(bytes);const misc=decode(chunks.get('MISC'));return {chunks,misc,view:new DataView(misc.buffer),buildings:decode(chunks.get('XBLD')),zones:decode(chunks.get('XZON'))};}
async function resumed(p){if(await p.evaluate(()=>document.body.dataset.state==='paused'))await p.locator('#resume').click();}
async function importFile(p,bytes,name='ROUND_TR.SC2'){
  const chooser=p.waitForEvent('filechooser');await p.locator('#open-file').click();await(await chooser).setFiles({name,mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});
  if(await p.locator('#replace-dialog').isVisible())await p.locator('#confirm-open').click();
  await p.waitForFunction(()=>document.body.dataset.state==='playing',{},{timeout:60000});
}
try{
  const p=await page();await boot(p);
  await p.locator('#screen').click({position:{x:5,y:5}});
  await p.waitForFunction(()=>{const a=window.__analyser;if(!a)return false;const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return data.some(v=>Math.abs(v)>.0001);},{},{timeout:15000});
  assert.equal(await p.evaluate(()=>__audio.state),'running');pass('Full original DOS 1.01 boots locally with 640×480 SVGA and audible Sound Blaster music');
  await click(p,320,207);
  await p.waitForFunction(()=>{const ctx=document.querySelector('#screen').getContext('2d'),a=ctx.getImageData(395,185,1,1).data,b=ctx.getImageData(228,200,1,1).data;return a[0]>225&&a[1]>225&&a[2]>225&&b[0]===186&&b[1]===186&&b[2]===186;},{},{timeout:20000});
  await click(p,320,185);await p.keyboard.press('End',{delay:100});for(let i=0;i<20;i++)await p.keyboard.press('Backspace',{delay:60});await p.keyboard.type('SC2TEST',{delay:90});await click(p,385,274);await click(p,320,294);
  await p.waitForFunction(()=>{const a=document.querySelector('#screen').getContext('2d').getImageData(100,100,1,1).data;return a[0]>220&&a[1]>220&&a[2]>220;},{},{timeout:15000});
  await click(p,73,90);await combo(p,'KeyP');
  const initial=await save(p,'initial'),initialCity=city(initial);assert.equal(initialCity.view.getUint32(12),2050);
  await menu(p,150,71);await p.waitForTimeout(1200);
  await p.evaluate(()=>{window.__effectPeak=0;window.__effectTimer=setInterval(()=>{const a=window.__analyser,d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);for(const v of d)window.__effectPeak=Math.max(window.__effectPeak,Math.abs(v));},16);});
  await click(p,21,105);for(const [x,y]of [[200,190],[330,190],[200,300],[390,300]])await drag(p,x,y,x+45,y+22.5);
  await click(p,21,129);for(const [x,y]of [[240,180],[380,190],[220,300],[400,330]])await drag(p,x,y,x+35,y+18);
  const built=await save(p,'built'),builtCity=city(built);
  await p.evaluate(()=>clearInterval(window.__effectTimer));assert.equal(builtCity.view.getUint32(0xffc),0,'Music must be disabled for the effects check');assert.equal(builtCity.view.getUint32(0xff8),1);assert.ok(await p.evaluate(()=>window.__effectPeak)>.0001,'Sound Blaster construction effects must be audible with music disabled');
  const repeated=await save(p,'repeated');assert.deepEqual(repeated,built,'Saving again without changes must still download the same complete city');
  assert.ok(builtCity.buildings.some(v=>v>=0x1d&&v<=0x2b),'Dragging must build roads in the original city data');
  assert.ok(builtCity.zones.some(v=>(v&15)>0),'Dragging must zone actual city tiles');
  assert.ok(!sameBytes(initialCity.buildings,builtCity.buildings));assert.ok(builtCity.view.getInt32(20)<20000,'Original construction costs must be deducted');
  const native=await p.evaluate(async()=>Array.from(await __dos.ci.fsReadFile('SC2000/SC2TEST.SC2')));assert.deepEqual(Array.from(built),native);
  pass('A new 2050 city supports mouse-drag road building and zoning; downloaded .SC2 matches the original save byte for byte');
  {const r=await p.locator('#screen').boundingBox();await p.mouse.move(r.x+r.width*21/640,r.y+r.height*105/480);await p.mouse.down();await p.waitForTimeout(400);await p.screenshot({path:`${output}/tool-menu.png`,fullPage:true});await p.mouse.up();}await click(p,350,250,{button:'right'});
  // Enable original auto-budget, then run the original simulation at Cheetah speed.
  {const r=await p.locator('#screen').boundingBox();await p.mouse.move(r.x+r.width*120/640,r.y+r.height*8/480);await p.mouse.down();await p.waitForTimeout(250);await p.screenshot({path:`${output}/options.png`,fullPage:true});await p.mouse.move(r.x+r.width*155/640,r.y+r.height*27/480);await p.waitForTimeout(150);await p.mouse.up();await p.waitForTimeout(300);}await combo(p,'Digit3');
  await p.waitForTimeout(16000);await combo(p,'KeyP');
  const evolved=await save(p,'evolved'),evolvedCity=city(evolved);
  assert.ok(evolvedCity.view.getUint32(16)>builtCity.view.getUint32(16)+300,'The original simulation must run for more than one game year');
  await p.screenshot({path:`${output}/built-city.png`,fullPage:true});pass('Original city simulation advances beyond a year, with working menus and multiple saved city states');
  await p.locator('#pause').click();await p.waitForTimeout(250);const frame=await p.locator('#screen').getAttribute('data-frame');await p.waitForTimeout(350);assert.equal(await p.locator('#screen').getAttribute('data-frame'),frame);assert.equal(await p.evaluate(()=>__dos.pressed.size+__dos.buttons.size),0);await p.locator('#resume').click();
  await p.locator('#fullscreen').click();await p.waitForFunction(()=>Boolean(document.fullscreenElement));await p.evaluate(()=>document.exitFullscreen());
  for(const [width,height] of [[1440,900],[1024,768],[800,600],[768,1024]]){await p.setViewportSize({width,height});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await p.setViewportSize({width:1280,height:900});await p.locator('#mute').click();assert.equal(await p.locator('#mute').textContent(),'Sound off');await p.locator('#mute').click();pass('Pause releases held input, fullscreen fits desktop/tablet layouts and sound can be muted');
  await p.reload();await p.waitForFunction(()=>document.querySelector('#boot').hidden);await observe(p);await p.locator('#cities-button').click();assert.ok(await p.locator('.city-row').count()>=1);await p.locator('.city-row').first().getByRole('button',{name:'Open',exact:true}).click();await p.waitForFunction(()=>document.body.dataset.state==='playing',{},{timeout:60000});
  await p.screenshot({path:`${output}/restored-local.png`,fullPage:true});
  const local=city(await save(p,'local-resaved'));
  assert.deepEqual(local.buildings,evolvedCity.buildings);assert.deepEqual(local.zones,evolvedCity.zones);pass('IndexedDB preserves the original city across page reload and Saved cities opens it again');
  await p.close();
  const imported=await page();await importFile(imported,evolved);
  await imported.screenshot({path:`${output}/imported-file.png`,fullPage:true});
  const importedFile=city(await save(imported,'imported-resaved'));
  assert.deepEqual(importedFile.buildings,evolvedCity.buildings);assert.deepEqual(importedFile.zones,evolvedCity.zones);assert.equal(importedFile.view.getUint32(12),2050);
  await imported.locator('#controls-button').click();await imported.locator('[data-close]').first().click();
  await imported.close();pass('A downloaded .SC2 opens in a fresh browser with no local saves and resaves the same roads, zones and founding year');
  const blocked=await page({blocked:true});await importFile(blocked,built,'NO_STORE.SC2');await blocked.locator('#cities-button').click();await blocked.locator('#cities-dialog').waitFor({state:'visible'});assert.match(await blocked.locator('#storage-note').textContent(),/unavailable/);const dl=blocked.waitForEvent('download');await blocked.locator('.city-row').first().getByRole('button',{name:'Download'}).click();await(await dl).saveAs(`${output}/no-storage.SC2`);assert.deepEqual(new Uint8Array(await readFile(`${output}/no-storage.SC2`)),built);await blocked.close();pass('Denied browser storage still allows playing, importing and downloading exact city files');
  const damaged=await page();await damaged.locator('#city-file').setInputFiles({name:'BAD.SC2',mimeType:'application/octet-stream',buffer:Buffer.from('not a city')});await damaged.waitForFunction(()=>document.querySelector('#status').classList.contains('error'));assert.equal(await damaged.evaluate(()=>document.body.dataset.state),'idle');
  await damaged.route('**/data/simcity2000-dos.zip?*',route=>route.fulfill({body:Buffer.from('damaged')}));await damaged.locator('#start').click();await damaged.waitForFunction(()=>document.body.dataset.state==='error');assert.match(await damaged.locator('#status').textContent(),/incomplete|verification/);await damaged.close();pass('Invalid city files and incomplete game downloads are rejected with a useful error');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(`${count} browser scenarios passed in ${engine.name()}; no external requests or page errors.`);
}catch(error){for(const context of contexts)for(const p of context.pages())console.log('DEBUG',await p.evaluate(()=>{const c=document.querySelector('#screen'),d=c.getContext('2d').getImageData(270,218,100,12).data;let h=2166136261;for(let i=0;i<d.length;i+=4)h=Math.imul(h^d[i],16777619)>>>0;return {state:document.body.dataset.state,status:document.querySelector('#status').textContent,hash:h};}).catch(()=>({})));for(const [i,context]of contexts.entries())for(const p of context.pages())await p.screenshot({path:`${output}/failure-${i}.png`,fullPage:true}).catch(()=>{});throw error;}
finally{for(const context of new Set(contexts))await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
