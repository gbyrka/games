// SPDX-License-Identifier: GPL-2.0-or-later
import { DosSession } from './session.mjs';
import { readPreferences,writePreferences,readCheckpoint,writeCheckpoint,sameBytes } from './storage.mjs';
const $=id=>document.getElementById(id),canvas=$('screen'),prefs=readPreferences();
let session=null,state='idle',checkpoint=readCheckpoint(),saveTask=null,pollTimer=null,statusTimer=null,dialogWasPlaying=false;
$('sound-device').value=prefs.sound;
function status(text,error=false) {$('status').textContent=text;$('status').classList.toggle('error',error);clearTimeout(statusTimer);if(!error)statusTimer=setTimeout(()=>{$('status').textContent='';},8000);}
function render() {
  document.body.dataset.state=state;
  const ready=['playing','paused'].includes(state),paused=state==='paused';
  $('overlay').hidden=state==='playing';$('start').hidden=!['idle','error','ended'].includes(state);$('continue').hidden=!checkpoint||!['idle','error','ended'].includes(state);$('resume').hidden=!paused;
  $('overlay-title').textContent=state==='loading'?'Loading…':paused?'Paused':state==='ended'?'Game closed':state==='error'?'Unable to start':'POP';
  $('overlay-detail').textContent=state==='idle'?'Keyboard required':state==='loading'?'':paused?'':state==='ended'?'Start again to play.':state==='error'?'Reload the page to retry.':'';
  $('pause').disabled=!ready;$('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));
  $('save').disabled=!ready||Boolean(saveTask);$('load').disabled=!ready||!checkpoint||Boolean(saveTask);$('restart').disabled=!ready;
  $('mute').textContent=prefs.muted?'Sound off':'Sound on';$('mute').setAttribute('aria-pressed',String(!prefs.muted));
  $('settings-button').disabled=state==='loading';
}
function focusGame() {if(state==='playing')canvas.focus({preventScroll:true});}
function pause() {if(state!=='playing')return;session.pause();state='paused';render();}
function resume() {if(state!=='paused')return;session.resume();session.mute(prefs.muted);state='playing';render();focusGame();}
async function keepSave(announce=false) {
  if(!session?.ci||saveTask)return;
  const current=session;
  saveTask=(async()=>{
    const bytes=await current.saveFile();if(session!==current)return;
    if(!bytes?.length){if(announce)status('The original game can save on levels 3–13.');return;}
    if(!sameBytes(bytes,checkpoint?.bytes)){writeCheckpoint(bytes);checkpoint={bytes:new Uint8Array(bytes)};}
    if(announce)status('Checkpoint saved on this device.');
  })();render();
  try {await saveTask;}catch(error){status(error.message,true);}finally{saveTask=null;render();}
}
async function start(continueGame=false) {
  if(state==='loading')return;
  state='loading';render();status('');clearInterval(pollTimer);
  const previous=session;session=null;await previous?.close();
  const next=new DosSession(canvas,{onExit:()=>{if(session===next){state='ended';clearInterval(pollTimer);render();}},onError:message=>{if(session===next)status(message,true);}});session=next;
  try {
    await next.start(prefs.sound,checkpoint);
    if(session!==next)return;
    next.mute(prefs.muted);state='playing';render();focusGame();
    pollTimer=setInterval(()=>void keepSave(),10000);
    if(continueGame&&checkpoint){await new Promise(resolve=>setTimeout(resolve,800));if(session===next)await next.loadFile(checkpoint.bytes);}
    if(document.hidden)pause();
  }catch(error){if(session===next){void next.close();state='error';render();status(error.message,true);}}
}
async function save() {
  if(!session?.ci||saveTask)return;
  status('Saving checkpoint…');
  if(state==='paused')resume();
  await session.shortcut('G');await new Promise(resolve=>setTimeout(resolve,350));await keepSave(true);focusGame();
}
async function load() {if(!checkpoint||!session?.ci)return;await start(true);focusGame();}
function showDialog(id) {dialogWasPlaying=state==='playing';pause();$(id).showModal();}
function closeDialog(node) {node.close();if(dialogWasPlaying)resume();dialogWasPlaying=false;}
$('start').addEventListener('click',()=>void start());$('continue').addEventListener('click',()=>void start(true));$('resume').addEventListener('click',resume);
$('pause').addEventListener('click',()=>{if(state==='playing')pause();else resume();});
$('save').addEventListener('click',()=>void save());$('load').addEventListener('click',()=>void load());
$('restart').addEventListener('click',()=>showDialog('restart-dialog'));
$('confirm-restart').addEventListener('click',()=>{$('restart-dialog').close();dialogWasPlaying=false;void start();});
$('mute').addEventListener('click',()=>{prefs.muted=!prefs.muted;session?.mute(prefs.muted);writePreferences(prefs);render();focusGame();});
$('controls-button').addEventListener('click',()=>showDialog('controls-dialog'));$('settings-button').addEventListener('click',()=>showDialog('settings-dialog'));
$('sound-device').addEventListener('change',event=>{prefs.sound=event.target.value;writePreferences(prefs);if(session?.ci)status('Sound device will change when you restart.');});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeDialog(button.closest('dialog'))));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);}));
$('fullscreen').addEventListener('click',async()=>{
  try {if(document.fullscreenElement)await document.exitFullscreen();else await $('player').requestFullscreen();focusGame();}
  catch {status('Fullscreen is unavailable in this browser.');}
});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Exit fullscreen':'Fullscreen';});
canvas.addEventListener('pointerdown',()=>focusGame());canvas.addEventListener('contextmenu',event=>event.preventDefault());canvas.addEventListener('blur',()=>session?.releaseKeys());
document.addEventListener('keydown',event=>{if(document.activeElement===canvas&&state==='playing'&&session.keyDown(event))event.preventDefault();});
document.addEventListener('keyup',event=>{
  if(session?.keyUp(event)){
    event.preventDefault();
    if(event.code==='KeyG'&&event.ctrlKey)setTimeout(()=>void keepSave(true),400);
  }
});
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();void keepSave();}});
window.addEventListener('pagehide',()=>{clearInterval(pollTimer);session?.pause();void keepSave();void session?.close();});
render();
