import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectCity,dosName,safeCityPath,sameBytes,MAX_CITY_BYTES} from '../cities.mjs';
import {DosSession} from '../session.mjs';
import {dosboxConfig,dosKey} from '../settings.mjs';
import {CityStore,readPreferences,writePreferences} from '../storage.mjs';
const city=new Uint8Array(await readFile(new URL('./fixtures/HAPPYLND.SC2',import.meta.url)));

test('real full-edition DOS cities validate, including older files without CNAM',()=>{
  const {chunks}=inspectCity(city);assert.equal(chunks.get('ALTM').length,32768);assert.ok(chunks.get('MISC').length>0);assert.equal(chunks.has('CNAM'),false);
});
test('truncated, oversized and other file formats are refused before reaching DOS',()=>{
  for(const input of [new Uint8Array(),city.subarray(0,city.length-1),new Uint8Array(MAX_CITY_BYTES+1),new TextEncoder().encode('not a city')])assert.throws(()=>inspectCity(input));
  const wrong=new Uint8Array(city);wrong[8]=65;assert.throws(()=>inspectCity(wrong));
  const broken=new Uint8Array(city);new DataView(broken.buffer).setUint32(16,0x7fffffff);assert.throws(()=>inspectCity(broken));
});
test('DOS names are bounded, path-safe and do not overwrite another imported city',()=>{
  assert.equal(dosName('../../My town 2026.sc2'),'MYTOWN20.SC2');assert.equal(dosName('city.sc2',['CITY.SC2']),'CITY1.SC2');assert.equal(dosName('ąę.sc2'),'CITY.SC2');
  assert.equal(safeCityPath('SC2000/SAVES/MY_CITY.SC2'),true);
  for(const path of ['../CITY.SC2','SC2000/../CITY.SC2','SC2000/SAVES/TOOLONGNAME.SC2','SC2000/CITY.EXE','SC2000/CITY.SC2\nexit'])assert.equal(safeCityPath(path),false);
});
test('mouse coordinates and both buttons map to DOS and release on pause or blur',()=>{
  const calls=[],s=new DosSession(null);s.ci={sendMouseMotion:(...v)=>calls.push(['move',...v]),sendMouseButton:(...v)=>calls.push(['button',...v]),sendMouseSync:()=>{},sendKeyEvent:(...v)=>calls.push(['key',...v]),pause:()=>{}};
  s.mouseMove(-.1,1.2);s.mouseButton(0,true);s.mouseButton(0,true);s.mouseButton(2,true);s.keyDown({code:'ShiftLeft'});s.pause();
  assert.deepEqual(calls,[['move',0,1],['button',0,true],['button',1,true],['key',340,true],['key',340,false],['button',0,false],['button',1,false]]);
  assert.equal(s.buttons.size,0);assert.equal(s.pressed.size,0);s.mouseMove(.5,.5);assert.equal(calls.length,7);
});
test('DOS configuration includes SVGA, adequate memory, sound and the original game',()=>{
  const config=dosboxConfig();for(const text of ['machine=svga_s3','memsize=16','sbtype=sb16','irq=7','ems=false','cd SC2000\nsc2000.exe'])assert.ok(config.includes(text));
  assert.doesNotMatch(config,/demo|megahit|ipxnet connect/i);assert.equal(dosKey('AltLeft'),342);assert.equal(dosKey('Home'),268);assert.equal(dosKey('End'),269);assert.equal(dosKey('Numpad1'),321);
});
test('city scanning skips partially written files and reads only existing safe city paths',async()=>{
  const s=new DosSession(null),calls=[];s.ci={fsTree:async()=>({name:'.',nodes:[{name:'SC2000',nodes:[{name:'SAVES',nodes:[{name:'GOOD.SC2',nodes:null},{name:'HALF.SC2',nodes:null}]},{name:'SC2000.EXE',nodes:null}]}]}),fsReadFile:async path=>{calls.push(path);return path.endsWith('GOOD.SC2')?city:city.subarray(0,200);}};
  const files=await s.cityFiles();assert.deepEqual(files.map(f=>f.path),['SC2000/SAVES/GOOD.SC2']);assert.equal(calls.length,2);
});
test('blocked browser storage preserves the current session and file export data',async()=>{
  const store=await new CityStore().open();assert.equal(store.durable,false);await store.put('SC2000/SAVES/TEST.SC2',city);
  assert.deepEqual(store.list()[0].bytes,city);assert.equal(sameBytes(store.list()[0].bytes,city),true);assert.deepEqual(readPreferences(),{muted:false});assert.doesNotThrow(()=>writePreferences({muted:true}));
  await assert.rejects(store.put('SC2000/../../TEST.SC2',city));assert.equal(store.list().length,1);
});
