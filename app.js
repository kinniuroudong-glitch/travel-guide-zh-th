'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const key='travel-guide-unified-v1';let pref={};try{pref=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
let books=[],audioMap={},book,items=[],marks=new Set(pref.marks||[]),onlySaved=false,scale=pref.scale||1,rate=pref.rate||1;
let directoryClosed=new Set(pref.directoryClosed||[]);
const sound=new Audio();sound.preload='metadata';sound.id='guideAudio';sound.hidden=true;document.body.append(sound);let queue=[],pos=-1,limit=null,activeId=null,paragraph=null,raf=0;
function save(){try{localStorage.setItem(key,JSON.stringify({directoryHidden:document.body.classList.contains('directory-hidden'),directoryClosed:[...directoryClosed],book:book?.id,marks:[...marks],scale,rate,lang:document.body.dataset.lang,length:document.body.dataset.length,dark:document.body.classList.contains('dark')}))}catch(e){}}
function toast(t){$('#toast').textContent=t;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2000)}
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function clips(i){return audioMap.files.filter(x=>x.chapter===i+8).sort((a,b)=>a.part-b.part)}
const time=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
let switchToken=0;async function setBook(id){const token=++switchToken;stop();const next=books.find(x=>x.id===id)||books[0];$('#reader').innerHTML='<div class="empty">正在打开…</div>';try{if(!next.items){const response=await fetch(next.src);if(!response.ok)throw Error('load');next.items=await response.json();next.items.forEach(x=>{const el=document.createElement('div');el.innerHTML=x.body;x.thai=[...el.querySelectorAll('.th')].map(p=>p.textContent).join('\n\n');x.search=el.textContent.toLowerCase()})}if(token!==switchToken)return;book=next;items=book.items;}catch(e){if(token===switchToken)$('#reader').innerHTML='<div class="empty">内容加载失败，请刷新页面</div>';return;}$('#search').value='';onlySaved=false;$('#saved').setAttribute('aria-pressed','false');$('#books').innerHTML=books.map(b=>`<button data-book="${b.id}" aria-pressed="${b===book}">${esc(b.name)}</button>`).join('');$('#group').innerHTML='<option value="">全部分类</option>'+[...new Set(items.map(x=>x.group))].map(x=>`<option>${esc(x)}</option>`).join('');$('#rateLabel').hidden=book.id!=='jiangnan';$('#continuous').hidden=book.id!=='jiangnan';render();save();window.scrollTo(0,0)}
function render(){const q=$('#search').value.trim().toLowerCase(),g=$('#group').value;const shown=items.filter(x=>(!q||(x.title+' '+x.search).toLowerCase().includes(q))&&(!g||x.group===g)&&(!onlySaved||marks.has(x.id)));$('#reader').innerHTML=shown.map((x,n)=>{let controls='';if(x.audio!==undefined){const duration=clips(x.audio).reduce((s,x)=>s+x.duration,0);controls=`<button data-play="${x.id}" aria-label="播放本节泰语">▷ 播放</button><input class="seek" type="range" min="0" max="${duration}" step=".1" value="0" data-seek="${x.id}" aria-label="${esc(x.title)}播放进度"><span class="time" data-time="${x.id}">0:00 / ${time(duration)}</span>`}return `<details class="card" id="${x.id}" ${book.id==='jiangnan'?'open':''}><summary><span class="number">${String(items.indexOf(x)+1).padStart(2,'0')}</span><h2>${esc(x.title)}</h2></summary><div class="body"><div class="actions"><button data-copy="${x.id}">复制泰语</button><button data-mark="${x.id}" aria-pressed="${marks.has(x.id)}">${marks.has(x.id)?'★ 备讲':'☆ 备讲'}</button>${controls}</div>${x.body}</div></details>`}).join('')||'<div class="empty">没有匹配内容</div>';decorateParagraphs();$$('.body').forEach(b=>[...b.children].filter(x=>x.classList.contains('pair')).slice(2).forEach(x=>x.classList.add('short-hidden')));const groups=[...new Set(shown.map(x=>x.group))];$('#directory').innerHTML=groups.map(g=>{const groupKey=book.id+':'+g;return `<details class="directory-group" data-directory-group="${esc(groupKey)}" ${directoryClosed.has(groupKey)?'':'open'}><summary>${esc(g)}</summary>${shown.filter(x=>x.group===g).map(x=>`<button data-jump="${x.id}">${esc(x.title)}</button>`).join('')}</details>`}).join('');sync()}
function decorateParagraphs(){
 $$('.body .th').forEach(th=>{
  let pair=th.closest('.pair');
  if(!pair){pair=document.createElement('div');pair.className='pair';th.before(pair);const next=th.nextElementSibling;pair.append(th);if(next?.classList.contains('zh'))pair.append(next)}
  const b=document.createElement('button');b.className='guide-translate';b.textContent='译';b.dataset.guideTranslate='';b.dataset.guideText=th.textContent.trim();b.dataset.guideTitle=pair.closest('.card').querySelector('h2').textContent;b.setAttribute('aria-label','在 GPT 侧边栏逐字翻译本段');b.title='侧栏逐字翻译';pair.append(b);
 });
}
document.addEventListener('guide-translation-result',e=>{if(e.detail?.error)toast(e.detail.error)});
function stop(){cancelAnimationFrame(raf);sound.pause();queue=[];pos=-1;limit=null;activeId=null;paragraph=null;$('#player').hidden=true;sync()}
function startQueue(list,start=0,end=null,p=null){stop();if(!list.length)return;queue=list;limit=end;paragraph=p;load(0,start)}
function load(index,start=0,play=true){pos=index;const f=queue[pos];if(!f){stop();return}activeId='jn-'+(f.chapter-8);sound.src=f.url;sound.currentTime=start;sound.playbackRate=rate;sound.defaultPlaybackRate=rate;sound.preservesPitch=true;$('#player').hidden=false;$('#playingTitle').textContent=books[0].items.find(x=>x.id===activeId)?.title||'';if(play)sound.play().catch(()=>toast('请点击继续播放'));sync()}
function toggle(){if(!queue.length)return;if(sound.paused)sound.play().catch(()=>toast('音频无法播放，请重试'));else sound.pause();sync()}
function playItem(id){const x=items.find(x=>x.id===id);if(!x||x.audio===undefined)return;if(activeId===id&&paragraph===null){toggle();return}startQueue(clips(x.audio))}
function playParagraph(id,j){const x=items.find(x=>x.id===id);if(!x||x.audio===undefined)return;const a=audioMap.paragraphs.find(p=>p.i===x.audio&&p.j===j);if(!a)return;const p=id+':'+j;if(paragraph===p){toggle();return}startQueue([audioMap.files.find(f=>f.file===a.file)],a.start,a.end,p)}
function sync(){ $$('[data-play]').forEach(b=>b.textContent=b.dataset.play===activeId?(sound.paused?'▷ 继续':'Ⅱ 暂停'):'▷ 播放');$$('.current').forEach(x=>x.classList.remove('current'));if(!queue.length)return;$('#pause').textContent=sound.paused?'▷':'Ⅱ';$('#pause').setAttribute('aria-label',sound.paused?'继续朗读':'暂停朗读');const f=queue[pos],i=f.chapter-8,all=clips(i),elapsed=all.slice(0,all.findIndex(x=>x.file===f.file)).reduce((s,x)=>s+x.duration,0)+sound.currentTime;const seek=$(`[data-seek="${activeId}"]`),label=$(`[data-time="${activeId}"]`);if(seek)seek.value=elapsed;if(label)label.textContent=time(elapsed)+' / '+time(all.reduce((s,x)=>s+x.duration,0));const match=audioMap.paragraphs.find(p=>p.file===f.file&&sound.currentTime>=p.start&&sound.currentTime<p.end);if(match)document.getElementById(activeId)?.querySelector(`[data-pair="${match.j}"]`)?.classList.add('current')}
function tick(){cancelAnimationFrame(raf);if(sound.paused)return;if(limit!==null&&sound.currentTime>=limit){stop();return}sync();raf=requestAnimationFrame(tick)}
function seekItem(id,seconds){const x=items.find(x=>x.id===id);if(!x||x.audio===undefined)return;const list=clips(x.audio);let left=seconds,idx=0;while(idx<list.length-1&&left>=list[idx].duration){left-=list[idx++].duration}const paused=sound.paused;stop();queue=list;load(idx,left,!paused)}
function seekRelative(delta){
 if(!queue.length)return;
 const paused=sound.paused;let index=pos,target=sound.currentTime+delta;
 while(target<0&&index>0){index--;target+=queue[index].duration}
 while(index<queue.length-1&&target>=queue[index].duration){target-=queue[index].duration;index++}
 const max=limit!==null?limit:queue[index].duration;
 target=Math.max(0,Math.min(target,Math.max(0,max-.05)));
 if(index===pos){sound.currentTime=target;sync()}else load(index,target,!paused);
}
function repeatLine(){
 if(!queue.length)return;
 const f=queue[pos],t=sound.currentTime;
 const lines=(audioMap.lines||[]).filter(x=>x.file===f.file);
 const line=lines.find(x=>t>=x.start&&t<x.end);
 const p=audioMap.paragraphs.find(x=>x.file===f.file&&t>=x.start&&t<x.end);
 sound.currentTime=line?.start??p?.start??0;
 sound.play().catch(()=>toast('请点击继续播放'));sync();
}
let lastSpace=0;
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
 if(e.target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
 if(['+','=','-','_'].includes(e.key)){e.preventDefault();setScale(scale+(['+','='].includes(e.key)?.1:-.1));return}
 if(e.shiftKey)return;
 if(e.key===' '){e.preventDefault();const now=Date.now();if(lastSpace&&now-lastSpace<450){$('#theme').click();lastSpace=0}else lastSpace=now;return}
 lastSpace=0;
 if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const options=[...$('#rate').options].map(o=>Number(o.value));const next=e.key==='ArrowUp'?options.find(v=>v>rate+.001):options.slice().reverse().find(v=>v<rate-.001);if(next!==undefined)setRate(next);return}
 if(!queue.length)return;
 if(['r','R'].includes(e.key)){e.preventDefault();repeatLine();return}
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();seekRelative(e.key==='ArrowLeft'?-3:3)}
});

