/** Real DOSBox/WASM, original DOS binary, native keyboard and Web Audio. No production test hooks. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const engine=process.env.POP_ENGINE==='webkit'?webkit:chromium;
const root=new URL('../../',import.meta.url),output=process.env.SCREENSHOT_DIR??new URL('../test-results/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith('/games/')||pathname.includes('..'))return res.writeHead(404).end();
  const file=pathname.slice('/games/'.length)+(pathname.endsWith('/')?'index.html':'');
  try{const data=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':{mjs:'text/javascript',js:'text/javascript',json:'application/json',css:'text/css',wasm:'application/wasm',svg:'image/svg+xml',jpg:'image/jpeg',zip:'application/zip',txt:'text/plain'}[file.split('.').at(-1)]??'text/html'}).end(data);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/games/pop/`,browser=await engine.launch({headless:true}),contexts=[],errors=[],external=[];
let count=0;const pass=text=>console.log(`PASS ${++count}: ${text}`);
async function page({cheats=false,blockedStorage=false}={}){
  const context=await browser.newContext({viewport:{width:1280,height:900}});contexts.push(context);
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==new URL(base).origin&&!['blob:','data:'].includes(url.protocol)){external.push(url.href);return route.abort();}return route.continue();});
  await context.addInitScript(({blockedStorage})=>{
    window.__sceneBits=()=>{const c=document.querySelector('#screen'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data,bits=[];for(let y=0;y<15;y++)for(let x=0;x<32;x++){const at=(Math.floor((y+.5)*c.height*.75/15)*c.width+Math.floor((x+.5)*c.width/32))*4;bits.push(data[at]+data[at+1]+data[at+2]>30?1:0);}return bits;};
    if(blockedStorage)Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});
    const NativeAudio=window.AudioContext;
    window.AudioContext=class extends NativeAudio{constructor(...args){super(...args);window.__audio=this;}};
    const NativeNode=window.AudioWorkletNode;
    window.AudioWorkletNode=class extends NativeNode{constructor(context,...args){super(context,...args);const analyser=context.createAnalyser();analyser.fftSize=2048;this.connect(analyser);window.__analyser=analyser;}};
  },{blockedStorage});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base);await p.waitForFunction(()=>document.querySelector('#boot').hidden);
  assert.equal(await p.locator('script[src*="emulators.js"]').count(),0,'The emulator should load only when Start is chosen.');
  await p.evaluate(async({cheats})=>{
    const {DosSession,loadEmulator}=await import('./session.mjs');
    const start=DosSession.prototype.start;
    DosSession.prototype.start=async function(...args){window.__dos=this;return start.apply(this,args);};
    const emulators=await loadEmulator(),boot=emulators.dosboxWorker.bind(emulators);
    emulators.dosboxWorker=(init,options)=>{
      // Only the test instance enables the original binary's built-in level-skip mode.
      if(cheats)init=init.map(part=>typeof part==='string'?part.replace(/prince\.exe (adlib|stdsnd)/,'prince.exe megahit $1'):part);
      return boot(init,options);
    };
  },{cheats});
  return p;
}
async function boot(p,button='start'){
  await p.locator(`#${button}`).click();await p.waitForFunction(()=>document.body.dataset.state==='playing',{},{timeout:45000});
  await p.waitForFunction(()=>document.querySelector('#screen').width===640,{},{timeout:15000});
  assert.equal(await p.evaluate(()=>window.__dos.ci.getRunningProgram()),'PRINCE');
}
async function begin(p){
  await p.locator('#screen').focus();
  // The original title fade can ignore input. Wait for the red health bar,
  // rather than assuming a fixed boot duration reaches a playable level.
  let playing=false;
  for(let attempt=0;attempt<8;attempt++){
    await p.keyboard.press('Space',{delay:160});await p.waitForTimeout(800);
    playing=await p.evaluate(()=>{const c=document.querySelector('#screen'),data=c.getContext('2d').getImageData(0,c.height-18,80,18).data;let red=0;for(let i=0;i<data.length;i+=4)if(data[i]>150&&data[i+1]<80&&data[i+2]<80)red++;return red>10;});
    if(playing)break;
  }
  assert.equal(playing,true,'The original game must reach a playable level');await p.waitForTimeout(1000);
}
async function combo(p,modifier,key){await p.locator('#screen').focus();await p.keyboard.down(modifier);await p.waitForTimeout(120);await p.keyboard.press(key,{delay:200});await p.keyboard.up(modifier);}
async function active(p){if(await p.evaluate(()=>document.body.dataset.state==='paused'))await p.locator('#resume').click();await p.locator('#screen').focus();}
async function audible(p){await p.waitForFunction(()=>{const a=window.__analyser;if(!a)return false;const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return data.some(v=>Math.abs(v)>.0001);},{},{timeout:10000});}
async function avatar(p){return p.evaluate(()=>{const c=document.querySelector('#screen'),ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height).data;let sum=0,count=0;for(let y=Math.floor(c.height*.4);y<c.height*.94;y++)for(let x=0;x<c.width;x++){const at=(y*c.width+x)*4;if(data[at]>230&&data[at+1]>190&&data[at+2]>150){sum+=x;count++;}}return count?sum/count:null;});}
try{
  const p=await page();await boot(p);await p.locator('#screen').click();await audible(p);
  assert.equal(await p.evaluate(()=>window.__audio.state),'running');pass('Original DOS 1.0 boots from local data and renders real AdLib audio');
  await begin(p);const before=await avatar(p);assert.notEqual(before,null);
  await p.keyboard.down('ArrowRight');const movementDeadline=Date.now()+6000;let after=before;
  while(Date.now()<movementDeadline){after=await avatar(p);if(after!==null&&Math.abs(after-before)>8)break;await p.waitForTimeout(100);}
  await p.keyboard.up('ArrowRight');assert.notEqual(after,null);assert.ok(Math.abs(after-before)>8,`Native arrow keys must move the original character (${before} → ${after})`);
  await p.keyboard.down('Shift');await p.keyboard.down('ArrowLeft');await p.waitForTimeout(250);await p.locator('#pause').click();
  await p.waitForFunction(()=>document.body.dataset.state==='paused');assert.equal(await p.evaluate(()=>window.__dos.pressed.size),0);
  await p.waitForTimeout(250);const stopped=await p.locator('#screen').getAttribute('data-frame');await p.waitForTimeout(350);assert.equal(await p.locator('#screen').getAttribute('data-frame'),stopped);
  await p.locator('#resume').click();await p.waitForFunction(old=>Number(document.querySelector('#screen').dataset.frame)>Number(old),stopped);
  pass('Movement, modifier keys, releasing held controls, pause and resume use the actual DOS program');
  for(const [width,height] of [[1440,900],[1024,768],[800,600],[768,1024]]){
    await p.setViewportSize({width,height});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    const rect=await p.locator('#screen').boundingBox();assert.ok(rect.width<=width&&rect.height<=height);
  }
  await p.setViewportSize({width:1280,height:900});await p.screenshot({path:`${output}/level-1.png`,fullPage:true});
  await p.locator('#controls-button').click();assert.equal(await p.evaluate(()=>document.body.dataset.state),'paused');await p.locator('#controls-dialog [data-close]').click();assert.equal(await p.evaluate(()=>document.body.dataset.state),'playing');
  await p.locator('#mute').click();assert.equal(await p.locator('#mute').textContent(),'Sound off');await p.locator('#mute').click();
  await p.locator('#fullscreen').click();await p.waitForFunction(()=>Boolean(document.fullscreenElement));await p.evaluate(()=>document.exitFullscreen());await active(p);
  await p.locator('#settings-button').click();await p.locator('#sound-device').selectOption('speaker');await p.locator('#settings-dialog [data-close]').click();
  await p.locator('#restart').click();await p.locator('#confirm-restart').click();await p.waitForFunction(()=>document.body.dataset.state==='playing',{},{timeout:30000});
  assert.match(await p.evaluate(async()=>(await window.__dos.ci.config()).dosboxConf),/prince\.exe stdsnd/);await begin(p);await p.keyboard.press('ArrowLeft',{delay:600});await audible(p);
  pass('PC Speaker mode, fullscreen, settings, help and keyboard layouts work without a backend');
  await p.close();
  const levels=await page({cheats:true});await boot(levels);await begin(levels);
  // Level transitions have original fades/cutscenes that can ignore shortcuts.
  // Use actual DOS save creation as the observable condition for reaching level 3.
  for(let attempt=0;attempt<5;attempt++){
    await combo(levels,'Shift','KeyL');await levels.waitForTimeout(2500);await levels.locator('#save').click();
    await levels.waitForFunction(()=>!document.querySelector('#save').disabled&&!document.querySelector('#status').textContent.startsWith('Saving'),{},{timeout:5000});
    if(await levels.evaluate(async()=>Boolean(await window.__dos.saveFile())))break;
    await levels.waitForTimeout(1200);
  }
  await levels.waitForFunction(()=>document.querySelector('#status').textContent.includes('Checkpoint saved'),{},{timeout:10000});
  const saved=await levels.evaluate(async()=>Array.from(await window.__dos.ci.fsReadFile('PRINCE.SAV')));assert.equal(saved.length,8);assert.equal(saved[4]+saved[5]*256,3);
  const savedScene=await levels.evaluate(()=>window.__sceneBits());
  await levels.screenshot({path:`${output}/level-3-checkpoint.png`,fullPage:true});
  await levels.reload();await levels.waitForFunction(()=>document.querySelector('#boot').hidden);
  await levels.evaluate(async()=>{const {DosSession}=await import('./session.mjs');const start=DosSession.prototype.start;DosSession.prototype.start=async function(...args){window.__dos=this;return start.apply(this,args);};});
  await boot(levels,'continue');
  const sameScene=expected=>{const actual=window.__sceneBits();return actual.filter((bit,i)=>bit===expected[i]).length/actual.length>.95;};
  await levels.waitForFunction(sameScene,savedScene,{timeout:15000});
  assert.deepEqual(await levels.evaluate(async()=>Array.from(await window.__dos.ci.fsReadFile('PRINCE.SAV'))),saved);
  await levels.locator('#load').click();await levels.waitForFunction(()=>document.body.dataset.state==='playing',{},{timeout:30000});await levels.waitForFunction(sameScene,savedScene,{timeout:15000});
  await levels.screenshot({path:`${output}/continued-level-3.png`,fullPage:true});pass('The original level-3 checkpoint survives page reload and Continue restores the DOS save');
  await levels.close();
  const blocked=await page({blockedStorage:true});await boot(blocked);await begin(blocked);await blocked.locator('#settings-button').click();await blocked.locator('#sound-device').selectOption('speaker');await blocked.locator('#settings-dialog [data-close]').click();assert.equal(await blocked.evaluate(()=>document.body.dataset.state),'playing');
  await blocked.close();pass('Denied browser storage does not prevent playing or changing settings');
  const damaged=await page();await damaged.route('**/data/prince-dos.zip?*',route=>route.fulfill({contentType:'application/zip',body:Buffer.from('damaged')}));await damaged.locator('#start').click();await damaged.waitForFunction(()=>document.body.dataset.state==='error');assert.match(await damaged.locator('#status').textContent(),/incomplete|verification/);await damaged.close();pass('Incomplete game downloads fail safely with a visible retry message');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(`${count} browser scenarios passed in ${engine.name()}; no external requests or page errors.`);
}catch(error){for(const [i,context] of contexts.entries())for(const p of context.pages())await p.screenshot({path:`${output}/failure-${i}.png`,fullPage:true}).catch(()=>{});throw error;}
finally{for(const context of contexts)await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
