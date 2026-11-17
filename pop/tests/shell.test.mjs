import test from 'node:test';
import assert from 'node:assert/strict';
import { dosKey,dosboxConfig } from '../settings.mjs';
import { readCheckpoint,writeCheckpoint,readPreferences,writePreferences,sameBytes,SAVE_KEY } from '../storage.mjs';
import { DosSession } from '../session.mjs';
const storage = () => {const items=new Map();return {getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value)};};
test('DOS key codes retain arrows, both modifiers, keypad and original shortcuts',()=>{
  assert.deepEqual(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].map(dosKey),[263,265,262,264]);
  assert.deepEqual(['ShiftLeft','ShiftRight','ControlLeft','ControlRight','KeyG','KeyL','Enter','Space'].map(dosKey),[340,344,341,345,71,76,257,32]);
  assert.equal(dosKey('Numpad1'),321);assert.equal(dosKey('NumpadEnter'),335);assert.equal(dosKey('Unidentified'),null);
});
test('held controls release when focus is lost and repeated keydown does not retrigger',()=>{
  const events=[],session=new DosSession(null);session.ci={sendKeyEvent:(...args)=>events.push(args)};
  const left={code:'ArrowLeft',metaKey:false};session.keyDown(left);session.keyDown(left);session.keyDown({code:'ShiftRight'});session.releaseKeys();
  assert.deepEqual(events,[[263,true],[344,true],[263,false],[344,false]]);assert.equal(session.pressed.size,0);assert.equal(session.keyUp(left),false);
});
test('DOS configuration chooses only supported sound devices and always launches the full game',()=>{
  assert.match(dosboxConfig('adlib'),/prince\.exe adlib\n/);assert.match(dosboxConfig('speaker'),/prince\.exe stdsnd\n/);
  assert.match(dosboxConfig(),/cycles=fixed 3000/);assert.doesNotMatch(dosboxConfig(),/megahit|demo|net start/i);
  assert.throws(()=>dosboxConfig('adlib\nmalicious.exe'));
});
test('checkpoint round-trip preserves every byte and rejects invalid or oversized saves',()=>{
  const store=storage(),bytes=Uint8Array.from([59,0,200,0,3,0,3,0]);writeCheckpoint(bytes,store);
  assert.deepEqual(readCheckpoint(store).bytes,bytes);assert.equal(sameBytes(bytes,readCheckpoint(store).bytes),true);assert.equal(sameBytes(null,null),false);
  for(const payload of ['{}','broken',JSON.stringify({version:1,bytes:'!!!'}),JSON.stringify({version:2,bytes:'YQ=='})]){store.setItem(SAVE_KEY,payload);assert.equal(readCheckpoint(store),null);}
  assert.throws(()=>writeCheckpoint(new Uint8Array(9000),store));
});
test('blocked storage and corrupt preferences do not prevent play',()=>{
  const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  assert.equal(readCheckpoint(blocked),null);assert.deepEqual(readPreferences(blocked),{sound:'adlib',muted:false});
  assert.doesNotThrow(()=>writePreferences({sound:'speaker',muted:true},blocked));assert.throws(()=>writeCheckpoint(Uint8Array.of(59,0,200,0,3,0,3,0),blocked),/cannot save/);
  const store=storage();writePreferences({sound:'speaker',muted:true},store);assert.deepEqual(readPreferences(store),{sound:'speaker',muted:true});
});