function setRate(v){v=Number(v);if(!Number.isFinite(v)||v<.5||v>2)return;rate=v;sound.playbackRate=v;sound.defaultPlaybackRate=v;sound.preservesPitch=true;$('#rate').value=String(v);save()}
sound.addEventListener('ended',()=>{if(limit!==null){stop();return}if(pos+1<queue.length)load(pos+1);else stop()});sound.addEventListener('play',tick);sound.addEventListener('pause',()=>cancelAnimationFrame(raf));['timeupdate','play','pause','loadedmetadata'].forEach(e=>sound.addEventListener(e,sync));sound.addEventListener('error',()=>{stop();toast('音频加载失败，请重试')});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-guide-translate')){if(document.documentElement.dataset.guideAssistant!=='ready')toast('请更新随页助手并刷新页面');return}if(b.dataset.book){setBook(b.dataset.book);return}if(b.dataset.jump){const c=document.getElementById(b.dataset.jump);if(c){c.open=true;c.scrollIntoView({behavior:'smooth',block:'start'})}$('#directory').classList.remove('show');return}if(b.dataset.copy){const x=items.find(x=>x.id===b.dataset.copy);try{await navigator.clipboard.writeText(x.thai);toast('已复制')}catch(e){toast('复制失败，请选择文字复制')}return}if(b.dataset.mark){const id=b.dataset.mark;marks.has(id)?marks.delete(id):marks.add(id);save();if(onlySaved)render();else{b.setAttribute('aria-pressed',marks.has(id));b.textContent=marks.has(id)?'★ 备讲':'☆ 备讲'}return}if(b.dataset.play){playItem(b.dataset.play);return}if(b.dataset.paragraph!==undefined){playParagraph(b.closest('.card').id,+b.dataset.paragraph)}});
document.addEventListener('toggle',e=>{const d=e.target;if(!d.matches?.('.directory-group'))return;const k=d.dataset.directoryGroup;d.open?directoryClosed.delete(k):directoryClosed.add(k);save()},true);
document.addEventListener('change',e=>{if(e.target.dataset.seek)seekItem(e.target.dataset.seek,+e.target.value)});
$('#search').addEventListener('input',()=>{stop();render()});$('#group').onchange=()=>{stop();render()};$('#saved').onclick=()=>{onlySaved=!onlySaved;$('#saved').setAttribute('aria-pressed',onlySaved);stop();render()};$('#language').onchange=e=>{document.body.dataset.lang=e.target.value;save()};$('#length').onchange=e=>{document.body.dataset.length=e.target.value;save()};$('#expand').onclick=()=>$$('.card').forEach(x=>x.open=true);$('#collapse').onclick=()=>$$('.card').forEach(x=>x.open=false);$('#menu').onclick=()=>{if(window.matchMedia('(max-width:720px)').matches){const open=$('#directory').classList.toggle('show');$('#menu').setAttribute('aria-expanded',open)}else{const closed=document.body.classList.toggle('directory-hidden');$('#menu').setAttribute('aria-expanded',!closed);save()}};document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#directory').classList.remove('show')});document.addEventListener('click',e=>{if($('#directory').classList.contains('show')&&!e.target.closest('aside')&&!e.target.closest('#menu'))$('#directory').classList.remove('show')});
function setScale(n){scale=Math.max(.8,Math.min(1.4,n));document.documentElement.style.setProperty('--scale',scale);save()}$('#smaller').onclick=()=>setScale(scale-.1);$('#larger').onclick=()=>setScale(scale+.1);$('#theme').onclick=()=>{document.body.classList.toggle('dark');save()};$('#rate').onchange=e=>setRate(e.target.value);$('#pause').onclick=toggle;$('#stop').onclick=stop;$('#continuous').onclick=()=>{const ids=new Set($$('.card').map(x=>x.id));startQueue(books[0].items.filter(x=>ids.has(x.id)).flatMap(x=>clips(x.audio)))};
async function init(){try{const responses=await Promise.all([fetch('content.json'),fetch('audio-map.json')]);if(responses.some(r=>!r.ok))throw Error('load');[books,audioMap]=await Promise.all(responses.map(r=>r.json()));document.body.classList.toggle('dark',!!pref.dark);document.body.classList.toggle('directory-hidden',!!pref.directoryHidden);$('#menu').setAttribute('aria-expanded',!pref.directoryHidden);document.body.dataset.lang=pref.lang||'both';$('#language').value=document.body.dataset.lang;document.body.dataset.length=pref.length||'full';$('#length').value=document.body.dataset.length;setScale(scale);setRate(rate);setBook(pref.book||'jiangnan')}catch(e){$('#reader').innerHTML='<div class="empty">内容加载失败，请刷新页面</div>'}}
init();
