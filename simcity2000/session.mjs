// SPDX-License-Identifier: GPL-2.0-or-later
import { dosboxConfig, dosKey, RELEASE, EMULATOR_VERSION } from './settings.mjs';
import { inspectCity, safeCityPath } from './cities.mjs';
let libraryTask, gameTask;
const asset = path => new URL(path,import.meta.url).href;
const versioned = path => asset(path) + `?v=${encodeURIComponent(RELEASE)}`;
export function loadEmulator() {
  if (!libraryTask) libraryTask=new Promise((resolve,reject)=>{
    const script=document.createElement('script'); script.src=asset('./vendor/emulators.js')+`?v=${EMULATOR_VERSION}`;script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error('Emulator download timed out. Reload to retry.'));},30000);
    script.onload=()=>{clearTimeout(timer);if(!globalThis.emulators?.version.startsWith(EMULATOR_VERSION))reject(new Error('Unexpected emulator version.'));else resolve(globalThis.emulators);};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('The emulator could not load. Reload to retry.'));};
    document.head.append(script);
  }).catch(error=>{libraryTask=null;throw error;});
  return libraryTask;
}
async function gameData() {
  if (!gameTask) gameTask=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
    try {
      const [response,manifestResponse]=await Promise.all([fetch(versioned('./data/simcity2000-dos.zip'),{signal:controller.signal}),fetch(versioned('./data/manifest.json'),{signal:controller.signal})]);
      if(!response.ok || !manifestResponse.ok)throw new Error('Game files could not load. Reload to retry.');
      const [buffer,manifest]=await Promise.all([response.arrayBuffer(),manifestResponse.json()]);
      if(buffer.byteLength!==manifest.bundle.bytes)throw new Error('Game data is incomplete. Reload to retry.');
      if(!globalThis.crypto?.subtle)throw new Error('Open this game over HTTPS or localhost.');
      const digest=await crypto.subtle.digest('SHA-256',buffer),hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(hash!==manifest.bundle.sha256)throw new Error('Game data failed verification. Reload to retry.');
      return new Uint8Array(buffer);
    } finally {clearTimeout(timer);}
  })().catch(error=>{gameTask=null;throw error;});
  return gameTask;
}
export class DosSession {
  constructor(canvas,{onExit=()=>{},onError=()=>{}}={}) {this.canvas=canvas;this.onExit=onExit;this.onError=onError;this.pressed=new Set();this.buttons=new Set();this.closed=false;this.paused=false;this.sequence=0;}
  async start(cities=[]) {
    const [emulators,data]=await Promise.all([loadEmulator(),gameData()]);
    if(this.closed)return;
    emulators.pathPrefix=asset('./vendor/');emulators.pathSuffix=`?v=${EMULATOR_VERSION}`;
    const init=[new Uint8Array(data)];
    for(const city of cities){if(!safeCityPath(city.path))throw new Error('Invalid city path.');inspectCity(city.bytes);init.push({path:city.path,contents:new Uint8Array(city.bytes)});}
    init.push(dosboxConfig());
    let timer;
    const boot=emulators.dosboxWorker(init,{audioWorklet:true});
    boot.then(ci=>{if(this.closed)void ci.exit();},()=>{});
    try {this.ci=await Promise.race([boot,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('The emulator did not start. Reload to retry.')),60000);})]);}
    finally {clearTimeout(timer);}
    if(this.closed)return;
    const ci=this.ci,ctx=this.canvas.getContext('2d',{alpha:false});let image=null;
    const resize=(width,height)=>{if(width>0&&height>0){this.canvas.width=width;this.canvas.height=height;image=ctx.createImageData(width,height);}};
    resize(ci.width(),ci.height());
    ci.events().onFrameSize(resize);
    ci.events().onFrame((rgb,rgba)=>{
      if(this.closed)return;
      if(!image || image.width!==ci.width() || image.height!==ci.height())resize(ci.width(),ci.height());
      if(!image)return;
      if(rgba)image.data.set(rgba);
      else if(rgb)for(let from=0,to=0;from<rgb.length;from+=3,to+=4){image.data[to]=rgb[from];image.data[to+1]=rgb[from+1];image.data[to+2]=rgb[from+2];image.data[to+3]=255;}
      else return;
      ctx.putImageData(image,0,0);this.canvas.dataset.frame=String(++this.sequence);
    });
    ci.events().onExit(()=>{if(!this.closed)this.onExit();});
    ci.events().onMessage((type,...args)=>{
      const message=args.map(String).join(' ');
      // DOSBox also labels routine sound-card diagnostics as errors.
      if(type==='panic'||(type==='error'&&/^\[(panic|worker)\]/i.test(message)))this.onError(message);
    });
    const deadline=performance.now()+45000;
    while(!this.closed) {
      const video=ci.width()===640&&ci.height()===480;
      if((await ci.getRunningProgram()).toUpperCase().includes('SC2000')&&video)break;
      if(performance.now()>deadline)throw new Error('The DOS game did not start. Reload to retry.');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
  }
  keyDown(event) {
    if(this.closed||this.paused||!this.ci||event.metaKey)return false;
    const key=dosKey(event.code);if(key===null)return false;
    if(!this.pressed.has(key)){this.pressed.add(key);this.ci.sendKeyEvent(key,true);}return true;
  }
  keyUp(event) {
    const key=dosKey(event.code);if(key===null || !this.pressed.has(key))return false;
    this.pressed.delete(key);this.ci?.sendKeyEvent(key,false);return true;
  }
  releaseKeys() {for(const key of this.pressed)this.ci?.sendKeyEvent(key,false);this.pressed.clear();}
  mouseMove(x,y) {
    if(this.closed||this.paused||!this.ci)return;
    this.ci.sendMouseMotion(Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y)));this.ci.sendMouseSync();
  }
  mouseButton(browserButton,pressed) {
    if(this.closed||!this.ci||(pressed&&this.paused))return;
    const button=({0:0,2:1,1:2})[browserButton];if(button===undefined)return;
    if(pressed===this.buttons.has(button))return;
    if(pressed)this.buttons.add(button);else this.buttons.delete(button);
    this.ci.sendMouseButton(button,pressed);this.ci.sendMouseSync();
  }
  releaseButtons() {for(const button of this.buttons)this.ci?.sendMouseButton(button,false);this.buttons.clear();this.ci?.sendMouseSync();}
  releaseInput() {this.releaseKeys();this.releaseButtons();}
  async shortcut(letter,modifier=342) {
    if(!this.ci||this.closed)return;
    this.releaseKeys();this.ci.sendKeyEvent(modifier,true);
    // Let the original DOS keyboard poll observe the modifier before the action key.
    await new Promise(resolve=>setTimeout(resolve,120));
    if(this.closed)return;
    this.ci.sendKeyEvent(letter.charCodeAt(0),true);
    await new Promise(resolve=>setTimeout(resolve,180));
    if(!this.closed){this.ci.sendKeyEvent(letter.charCodeAt(0),false);this.ci.sendKeyEvent(modifier,false);}
  }
  pause() {this.releaseInput();this.paused=true;this.ci?.pause();}
  resume() {this.paused=false;this.ci?.resume();}
  mute(value) {if(value)this.ci?.mute();else this.ci?.unmute();}
  async cityPaths() {
    if(!this.ci||this.closed)return [];
    const paths=[];
    function walk(node,prefix='') {
      if(node.nodes){for(const child of node.nodes)walk(child,node.name==='.'?'':prefix+node.name+'/');}
      else {const path=prefix+node.name;if(safeCityPath(path))paths.push(path);}
    }
    walk(await this.ci.fsTree());return paths;
  }
  async cityFiles() {
    const files=[];
    for(const path of await this.cityPaths()){
      const bytes=new Uint8Array(await this.ci.fsReadFile(path));
      try{inspectCity(bytes);files.push({path,bytes});}catch{/* A DOS write may still be in progress. */}
    }
    return files;
  }
  async finishSave() {
    if(!this.ci||this.closed||this.paused||this.canvas.width!==640||this.canvas.height!==480)return [];
    // Exact fingerprint of the fixed "Game Saved As:" heading in DOS 1.01.
    // The filename is below this crop. No other dialog is acknowledged.
    const pixels=this.canvas.getContext('2d').getImageData(270,218,100,12).data;
    let hash=2166136261;
    for(let i=0;i<pixels.length;i+=4)hash=Math.imul(hash^pixels[i],16777619)>>>0;
    if(hash!==876710467)return [];
    const pending=[];
    for(const path of await this.cityPaths()){
      const bytes=await this.ci.fsReadFile(path);
      // DOS leaves the FORM length zero until this confirmation is dismissed.
      if(bytes.length>12&&bytes[0]===70&&bytes[1]===79&&bytes[2]===82&&bytes[3]===77&&bytes.slice(4,8).every(v=>v===0))pending.push(path);
    }
    await this.clickAt(.5,.5);await new Promise(resolve=>setTimeout(resolve,300));
    const saved=[];
    for(const path of pending){const bytes=new Uint8Array(await this.ci.fsReadFile(path));try{inspectCity(bytes);saved.push({path,bytes});}catch{/* Retry on the next scan. */}}
    return saved;
  }
  async openCity(path) {
    if(!safeCityPath(path))throw new Error('Invalid city path.');
    const deadline=performance.now()+45000,ctx=this.canvas.getContext('2d');
    while(!this.closed){
      const title=[150,200,250,300].every(y=>{const p=ctx.getImageData(250,y,1,1).data;return p[0]>=150&&p[0]<=220&&p[0]===p[1]&&p[1]===p[2];});
      if(title)break;
      if(performance.now()>deadline)throw new Error('The city could not open. Use Start and File → Load City to retry.');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    await this.clickAt(.5,175/480);
    // The original Open dialog selects its filename field. Enter the absolute
    // DOS path, so opening does not depend on its previously browsed directory.
    await new Promise(resolve=>setTimeout(resolve,600));
    await this.clickAt(.5,138/480);await this.pressKey(269);for(let i=0;i<18;i++)await this.pressKey(259);
    await this.typeText('C:\\'+path.replaceAll('/','\\'));
    await this.clickAt(240/640,375/480);
    const loadedDeadline=performance.now()+45000;
    while(!this.closed){
      const loaded=[500,550,600].every(x=>{const p=ctx.getImageData(x,8,1,1).data;return p[0]>=140&&p[0]<=220&&p[0]===p[1]&&p[1]===p[2];});
      if(loaded)return;
      if(performance.now()>loadedDeadline)throw new Error('The original game could not load this city.');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
  }
  async clickAt(x,y) {
    this.mouseMove(x,y);await new Promise(resolve=>setTimeout(resolve,100));this.mouseButton(0,true);
    await new Promise(resolve=>setTimeout(resolve,100));this.mouseButton(0,false);
  }
  async pressKey(key) {
    if(this.closed||!this.ci)return;
    this.ci.sendKeyEvent(key,true);await new Promise(resolve=>setTimeout(resolve,70));
    if(!this.closed)this.ci.sendKeyEvent(key,false);
    await new Promise(resolve=>setTimeout(resolve,40));
  }
  async typeText(text) {
    for(const char of text.toUpperCase()) {
      if(this.closed)return;
      if(char===':'){this.ci.sendKeyEvent(340,true);await this.pressKey(59);this.ci.sendKeyEvent(340,false);}
      else if(char==='_'){this.ci.sendKeyEvent(340,true);await this.pressKey(45);this.ci.sendKeyEvent(340,false);}
      else await this.pressKey(char.charCodeAt(0));
    }
  }
  async close() {this.releaseInput();this.closed=true;await this.ci?.exit();this.ci=null;}
}
