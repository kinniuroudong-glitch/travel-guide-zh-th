const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements=new Map(),listeners={};function element(s){if(!elements.has(s))elements.set(s,{hidden:true,value:'',textContent:'',classList:{contains:()=>false,remove(){},toggle(){}},setAttribute(){},addEventListener(){},style:{setProperty(){}},click(){this.onclick?.()},options:[.5,.75,1,1.25,1.5,1.75,2].map(value=>({value:String(value)})),matches:()=>false});return elements.get(s)}
class Audio {constructor(){this.paused=true;this.currentTime=0}addEventListener(){}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}}
const ctx={console,Audio,localStorage:{getItem:()=>null,setItem(){}},document:{querySelector:element,querySelectorAll:()=>[],body:{append(){},dataset:{},classList:{contains:()=>false}},documentElement:element('html'),getElementById:()=>null,addEventListener:(n,f)=>{(listeners[n]??=[]).push(f)}},cancelAnimationFrame(){},requestAnimationFrame(){},clearTimeout,setTimeout,fetch:()=>new Promise(()=>{}),window:{scrollTo(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`audioMap={files:[{file:'a',chapter:8,duration:10,url:'a'},{file:'b',chapter:8,duration:10,url:'b'}],paragraphs:[{file:'a',start:0,end:10}],lines:[{file:'a',start:0,end:4},{file:'a',start:4,end:10}]};books=[{items:[]}];queue=audioMap.files;pos=0;activeId='jn-0';sound.currentTime=5;sound.paused=false;`);
function key(k,input=false){const e={key:k,target:{closest:()=>input?{}:null},preventDefault(){this.prevented=true}};for(const f of listeners.keydown)f(e);return e}
assert(key('ArrowLeft').prevented);assert.equal(run('sound.currentTime'),2);key('ArrowRight');assert.equal(run('sound.currentTime'),5);key('ArrowDown');assert.equal(run('rate'),.75);assert.equal(run('sound.currentTime'),5);key('ArrowUp');assert.equal(run('rate'),1);key('r');assert.equal(run('sound.currentTime'),4);
key('ArrowLeft',true);assert.equal(run('sound.currentTime'),4);
run('sound.currentTime=9');key('ArrowRight');assert.equal(run('pos'),1);assert.equal(run('sound.currentTime'),2);key('ArrowLeft');assert.equal(run('pos'),0);assert.equal(run('sound.currentTime'),9);
run('pos=0;sound.currentTime=1');key('ArrowLeft');assert.equal(run('sound.currentTime'),0);
key('+');assert(Math.abs(run('scale')-1.1)<.001);key('-');assert(Math.abs(run('scale')-1)<.001);key('+',true);assert.equal(run('scale'),1);run('let themes=0; document.querySelector("#theme").onclick=()=>themes++');key(' ');assert.equal(run('themes'),0);key(' ');assert.equal(run('themes'),1);key(' ',true);assert.equal(run('themes'),1);
console.log('Passed: font, speed, double-space theme, ±3 seconds, sentence replay, editing guard, cross-file seek, start clamp');
const data=JSON.parse(fs.readFileSync('audio-map.json','utf8'));
assert(data.lines.length>300);for(const line of data.lines){assert(line.start>=0&&line.end>line.start);assert(data.files.some(f=>f.file===line.file&&f.duration>=line.end))}
const html=fs.readFileSync('index.html','utf8');assert(!html.includes('body[data-lang=zh] .paragraph-play'));console.log('Passed: spoken-line boundaries and Chinese playback visibility');
