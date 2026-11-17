/** Reproduce the original CD installation in DOSBox. Development tool only. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const cache=resolve(process.argv[2]??'/tmp/sc2k-build'),root=new URL('../',import.meta.url);
const config=`[sdl]\nautolock=false\n[dosbox]\nmachine=svga_s3\nmemsize=32\n[cpu]\ncore=normal\ncycles=fixed 100000\n[render]\nscaler=none\n[midi]\nmpu401=none\n[sblaster]\nsbtype=sb16\nirq=7\n[dos]\nxms=true\nems=false\numb=true\n[autoexec]\n@echo off\nmount c .\nc:\ncd CD\ninstall.exe\n`;
const html=`<!doctype html><html><button id="boot">Install</button><canvas id="screen" width="640" height="480"></canvas><script src="./vendor/emulators.js"></script><script>
boot.onclick=async()=>{emulators.pathPrefix='./vendor/';const ci=window.ci=await emulators.dosboxWorker([new Uint8Array(await(await fetch('./install.zip')).arrayBuffer()),${JSON.stringify(config)}],{audioWorklet:true});const c=document.querySelector('canvas'),ctx=c.getContext('2d');let image;const resize=(w,h)=>{if(w>0&&h>0){c.width=w;c.height=h;image=ctx.createImageData(w,h);}};resize(ci.width(),ci.height());ci.events().onFrameSize(resize);ci.events().onFrame((rgb,rgba)=>{if(!image)return;if(rgba)image.data.set(rgba);else if(rgb)for(let i=0,j=0;i<rgb.length;i+=3,j+=4){image.data[j]=rgb[i];image.data[j+1]=rgb[i+1];image.data[j+2]=rgb[i+2];image.data[j+3]=255;}ctx.putImageData(image,0,0);});};</script></html>`;
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;let data,type;
  if(path==='/'){data=html;type='text/html';}else if(path==='/install.zip'){data=await readFile(cache+'/install.zip');type='application/zip';}else if(/^\/vendor\/[a-z.]+$/.test(path)){data=await readFile(new URL(path.slice(1),root));type=path.endsWith('.wasm')?'application/wasm':'text/javascript';}else return res.writeHead(404).end();res.writeHead(200,{'Content-Type':type}).end(data);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true}),p=await browser.newPage();
async function click(x,y){await p.evaluate(async({x,y})=>{ci.sendMouseMotion(x/640,y/480);ci.sendMouseSync();await new Promise(r=>setTimeout(r,150));ci.sendMouseButton(0,true);ci.sendMouseSync();await new Promise(r=>setTimeout(r,150));ci.sendMouseButton(0,false);ci.sendMouseSync();},{x,y});await p.waitForTimeout(650);}
async function waitFile(name,size){const deadline=Date.now()+300000;while(Date.now()<deadline){if(await p.evaluate(async({name,size})=>{let n=await ci.fsTree();for(const part of name.split('/'))n=n.nodes?.find(v=>v.name===part)??{};return n.size===size;},{name,size}))return;await p.waitForTimeout(750);}throw new Error('Installer timed out at '+name);}
try{
 await p.goto(`http://127.0.0.1:${server.address().port}/`);await p.locator('#boot').click();await p.waitForFunction(()=>Boolean(window.ci));await p.waitForTimeout(2000);
 await click(287,286);await click(287,311);await click(277,260);await click(260,302);await click(282,302);await click(295,280);
 console.log('Installing original audio drivers…');await waitFile('SC2000/SOUND/A32ARDG.DLL',16384);await p.waitForTimeout(1200);await click(320,271);await p.waitForTimeout(800);await click(167,250);await click(320,269);await p.waitForTimeout(800);await click(167,250);
 console.log('Installing original game, cities, scenarios and video drivers…');await waitFile('SC2000/SC2000.CFG',353);await p.waitForTimeout(1200);await click(367,413);await click(320,267);
 const tree=await p.evaluate(()=>ci.fsTree()),names=[];function walk(n,prefix=''){if(n.nodes){for(const child of n.nodes)walk(child,n.name==='.'?'':prefix+n.name+'/');}else if(prefix.startsWith('SC2000/'))names.push(prefix+n.name);}walk(tree);
 for(const name of names){const data=await p.evaluate(async name=>Array.from(await ci.fsReadFile(name)),name);const dest=cache+'/full/'+name;await mkdir(dirname(dest),{recursive:true});await writeFile(dest,Buffer.from(data));}
 console.log(`Exported ${names.length} original installer files to ${cache}/full. Run prepare.py --installed there to verify every byte.`);
}catch(error){await p.screenshot({path:cache+'/installer-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();await new Promise(r=>server.close(r));}
