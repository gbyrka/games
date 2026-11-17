// SPDX-License-Identifier: GPL-2.0-or-later
import { dosboxConfig, dosKey, RELEASE, EMULATOR_VERSION } from './settings.mjs';
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
      const [response,manifestResponse]=await Promise.all([fetch(versioned('./data/prince-dos.zip'),{signal:controller.signal}),fetch(versioned('./data/manifest.json'),{signal:controller.signal})]);
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
  constructor(canvas,{onExit=()=>{},onError=()=>{}}={}) {this.canvas=canvas;this.onExit=onExit;this.onError=onError;this.pressed=new Set();this.closed=false;this.paused=false;this.sequence=0;}
  async start(sound,checkpoint=null) {
    const [emulators,data]=await Promise.all([loadEmulator(),gameData()]);
    if(this.closed)return;
    emulators.pathPrefix=asset('./vendor/');emulators.pathSuffix=`?v=${EMULATOR_VERSION}`;
    const init=[new Uint8Array(data)];
    if(checkpoint)init.push({path:'PRINCE.SAV',contents:new Uint8Array(checkpoint.bytes)});
    init.push(dosboxConfig(sound));
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
    const deadline=performance.now()+20000;
    while(!this.closed) {
      const video=(ci.width()===320&&ci.height()===200)||(ci.width()===640&&ci.height()===400);
      if((await ci.getRunningProgram()).toUpperCase().includes('PRINCE')&&video)break;
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
  async shortcut(letter) {
    if(!this.ci||this.closed)return;
    this.releaseKeys();this.ci.sendKeyEvent(341,true);
    // Let the original DOS keyboard poll observe Ctrl before the action key.
    await new Promise(resolve=>setTimeout(resolve,120));
    if(this.closed)return;
    this.ci.sendKeyEvent(letter.charCodeAt(0),true);
    await new Promise(resolve=>setTimeout(resolve,180));
    if(!this.closed){this.ci.sendKeyEvent(letter.charCodeAt(0),false);this.ci.sendKeyEvent(341,false);}
  }
  pause() {this.releaseKeys();this.paused=true;this.ci?.pause();}
  resume() {this.paused=false;this.ci?.resume();}
  mute(value) {if(value)this.ci?.mute();else this.ci?.unmute();}
  async saveFile() {
    if(!this.ci||this.closed)return null;
    // This backend throws inside its worker when fsReadFile targets a missing
    // file, so check the directory before the first in-game save exists.
    try {
      const tree=await this.ci.fsTree(),file=tree.nodes?.find(node=>node.name.toUpperCase()==='PRINCE.SAV');
      return file?await this.ci.fsReadFile(file.name):null;
    }catch{return null;}
  }
  async loadFile(bytes) {await this.ci.fsWriteFile('PRINCE.SAV',new Uint8Array(bytes));await this.shortcut('L');}
  async close() {this.closed=true;this.releaseKeys();await this.ci?.exit();this.ci=null;}
}
