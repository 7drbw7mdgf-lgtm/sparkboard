'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const M=BoardModel,uid=()=>crypto.randomUUID(),colors=['#f8df87','#dce7cc','#edcbbd','#e8ddf1','#cde4e7','#ffffff'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={select:'<path d="m5 3 14 10-7 1-4 7Z"/>',hand:'<path d="M8 11V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-3l2 2"/>',sticky:'<path d="M4 4h16v11l-5 5H4Z M15 20v-5h5"/>',text:'<path d="M4 5h16M12 5v15M8 20h8"/>',shape:'<rect x="3" y="5" width="18" height="14" rx="2"/>',circle:'<circle cx="12" cy="12" r="9"/>',triangle:'<path d="m12 3 10 18H2Z"/>',diamond:'<path d="m12 2 10 10-10 10L2 12Z"/>',hexagon:'<path d="m7 3 10 0 5 9-5 9H7l-5-9Z"/>',star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',arrow:'<path d="M2 8h12V3l8 9-8 9v-5H2Z"/>',bubble:'<path d="M4 3h16a2 2 0 0 1 2 2v12H10l-6 5v-5H2V5a2 2 0 0 1 2-2Z"/>',frame:'<path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/>',connector:'<path d="M4 19 20 4m-7 0h7v7"/>',pen:'<path d="m5 16-1 5 5-1L21 8l-4-4ZM14 7l4 4"/>',media:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>',link:'<path d="m10 14 4-4M9 16l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0m0 0 2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-5 0"/>'};
const shapeNames={shape:'Rectangle',circle:'Circle',triangle:'Triangle',diamond:'Diamond',hexagon:'Hexagon',star:'Star',arrow:'Arrow',bubble:'Speech bubble',frame:'Frame'};
const labels={select:'Select · V',hand:'Pan · H',sticky:'Sticky note · N',text:'Text · T',connector:'Connector · C',pen:'Draw · P',media:'Images & PDFs',link:'Link card · L'};
const svgIcon=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[k]}</svg>`;
let saveRevision=0;
let boards=[],board,db,saveChain=Promise.resolve(),tool='select',selected=new Set(),view={x:0,y:0,z:1},drag=null,space=false,editing=null,history=[],future=[],connectorStart=null,clipboard=[],inspectorOpen=false,scenePanelOpen=false,lastClick={id:null,time:0},toastTimer;
const node=(type,x,y,w,h,text,color,extra={})=>({id:uid(),type,x,y,w,h,text,color,...extra});
function sample(kind='brainstorm'){
if(kind==='studio')return studioSample();
if(kind==='blank')return [];
if(kind==='retro')return [node('text',180,100,800,65,'A little reflection. A better next sprint.','#29352a'),...['What went well','What could be better','What we’ll try next'].flatMap((t,i)=>[node('frame',180+i*300,220,275,420,t.toUpperCase(),'transparent'),node('sticky',215+i*300,290,200,170,['Celebrate a small win','Find one friction point','One experiment for next week'][i],colors[i])])];
if(kind==='mindmap'){let c=node('shape',470,300,230,120,'Your big idea',colors[1]),ns=[node('sticky',180,130,190,155,'Who is it for?',colors[0]),node('sticky',800,130,190,155,'Why does it matter?',colors[3]),node('sticky',180,490,190,155,'What could it become?',colors[2]),node('sticky',800,490,190,155,'What’s the first step?',colors[4])];return[c,...ns,...ns.map(n=>({id:uid(),type:'connector',from:c.id,to:n.id}))]}
return [node('text',180,95,800,60,'A space for what’s next.','#29352a'),node('text',184,153,800,40,'No perfect ideas needed. Just a place to start.','#919986',{fontSize:14,fontWeight:400}),node('frame',180,240,290,470,'01  /  THE OPPORTUNITY','transparent'),node('frame',505,240,290,470,'02  /  THE POSSIBILITIES','transparent'),node('frame',830,240,290,470,'03  /  THE NEXT STEP','transparent'),node('sticky',222,305,205,180,'What if getting started\nfelt a little easier?',colors[0],{rotation:-2}),node('sticky',240,514,195,150,'Less friction.\nMore room to create.',colors[2],{rotation:2}),node('sticky',547,311,205,180,'Make space for the\n“what if” ideas.',colors[1],{rotation:2}),node('sticky',548,520,205,150,'Simple by design.\nThoughtful by default.',colors[3],{rotation:-2}),node('sticky',872,310,205,180,'Start small.\nMake something real.',colors[4],{rotation:-2}),node('text',868,548,220,85,'↗  Your next great idea\n     could start right here.','#7f8974',{fontSize:14,fontWeight:500})]}
// IndexedDB keeps media on the device without the small localStorage limit.
async function init(){
  try{db=await new Promise((resolve,reject)=>{let req=indexedDB.open('sparkboard-workspace',1);req.onupgradeneeded=()=>req.result.createObjectStore('workspace');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});let stored=await new Promise((resolve,reject)=>{let req=db.transaction('workspace').objectStore('workspace').get('boards');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});const backup=JSON.parse(localStorage.getItem('sparkboard.boards')||'[]'),latest=items=>Math.max(0,...(Array.isArray(items)?items:[]).map(b=>b.updated||0));boards=latest(backup)>latest(stored)?backup:stored||backup}
  catch{try{boards=JSON.parse(localStorage.getItem('sparkboard.boards')||'[]')}catch{boards=[]}}
  if(!Array.isArray(boards))boards=[];
  if(!boards.length)createBoard('brainstorm');else openBoard(boards.find(b=>b.id===localStorage.getItem('sparkboard.active'))?.id||boards[0].id);
  setTool('select');await save();$('#canvas').removeAttribute('aria-busy');
}
function save(){
  if(!board)return Promise.resolve();board.updated=Date.now();$('#saved').textContent='Saving on this device…';
  try{localStorage.setItem('sparkboard.active',board.id)}catch{}
  const data=M.clone(boards),revision=++saveRevision;
  // A small synchronous recovery copy also survives an immediate reload.
  try{const backup=JSON.stringify(data);if(backup.length<2500000)localStorage.setItem('sparkboard.boards',backup)}catch{}
  saveChain=saveChain.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
    if(!db){try{localStorage.setItem('sparkboard.boards',JSON.stringify(data));resolve()}catch(err){reject(err)}return}
    let tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(data,'boards');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  })).then(()=>{if(revision===saveRevision)$('#saved').textContent='✓ All changes saved on this device'}).catch(()=>{if(revision===saveRevision){$('#saved').textContent='Could not save — export a backup';toast('Storage is unavailable. Export your board to keep a backup.')}});return saveChain;
}
function createBoard(kind='blank'){
  finishEdit();const titles={brainstorm:'The next big thing',retro:'Sprint retrospective',mindmap:'Connecting the dots',blank:'Untitled board',studio:'The creative studio'};
  const b={id:uid(),title:titles[kind]||titles.blank,kind,objects:sample(kind),scenes:[],grid:true,snap:false,updated:Date.now()};boards.push(b);openBoard(b.id);save();
}
function openBoard(id){finishEdit();board=boards.find(b=>b.id===id);board.scenes??=[];board.grid??=true;board.snap??=false;history=[];future=[];selected.clear();view={x:0,y:0,z:1};$('#title').value=board.title;$('#board-type').textContent={studio:'Creative workspace',blank:'Free canvas',retro:'Retrospective',mindmap:'Mind map',brainstorm:'Brainstorm'}[board.kind]||'Whiteboard';$('#scenes-panel').hidden=true;scenePanelOpen=false;render();fit()}
const boardState=()=>JSON.stringify({objects:board.objects,scenes:board.scenes});
function snapshot(){history.push(boardState());if(history.length>60)history.shift();future=[];updateHistory()}
function undo(){finishEdit();if(!history.length)return;future.push(boardState());Object.assign(board,JSON.parse(history.pop()));selected.clear();render();save()}
function redo(){finishEdit();if(!future.length)return;history.push(boardState());Object.assign(board,JSON.parse(future.pop()));selected.clear();render();save()}
function updateHistory(){$('#undo').disabled=!history.length;$('#redo').disabled=!future.length}
const selectedNodes=()=>board?.objects.filter(n=>selected.has(n.id))||[];
const editableNodes=()=>selectedNodes().filter(n=>!n.locked);
function commit(fn){finishEdit();snapshot();fn();render();save()}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000)}
function applyView(){
  $('#world').style.transform=`translate(${view.x}px,${view.y}px) scale(${view.z})`;
  $('#canvas').style.backgroundSize=`${22*view.z}px ${22*view.z}px`;$('#canvas').style.backgroundPosition=`${view.x}px ${view.y}px`;
  $('#canvas').classList.toggle('no-grid',board?.grid===false);$('#grid-toggle').setAttribute('aria-pressed',String(board?.grid!==false));$('#snap-toggle').setAttribute('aria-pressed',String(!!board?.snap));$('#zoom-level').textContent=Math.round(view.z*100)+'%';
}
function shapeSvg(n){const fill=n.type==='frame'?'none':n.color||colors[1],stroke=n.stroke||'#a8b39c',width=n.strokeWidth??1.3;let geometry;
  if(M.polygons[n.type])geometry=`<polygon points="${M.polygons[n.type]}"/>`;
  else if(n.type==='circle')geometry='<ellipse cx="50" cy="50" rx="48" ry="48"/>';
  else geometry=`<rect x="1" y="1" width="98" height="98" rx="${n.type==='frame'?4:6}"/>`;
  geometry=geometry.replace(/\/>/g,' vector-effect="non-scaling-stroke"/>');
  return `<svg class="shape-body" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${n.type==='frame'?'stroke-dasharray="3 2"':''}>${geometry}</svg>`;
}
function objectContents(n){
  if(n.type==='image')return `<img src="${esc(n.src)}" alt="${esc(n.text)}" draggable="false">`;
  if(n.type==='link'){let url=M.safeUrl(n.url);return `<div class="link-art">↗<span>LINK</span></div><div class="card-copy"><b>${esc(n.text||'Web link')}</b><span>${esc(url?new URL(url).hostname:'Invalid link')}</span>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-open="true">Open link ↗</a>`:''}</div>`}
  if(n.type==='file')return `<div class="file-art">PDF</div><div class="card-copy"><b>${esc(n.text)}</b><span>PDF document · ${Math.round((n.size||0)/1024)} KB</span><a href="${esc(n.src)}" download="${esc(n.text)}" data-open="true">Download PDF ↓</a></div>`;
  return `${M.shapes.includes(n.type)?shapeSvg(n):''}<span class="object-text">${esc(n.text)}</span>`;
}
function objectStyle(n){return `left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;transform:rotate(${n.rotation||0}deg);z-index:${n.z??(n.type==='frame'?-10:0)};--fill:${n.color||colors[0]};--text-color:${n.textColor||(n.type==='text'?n.color:'#3c4234')};font-size:${n.fontSize||(n.type==='text'?22:n.type==='frame'?12:17)}px;font-weight:${n.fontWeight||(n.type==='text'||n.type==='frame'?700:400)};text-align:${n.align||(n.type==='text'||n.type==='frame'?'left':'center')}`}
function render(){
  if(!board)return;$('#objects').replaceChildren();
  for(const n of board.objects.filter(n=>!['connector','path'].includes(n.type))){const el=document.createElement('div');el.className=`object ${n.type} ${M.shapes.includes(n.type)?'geometric':''} ${selected.has(n.id)?'selected':''} ${n.locked?'locked':''}`;el.dataset.id=n.id;el.style.cssText=objectStyle(n);el.innerHTML=objectContents(n);if(n.locked)el.insertAdjacentHTML('beforeend','<span class="lock-badge" title="Locked">▣</span>');$('#objects').append(el)}
  renderLines();selectVisual();applyView();renderScenes();updateHistory();
}
function connectorGeometry(n){let a=board.objects.find(o=>o.id===n.from),b=board.objects.find(o=>o.id===n.to);if(!a||!b)return '';let ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2,dx=bx-ax,dy=by-ay;if(!dx&&!dy)return '';let sa=Math.min((a.w/2+7)/(Math.abs(dx)||1),(a.h/2+7)/(Math.abs(dy)||1)),sb=Math.min((b.w/2+7)/(Math.abs(dx)||1),(b.h/2+7)/(Math.abs(dy)||1));return `M${ax+dx*sa},${ay+dy*sa} L${bx-dx*sb},${by-dy*sb}`}
function renderLines(){
  $('#connections').innerHTML='<defs><marker id="arrowhead" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs>'+board.objects.filter(n=>['connector','path'].includes(n.type)).map(n=>{
    let d=n.type==='path'?n.points.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' '):connectorGeometry(n);return `<path data-id="${n.id}" d="${d}" fill="none" stroke="${selected.has(n.id)?'#ed7959':n.color||'#86917b'}" stroke-width="${n.strokeWidth||(n.type==='path'?4:2)}" stroke-linecap="round" stroke-linejoin="round" ${n.type==='connector'?'marker-end="url(#arrowhead)"':''}/>`;
  }).join('');
}
function selectVisual(){
  $$('#objects .object').forEach(el=>{const n=board.objects.find(n=>n.id===el.dataset.id);el.classList.toggle('selected',selected.has(n.id));el.querySelector('.resize')?.remove();if(selected.size===1&&selected.has(n.id)&&!n.locked){const h=document.createElement('span');h.className='resize';el.append(h)}});renderLines();properties();updateHistory();
}
function properties(){
  const ns=selectedNodes(),first=ns[0],hasUnlocked=ns.some(n=>!n.locked),canText=ns.length===1&&!['path','connector','image','file'].includes(first?.type);
  $('#properties').hidden=!ns.length;$('#selection-count').textContent=ns.length===1?(first.locked?'Locked item':first.group?'Grouped item':'1 item'):`${ns.length} items`;
  $('#swatches').innerHTML=colors.map(c=>`<button class="swatch ${first?.color===c?'chosen':''}" style="background:${c}" data-color="${c}" aria-label="Set color ${c}" ${!hasUnlocked?'disabled':''}></button>`).join('');
  $('#edit').disabled=!canText||!hasUnlocked;$('#duplicate').disabled=!hasUnlocked;$('#delete').disabled=!hasUnlocked;$('#lock').textContent=ns.length&&ns.every(n=>n.locked)?'▣':'♙';$('#lock').title=ns.every(n=>n.locked)?'Unlock selection':'Lock selection';$('#inspector').hidden=!inspectorOpen||!ns.length;$('#inspect').setAttribute('aria-expanded',String(inspectorOpen&&!!ns.length));if(inspectorOpen&&ns.length)renderInspector();
}
function renderInspector(){const ns=selectedNodes(),n=ns[0],locked=ns.every(n=>n.locked),disabled=locked?'disabled':'',multi=ns.length>1;
  $('#inspector-body').innerHTML=`<div class="inspector-section"><label class="field-label">${multi?'SELECTION':'TEXT & STYLE'} <span>${multi?ns.length+' items':shapeNames[n.type]||n.type}</span></label><div class="form-row"><label>Font size<input type="number" min="8" max="144" value="${n.fontSize||17}" data-prop="fontSize" aria-label="Font size" ${disabled}></label><label>Rotation<input type="number" min="-360" max="360" value="${n.rotation||0}" data-prop="rotation" aria-label="Rotation" ${disabled}></label></div><div class="segmented"><button data-command="bold" class="${n.fontWeight===700?'active':''}" title="Bold" ${disabled}><b>B</b></button>${['left','center','right'].map(a=>`<button data-align-text="${a}" title="Text align ${a}" class="${(n.align||'center')===a?'active':''}" ${disabled}>${a==='left'?'☰':a==='center'?'≡':'☷'}</button>`).join('')}</div><div class="form-row"><label>Text<input type="color" aria-label="Text color" data-prop="textColor" value="${n.textColor||'#3c4234'}" ${disabled}></label><label>Border / ink<input type="color" aria-label="Border color" data-prop="stroke" value="${n.stroke||'#a8b39c'}" ${disabled}></label></div><label class="wide-field">Stroke width<input type="range" min="0" max="12" step="1" data-prop="strokeWidth" aria-label="Stroke width" value="${n.strokeWidth??2}" ${disabled}></label></div><div class="inspector-section"><label class="field-label">ARRANGE</label><div class="form-row"><button class="action-button" data-command="front" ${disabled}>↑ To front</button><button class="action-button" data-command="back" ${disabled}>↓ To back</button></div><div class="form-row"><button class="action-button" data-command="group" ${multi&&!locked?'':'disabled'}>⧉ Group</button><button class="action-button" data-command="ungroup" ${ns.some(n=>n.group)&&!locked?'':'disabled'}>Ungroup</button></div><button class="action-button full" data-command="lock">${locked?'Unlock selection':'Lock selection'}</button></div><div class="inspector-section"><label class="field-label">ALIGN & DISTRIBUTE</label><div class="align-grid">${['left','center','right','top','middle','bottom'].map(a=>`<button data-align="${a}" title="Align ${a}" ${multi&&!locked?'':'disabled'}>${a}</button>`).join('')}</div><div class="form-row"><button class="action-button" data-distribute="x" ${ns.length>=3&&!locked?'':'disabled'}>↔ Space</button><button class="action-button" data-distribute="y" ${ns.length>=3&&!locked?'':'disabled'}>↕ Space</button></div></div><p class="panel-footnote">Shift-click to select more. Drag empty canvas to select an area.</p>`;
}

// Keep every shape in one searchable, expandable library.
function setupTools(){
  $('#tools').innerHTML=['select','hand','sticky','text','shapes','connector','pen','media','link'].map((k,i)=>(i===2||i===7?'<div class="tool-sep"></div>':'')+(k==='shapes'?`<div class="shape-picker"><button id="shape-toggle" data-label="Shapes" aria-label="Shapes" aria-expanded="false" aria-controls="shape-menu">${svgIcon('shape')}<span class="expand-caret" aria-hidden="true">›</span></button><div id="shape-menu" role="group" aria-label="Choose a shape" hidden><div class="shape-menu-head"><span class="shape-menu-title">SHAPE LIBRARY</span><span>9 shapes</span></div><input id="shape-search" type="search" placeholder="Find a shape…" aria-label="Search shapes"><div id="shape-grid">${M.shapes.map(k=>`<button data-tool="${k}" aria-label="${shapeNames[k]}" data-shape-name="${shapeNames[k].toLowerCase()}">${svgIcon(k)}<span>${shapeNames[k]}</span></button>`).join('')}</div><p id="shape-empty" hidden>No matching shapes.</p><p class="shape-tip">Choose a shape, then click the canvas.</p></div></div>`:`<button data-tool="${k}" data-label="${labels[k]}" aria-label="${labels[k]}">${svgIcon(k)}</button>`)).join('');
  $('#tools').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='shape-toggle'){let open=$('#shape-menu').hidden;$('#shape-menu').hidden=!open;b.setAttribute('aria-expanded',String(open));if(open)$('#shape-search').focus();return}let t=b.dataset.tool;if(t==='media'){$('#media-file').click();return}if(t==='link'){linkDialog();return}if(t)setTool(t)};
  $('#shape-search').oninput=e=>{let visible=0;$$('#shape-grid button').forEach(b=>{b.hidden=!b.dataset.shapeName.includes(e.target.value.toLowerCase());if(!b.hidden)visible++});$('#shape-empty').hidden=visible>0};
}
function closeShapes(){$('#shape-menu').hidden=true;$('#shape-toggle').setAttribute('aria-expanded','false')}
function setTool(t){finishEdit();tool=t;connectorStart=null;$$('#tools [data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));$('#shape-toggle').classList.toggle('active',M.shapes.includes(t));closeShapes();$('#drawing-options').hidden=t!=='pen';$('#canvas').style.cursor=t==='hand'?'grab':t==='select'?'default':'crosshair';$('#hint').textContent=t==='connector'?'Click two objects to connect them':t==='pen'?'Draw on the canvas · Choose your pen above':t==='select'?'Shift-click to multi-select · Space + drag to pan':t==='hand'?'Drag to move around your board':`Click to add ${shapeNames[t]||t}`}
function point(e){const r=$('#canvas').getBoundingClientRect();return {x:(e.clientX-r.left-view.x)/view.z,y:(e.clientY-r.top-view.y)/view.z}}
function screenPoint(p){return{x:p.x*view.z+view.x,y:p.y*view.z+view.y+$('#canvas').getBoundingClientRect().top}}
function centerPoint(){return point({clientX:innerWidth/2,clientY:$('#canvas').getBoundingClientRect().top+$('#canvas').clientHeight/2})}
function addAt(type,p){
  const n=node(type,p.x,p.y,type==='text'?280:type==='frame'?420:190,type==='text'?80:type==='frame'?320:170,type==='sticky'?'Your next idea':type==='text'?'Add your text':type==='frame'?'NEW FRAME':'',type==='sticky'?colors[0]:type==='text'?'#3b4435':type==='frame'?'transparent':colors[1]);
  commit(()=>{board.objects.push(n);selected=new Set([n.id])});setTool('select');if(type==='sticky'||type==='text')startEdit(n.id);
}
function selectIds(ids){selected=M.expandGroups(board.objects,ids);selectVisual()}
function capture(e){$('#canvas').setPointerCapture(e.pointerId)}
$('#canvas').addEventListener('pointerdown',e=>{
  if(!board||(e.button!==0&&e.button!==1)||e.target.closest('[data-open]'))return;
  if(editing&&e.target.closest('[contenteditable]'))return;e.preventDefault();finishEdit();
  const p=point(e),el=e.target.closest('[data-id]'),n=el&&board.objects.find(n=>n.id===el.dataset.id);
  if(space||tool==='hand'||e.button===1){e.preventDefault();drag={type:'pan',cx:e.clientX,cy:e.clientY,x:view.x,y:view.y};capture(e);return}
  if(tool==='connector'){
    if(!n||['path','connector','frame'].includes(n.type))return;
    if(!connectorStart){connectorStart=n.id;selectIds([n.id]);toast('Click another object to connect it')}
    else if(connectorStart!==n.id){const from=connectorStart;commit(()=>board.objects.push({id:uid(),type:'connector',from,to:n.id,color:'#86917b',strokeWidth:2}));setTool('select');selected.clear();selectVisual()}return;
  }
  if(tool==='pen'){snapshot();const path={id:uid(),type:'path',points:[p],color:$('#pen-color').value,strokeWidth:Number($('#pen-width').value)};board.objects.push(path);drag={type:'draw',id:path.id};capture(e);return}
  if(tool!=='select'){addAt(tool,p);return}
  if(!n){if(!e.shiftKey)selected.clear();drag={type:'marquee',start:p,original:new Set(selected),current:p};capture(e);selectVisual();return}
  const resize=e.target.classList.contains('resize');
  if(e.shiftKey){const ids=M.expandGroups(board.objects,[n.id]);if(selected.has(n.id))ids.forEach(id=>selected.delete(id));else ids.forEach(id=>selected.add(id));selectVisual();return}
  if(!selected.has(n.id))selected=M.expandGroups(board.objects,[n.id]);
  // Do not rebuild the clicked element: native double-click must retain its target.
  selectVisual();if(n.locked){toast('This item is locked. Use the lock button to unlock it.');return}
  drag={type:resize?'resize':'move',start:p,id:n.id,original:selectedNodes().map(M.clone),changed:false};capture(e);
});
$('#canvas').addEventListener('pointermove',e=>{
  if(!drag)return;const p=point(e);
  if(drag.type==='pan'){view.x=drag.x+e.clientX-drag.cx;view.y=drag.y+e.clientY-drag.cy;applyView();return}
  if(drag.type==='marquee'){
    drag.current=p;const a=screenPoint(drag.start),b=screenPoint(p);$('#selection-box').hidden=false;$('#selection-box').style.cssText=`left:${Math.min(a.x,b.x)}px;top:${Math.min(a.y,b.y)}px;width:${Math.abs(a.x-b.x)}px;height:${Math.abs(a.y-b.y)}px`;
    const x=Math.min(p.x,drag.start.x),y=Math.min(p.y,drag.start.y),w=Math.abs(p.x-drag.start.x),h=Math.abs(p.y-drag.start.y);
    const ids=board.objects.filter(n=>n.type!=='frame'&&n.type!=='connector').filter(n=>{let b=M.bounds(n,board.objects);return b.x>=x&&b.y>=y&&b.x+b.w<=x+w&&b.y+b.h<=y+h}).map(n=>n.id);selected=M.expandGroups(board.objects,[...drag.original,...ids]);selectVisual();return;
  }
  const n=board.objects.find(n=>n.id===drag.id);
  if(drag.type==='draw'){if(Math.hypot(p.x-n.points.at(-1).x,p.y-n.points.at(-1).y)>1/view.z){n.points.push(p);renderLines()}return}
  let dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.changed&&Math.hypot(dx,dy)*view.z<3)return;
  if(!drag.changed){snapshot();drag.changed=true}
  if(drag.type==='resize'){
    const original=drag.original.find(o=>o.id===n.id);n.w=Math.max(50,original.w+dx);n.h=Math.max(40,original.h+dy);if(e.shiftKey||n.type==='image'){let ratio=original.h/original.w;n.h=n.w*ratio}if(board.snap){n.w=Math.round(n.w/22)*22;n.h=Math.round(n.h/22)*22}
  }else{
    if(board.snap){const origin=drag.original.find(o=>o.id===drag.id),b=M.bounds(origin,board.objects);dx=Math.round((b.x+dx)/22)*22-b.x;dy=Math.round((b.y+dy)/22)*22-b.y}
    for(const original of drag.original){let target=board.objects.find(o=>o.id===original.id);Object.assign(target,M.clone(original));M.translate(target,dx,dy)}
  }
  render();
});
function endPointer(e){if(!drag)return;const d=drag;drag=null;$('#selection-box').hidden=true;if(e&&$('#canvas').hasPointerCapture(e.pointerId))$('#canvas').releasePointerCapture(e.pointerId);if(d.type==='draw'){let n=board.objects.find(n=>n.id===d.id);if(n.points.length===1)n.points.push({x:n.points[0].x+.1,y:n.points[0].y+.1});selected=new Set([d.id]);render();save()}else if(d.changed)save()}
$('#canvas').addEventListener('pointerup',endPointer);$('#canvas').addEventListener('pointercancel',endPointer);
$('#canvas').addEventListener('dblclick',e=>{if(e.target.closest('[data-open]'))return;let id=e.target.closest('[data-id]')?.dataset.id;if(id)startEdit(id);else if(tool==='select')addAt('sticky',point(e))});
function startEdit(id){
  if(editing===id)return;finishEdit();const n=board.objects.find(n=>n.id===id);if(!n||n.locked||['path','connector','image','file'].includes(n.type))return;if(n.type==='link'){linkDialog(n);return}
  snapshot();selected=new Set([id]);selectVisual();const el=$(`#objects [data-id="${id}"]`),text=el.querySelector('.object-text');if(!text)return;
  el.querySelector('.resize')?.remove();text.contentEditable='plaintext-only';el.classList.add('editing');editing={id,el,text};text.focus();const r=document.createRange();r.selectNodeContents(text);const selection=getSelection();selection.removeAllRanges();selection.addRange(r);
  text.addEventListener('input',()=>{n.text=text.innerText;save()});text.addEventListener('blur',()=>finishEdit(),{once:true});
}
function finishEdit(){if(!editing)return;const current=editing;editing=null;const n=board?.objects.find(n=>n.id===current.id);if(n)n.text=current.text.innerText;current.text.contentEditable='false';current.el.classList.remove('editing');selectVisual();save()}
function zoom(z,cx=innerWidth/2,cy=$('#canvas').clientHeight/2){finishEdit();let next=Math.min(3,Math.max(.1,z));view.x=cx-(cx-view.x)*next/view.z;view.y=cy-(cy-view.y)*next/view.z;view.z=next;applyView()}
$('#canvas').addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.metaKey)zoom(view.z*Math.exp(-e.deltaY*.007),e.clientX,e.clientY-$('#canvas').getBoundingClientRect().top);else{view.x-=e.deltaX;view.y-=e.deltaY;applyView()}},{passive:false});
function focusBounds(box){finishEdit();const availW=Math.max(170,innerWidth-(inspectorOpen?410:200)),availH=Math.max(160,$('#canvas').clientHeight-160);view.z=Math.max(.1,Math.min(1.3,availW/Math.max(box.w,1),availH/Math.max(box.h,1)));view.x=(innerWidth-(inspectorOpen?260:0)-box.w*view.z)/2-box.x*view.z;view.y=($('#canvas').clientHeight-box.h*view.z)/2-box.y*view.z;applyView()}
function fit(){if(!board)return;if(!board.objects.length){view={x:0,y:0,z:1};applyView();return}focusBounds(M.enclosing(board.objects.filter(n=>n.type!=='connector'),board.objects))}
function deleteSelected(){if(!editableNodes().length)return;commit(()=>{const ids=new Set(editableNodes().map(n=>n.id));board.objects=board.objects.filter(n=>!ids.has(n.id)&&!ids.has(n.from)&&!ids.has(n.to));selected.clear()})}
function duplicate(){if(!editableNodes().length)return;commit(()=>{const copies=M.duplicate(board.objects,selected,uid);board.objects.push(...copies);selected=new Set(copies.map(n=>n.id))})}
function toggleLock(){const allLocked=selectedNodes().every(n=>n.locked);commit(()=>selectedNodes().forEach(n=>n.locked=!allLocked));toast(allLocked?'Selection unlocked':'Selection locked')}
function command(action){
  if(action==='lock'){toggleLock();return}if(!editableNodes().length)return;
  commit(()=>{const ns=editableNodes();if(action==='bold')ns.forEach(n=>n.fontWeight=n.fontWeight===700?400:700);
    if(action==='group'){let group=uid();ns.forEach(n=>n.group=group)}
    if(action==='ungroup')ns.forEach(n=>delete n.group);
    if(action==='front'||action==='back'){let zs=board.objects.map(n=>n.z??(n.type==='frame'?-10:0)),base=action==='front'?Math.max(...zs)+1:Math.min(...zs)-ns.length;ns.forEach((n,i)=>n.z=base+i)}
  });
}

// Local images and PDF cards. Images are resized before storage.
function readFile(file){return new Promise((resolve,reject)=>{let reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read file'));reader.readAsDataURL(file)})}
async function imageData(file){let src=await readFile(file);const image=new Image();image.src=src;await image.decode();const ratio=Math.min(1,1400/image.naturalWidth,1400/image.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return{src:canvas.toDataURL('image/webp',.86),w:canvas.width,h:canvas.height}}
async function insertFiles(files,p=centerPoint()){
  const boardId=board.id,items=[];toast('Adding files to your board…');
  for(const [index,file] of [...files].entries()){
    if(file.size>12*1024*1024){toast(`${file.name}: choose a file under 12 MB`);continue}
    try{if(/^image\/(png|jpeg|webp|gif)$/.test(file.type)){let image=await imageData(file),w=Math.min(360,image.w),h=w*image.h/image.w;items.push(node('image',p.x+index*28,p.y+index*28,w,h,file.name,'#ffffff',{src:image.src}))}
      else if(file.type==='application/pdf'){let src=await readFile(file);items.push(node('file',p.x+index*28,p.y+index*28,300,150,file.name,'#ffffff',{src,size:file.size}))}
      else toast(`${file.name}: use PNG, JPEG, WebP, GIF or PDF`);
    }catch{toast(`Could not add ${file.name}`)}
  }
  if(board.id!==boardId){toast('Board changed. Please add the files again.');return}if(!items.length)return;
  commit(()=>{board.objects.push(...items);selected=new Set(items.map(n=>n.id))});setTool('select');await save();toast(`${items.length} ${items.length===1?'file':'files'} added`);
}
$('#media-file').onchange=e=>{insertFiles(e.target.files);e.target.value=''};
let dragDepth=0;
$('#canvas').addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dragDepth++;$('#drop-hint').hidden=false}});
$('#canvas').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
$('#canvas').addEventListener('dragleave',()=>{if(--dragDepth<=0){dragDepth=0;$('#drop-hint').hidden=true}});
$('#canvas').addEventListener('drop',e=>{e.preventDefault();dragDepth=0;$('#drop-hint').hidden=true;insertFiles(e.dataTransfer.files,point(e))});
function linkDialog(existing){
  modal(existing?'Edit link':'Bring a little of the web in.',`<form id="link-form" class="modal-form"><label>Web address<input id="link-url" type="url" required placeholder="https://example.com" value="${esc(existing?.url||'')}" autofocus></label><label>Title<input id="link-title" type="text" maxlength="200" placeholder="A useful resource" value="${esc(existing?.text||'')}"></label><p class="panel-description">A link card opens the original website in a new tab.</p><p id="link-error" role="alert"></p><button class="primary" type="submit">${existing?'Save link':'Add to board'} ↗</button></form>`,'LINK CARD');
  $('#link-form').onsubmit=e=>{e.preventDefault();const url=M.safeUrl($('#link-url').value);if(!url){$('#link-error').textContent='Enter an http or https web address.';return}const text=$('#link-title').value.trim()||new URL(url).hostname,p=centerPoint();commit(()=>{if(existing){existing.url=url;existing.text=text}else{let n=node('link',p.x-145,p.y-90,290,180,text,'#ffffff',{url});board.objects.push(n);selected=new Set([n.id])}});$('#dialog').close()};
}
function activeEditor(){return document.activeElement?.matches('input,textarea,select,[contenteditable="plaintext-only"]')||editing}
document.addEventListener('copy',e=>{
  if(activeEditor()||$('#dialog').open||!selected.size)return;const nodes=selectedNodes().map(M.clone),ids=new Set(nodes.map(n=>n.id)),valid=nodes.filter(n=>n.type!=='connector'||ids.has(n.from)&&ids.has(n.to));clipboard=valid;e.clipboardData.setData('text/plain','sparkboard-objects:'+JSON.stringify(valid));e.preventDefault();toast(`${valid.length} items copied`);
});
document.addEventListener('paste',e=>{
  if(activeEditor()||$('#dialog').open)return;if(e.clipboardData.files.length){e.preventDefault();insertFiles(e.clipboardData.files);return}
  const text=e.clipboardData.getData('text/plain');if(!text)return;e.preventDefault();
  if(text.startsWith('sparkboard-objects:')){try{const objects=M.validateBoard({objects:JSON.parse(text.slice('sparkboard-objects:'.length))}).objects;objects.forEach(n=>n.locked=false);commit(()=>{const copies=M.duplicate(objects,new Set(objects.map(n=>n.id)),uid);const b=M.enclosing(copies,copies),p=centerPoint();copies.forEach(n=>M.translate(n,p.x-b.x-b.w/2,p.y-b.y-b.h/2));board.objects.push(...copies);selected=new Set(copies.map(n=>n.id))});toast('Items pasted')}catch{toast('These copied items could not be pasted')}return}
  if(M.safeUrl(text.trim())){let p=centerPoint(),url=M.safeUrl(text.trim());commit(()=>{let n=node('link',p.x-145,p.y-90,290,180,new URL(url).hostname,'#ffffff',{url});board.objects.push(n);selected=new Set([n.id])});return}
  const p=centerPoint();commit(()=>{let n=node('sticky',p.x-110,p.y-100,220,200,text.slice(0,10000),colors[0]);board.objects.push(n);selected=new Set([n.id])});
});

// Saved scenes are camera positions, so objects remain editable in every scene.
function renderScenes(){
  if(!board)return;$('#scene-list').innerHTML=board.scenes.length?board.scenes.map((s,i)=>`<div class="scene-row"><button data-scene="${i}"><span class="scene-number">${String(i+1).padStart(2,'0')}</span><span><b>${esc(s.name)}</b><small>${Math.round(s.view.z*100)}% zoom</small></span></button><button data-rename-scene="${i}" title="Rename scene">✎</button><button data-delete-scene="${i}" title="Delete scene">×</button></div>`).join(''):'<div class="empty-scenes"><span>▣</span><b>A view worth coming back to.</b><p>Pan and zoom to a part of your board, then save it as a scene.</p></div>';
}
function toggleScenes(){scenePanelOpen=!scenePanelOpen;$('#scenes-panel').hidden=!scenePanelOpen;if(scenePanelOpen){inspectorOpen=false;$('#inspector').hidden=true;renderScenes()}}
function sceneDialog(index){const existing=index===undefined?null:board.scenes[index];modal(existing?'Rename scene':'Save this view',`<form id="scene-form" class="modal-form"><label>Scene name<input id="scene-name" required maxlength="100" value="${esc(existing?.name||'Scene '+(board.scenes.length+1))}" autofocus></label><button class="primary" type="submit">${existing?'Save name':'Save scene'}</button></form>`,'SCENES');$('#scene-form').onsubmit=e=>{e.preventDefault();const name=$('#scene-name').value.trim();if(!name)return;commit(()=>{if(existing)existing.name=name;else board.scenes.push({id:uid(),name,view:{...view}})});$('#dialog').close();toast('Scene saved')}}
$('#save-scene').onclick=()=>sceneDialog();
$('#scene-list').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.scene!==undefined){finishEdit();view={...board.scenes[Number(b.dataset.scene)].view};applyView()}
  if(b.dataset.deleteScene!==undefined)commit(()=>board.scenes.splice(Number(b.dataset.deleteScene),1));
  if(b.dataset.renameScene!==undefined)sceneDialog(Number(b.dataset.renameScene));
};
function modal(title,body,label='YOUR WORKSPACE'){finishEdit();closeShapes();$('#modal-title').textContent=title;$('#modal-label').textContent=label;$('#modal-body').innerHTML=body;$('#dialog').showModal()}
function showBoards(){modal('Your boards',`<input class="search-input" id="boards-search" type="search" placeholder="Search your boards…" aria-label="Search boards"><div id="boards-list">${boards.map(b=>`<div class="board-row" data-board-title="${esc(b.title.toLowerCase())}"><button data-board="${b.id}">${esc(b.title)||'Untitled board'}<small>${b.objects.length} objects · ${b.scenes?.length||0} scenes · On this device</small></button><button data-delete-board="${b.id}" title="Delete board">×</button></div>`).join('')}</div><div class="modal-actions"><button class="primary" data-action="new">＋ New board</button><button class="quiet" data-action="import">↑ Import board</button></div>`);$('#boards-search').oninput=e=>$$('[data-board-title]').forEach(row=>row.hidden=!row.dataset.boardTitle.includes(e.target.value.toLowerCase()))}
function searchBoard(){
  modal('Find a thought.',`<input class="search-input" id="find-input" type="search" placeholder="Search text, notes, files and links…" aria-label="Find on board"><div id="search-results"></div>`,'FIND ON THIS BOARD');
  const results=()=>{const term=$('#find-input').value.toLowerCase().trim();let ns=board.objects.filter(n=>n.text&&(n.text.toLowerCase().includes(term)||(n.url||'').toLowerCase().includes(term))).slice(0,40);$('#search-results').innerHTML=ns.length?ns.map(n=>`<button class="search-result" data-find="${n.id}"><span class="result-dot" style="background:${n.color||'#dce7cc'}"></span><span><b>${esc(n.text.slice(0,100))}</b><small>${esc(shapeNames[n.type]||n.type)}</small></span><span>↗</span></button>`).join(''):'<p class="panel-description">No matching items on this board.</p>'};$('#find-input').oninput=results;results();$('#find-input').focus();
}
function showHelp(){modal('A few handy shortcuts',Object.entries({'Select / Pan':'V / H','Move around':'Space + drag','Select multiple':'Shift-click or drag empty canvas','Select all':'⌘A','Sticky / Text / Link':'N / T / L','Rectangle / Circle / Frame':'R / O / F','Connect / Draw':'C / P','Edit selected item':'Enter or double-click','Copy / Paste':'⌘C / ⌘V','Duplicate':'⌘D','Group / Ungroup':'⌘G / ⌘⇧G','Undo / Redo':'⌘Z / ⌘⇧Z','Nudge selection':'Arrows · Shift for 10 px','Find on board':'⌘F','Delete selected':'Delete','Zoom':'Pinch or Ctrl + scroll'}).map(([a,b])=>`<div class="help-row"><span>${a}</span><kbd>${b}</kbd></div>`).join(''),'MAKE YOURSELF AT HOME')}
$('#modal-body').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.template){createBoard(b.dataset.template);$('#dialog').close();toast('Your new board is ready')}
  if(b.dataset.board){openBoard(b.dataset.board);save();$('#dialog').close()}
  if(b.dataset.deleteBoard){const id=b.dataset.deleteBoard;if(confirm('Delete this board? Export a backup first if you want to keep it.')){boards=boards.filter(b=>b.id!==id);if(board.id===id){if(boards.length)openBoard(boards[0].id);else createBoard()}save();$('#dialog').close();showBoards()}}
  if(b.dataset.action==='new'){$('#dialog').close();createBoard()}
  if(b.dataset.action==='import')$('#import-file').click();
  if(b.dataset.find){const n=board.objects.find(n=>n.id===b.dataset.find);$('#dialog').close();selectIds([n.id]);focusBounds(M.bounds(n,board.objects))}
  if(b.dataset.export){download(b.dataset.export);$('#dialog').close()}
});

// Native SVG geometry keeps exported boards portable and crisp.
function wrapText(text,maxWidth,fontSize){
  const ctx=document.createElement('canvas').getContext('2d');ctx.font=`${fontSize}px sans-serif`;const result=[];
  for(const paragraph of String(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){result.push(line);line=word}else line=next}result.push(line)}return result;
}
function exportSVG(){
  const b=M.enclosing(board.objects.filter(n=>n.type!=='connector'),board.objects),pad=40;
  const lines=board.objects.filter(n=>['path','connector'].includes(n.type)).map(n=>{const d=n.type==='path'?n.points.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' '):connectorGeometry(n);return `<path d="${d}" stroke="${n.color||'#86917b'}" stroke-width="${n.strokeWidth||(n.type==='path'?4:2)}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${n.type==='connector'?'marker-end="url(#export-arrow)"':''}/>`}).join('');
  const objects=board.objects.filter(n=>!['path','connector'].includes(n.type)).slice().sort((a,b)=>(a.z??(a.type==='frame'?-10:0))-(b.z??(b.type==='frame'?-10:0))).map(n=>{
    const x=n.x,y=n.y,w=n.w,h=n.h;let visual='';
    if(n.type==='image')visual=`<image href="${esc(n.src)}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
    else{
      if(M.shapes.includes(n.type))visual=shapeSvg(n).replace('class="shape-body"',`width="${w}" height="${h}"`);
      else if(n.type!=='text')visual=`<rect width="${w}" height="${h}" fill="${n.color||colors[0]}" rx="${['file','link'].includes(n.type)?10:2}"/>`;
      let font=n.fontSize||(n.type==='text'?22:n.type==='frame'?12:17),card=['link','file'].includes(n.type),text=n.text+(n.type==='link'?'\n'+new URL(n.url).hostname:n.type==='file'?'\nPDF document':''),wrapped=wrapText(text,w-36,font),align=n.align||(n.type==='text'||n.type==='frame'||card?'left':'center'),tx=align==='left'?18:align==='right'?w-18:w/2,anchor=align==='left'?'start':align==='right'?'end':'middle',ty=n.type==='frame'?30:n.type==='text'?font+4:Math.max(font+15,(h-wrapped.length*font*1.45)/2+font);
      visual+=`<text text-anchor="${anchor}" font-family="sans-serif" font-size="${font}" font-weight="${n.fontWeight||(n.type==='text'?700:400)}" fill="${n.textColor||(n.type==='text'?n.color:'#3c4234')}">${wrapped.map((line,i)=>`<tspan x="${tx}" y="${ty+i*font*1.45}">${esc(line)}</tspan>`).join('')}</text>`;
    }
    return `<g transform="translate(${x} ${y}) rotate(${n.rotation||0} ${w/2} ${h/2})">${visual}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w+pad*2}" height="${b.h+pad*2}" viewBox="${b.x-pad} ${b.y-pad} ${b.w+pad*2} ${b.h+pad*2}"><title>${esc(board.title)}</title><defs><marker id="export-arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs><rect x="${b.x-pad}" y="${b.y-pad}" width="${b.w+pad*2}" height="${b.h+pad*2}" fill="#f9faf7"/>${lines}${objects}</svg>`;
}
function downloadBlob(content,type,extension){const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(board.title||'Sparkboard').replace(/[^a-z0-9 -]/gi,'')+'.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function download(type){
  finishEdit();if(type==='json'){downloadBlob(JSON.stringify({...board,format:'sparkboard-v2'},null,2),'application/json','json');toast('Editable board exported');return}
  const svg=exportSVG();if(type==='svg'){downloadBlob(svg,'image/svg+xml','svg');toast('SVG exported');return}
  if(type==='pdf'){
    const pop=window.open('','_blank');if(!pop){toast('Allow the print window to save your board as PDF.');return}
    pop.document.write(`<!doctype html><title>${esc(board.title)}</title><style>@page{size:landscape;margin:8mm}body{margin:0;font:14px sans-serif}img{display:block;width:100%;height:92vh;object-fit:contain}p{text-align:center;color:#777}@media print{p{display:none}}</style><p>Choose “Save as PDF” in the print dialog.</p>`);pop.document.close();const image=pop.document.createElement('img');image.onload=()=>{pop.focus();pop.print()};image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);pop.document.body.append(image);return;
  }
  if(type==='png')try{let image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));image.src=url;await image.decode();let scale=Math.min(2,4096/image.naturalWidth,4096/image.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error();downloadBlob(blob,'image/png','png');toast('PNG exported')}catch{toast('Could not render PNG. Try SVG export instead.')}
}
$('#import-file').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{if(file.size>60*1024*1024)throw Error();const parsed=M.validateBoard(JSON.parse(await file.text()));const b={...parsed,id:uid(),title:String(parsed.title||'Imported board').slice(0,200),kind:parsed.kind||'blank',scenes:parsed.scenes||[],updated:Date.now()};boards.push(b);openBoard(b.id);save();$('#dialog').close();toast('Board imported successfully')}catch{toast('This is not a valid Sparkboard backup.')}e.target.value=''};

// Controls and keyboard actions.
setupTools();
$('#canvas').setAttribute('aria-busy','true');
$('#close-dialog').onclick=()=>$('#dialog').close();$('#dialog').onclick=e=>{if(e.target===$('#dialog'))$('#dialog').close()};
$('#title').oninput=e=>{if(board){board.title=e.target.value;save()}};
$('#new-board').onclick=()=>{$('#dialog').close();createBoard();toast('A fresh canvas. Make it yours.')};
$('#boards').onclick=showBoards;$('#search-board').onclick=searchBoard;$('#scenes').onclick=toggleScenes;$('#close-scenes').onclick=()=>{scenePanelOpen=false;$('#scenes-panel').hidden=true};
$('#close-welcome').onclick=()=>$('#welcome').remove();$('#help').onclick=showHelp;
$('#templates').onclick=()=>modal('Give your ideas a head start.',`<div class="template-grid">${[['studio','Creative studio','Images, resources and ideas. Everything in one space.'],['brainstorm','Brainstorm','Turn a few sparks into your next big thing.'],['retro','Sprint retrospective','Reflect on the good. Make the next sprint better.'],['mindmap','Mind map','Find the connections between your ideas.'],['blank','A clean slate','Your space, your rules. Start from scratch.']].map(([k,t,d])=>`<button class="template-card" data-template="${k}"><div class="mini-notes"><i></i><i></i><i></i></div><b>${t}</b><p>${d}</p></button>`).join('')}</div>`,'A PLACE TO START');
$('#export').onclick=()=>modal('Take your ideas with you.',[['json','Editable board','A portable backup, including your images, PDFs, groups and scenes.'],['svg','Vector image','A crisp, scalable image of the whole canvas.'],['png','PNG image','A high-resolution image, ready to share.'],['pdf','Print / Save as PDF','Open the print dialog and choose Save as PDF.']].map(([type,title,detail])=>`<button class="export-option" data-export="${type}"><b>↓ ${title}</b><span>${detail}</span></button>`).join(''),'SAVE & EXPORT');
$('#zoom-in').onclick=()=>zoom(view.z*1.2);$('#zoom-out').onclick=()=>zoom(view.z/1.2);$('#zoom-level').onclick=()=>zoom(1);$('#fit').onclick=fit;
$('#grid-toggle').onclick=()=>{board.grid=!board.grid;applyView();save()};$('#snap-toggle').onclick=()=>{board.snap=!board.snap;applyView();save();toast(board.snap?'Snap to grid on':'Snap to grid off')};
$('#delete').onclick=deleteSelected;$('#duplicate').onclick=duplicate;$('#lock').onclick=toggleLock;$('#undo').onclick=undo;$('#redo').onclick=redo;
$('#edit').onclick=()=>{if(selected.size===1)startEdit([...selected][0])};
$('#swatches').onclick=e=>{let c=e.target.dataset.color;if(c)commit(()=>editableNodes().filter(n=>!['image','file','link'].includes(n.type)).forEach(n=>n.color=c))};
$('#inspect').onclick=()=>{inspectorOpen=!inspectorOpen;scenePanelOpen=false;$('#scenes-panel').hidden=true;properties()};$('#close-inspector').onclick=()=>{inspectorOpen=false;properties()};
$('#inspector-body').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.command)command(b.dataset.command);if(b.dataset.alignText)commit(()=>editableNodes().forEach(n=>n.align=b.dataset.alignText));if(b.dataset.align)commit(()=>M.align(editableNodes(),b.dataset.align));if(b.dataset.distribute)commit(()=>M.distribute(editableNodes(),b.dataset.distribute))};
$('#inspector-body').onchange=e=>{const prop=e.target.dataset.prop;if(!prop)return;let value=e.target.value;if(['fontSize','rotation','strokeWidth'].includes(prop)){value=Number(value);if(!Number.isFinite(value))return;if(prop==='fontSize')value=Math.max(8,Math.min(144,value));if(prop==='rotation')value=Math.max(-360,Math.min(360,value))}commit(()=>editableNodes().forEach(n=>{if(prop==='stroke'&&['path','connector'].includes(n.type))n.color=value;else n[prop]=value}))};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.shape-picker'))closeShapes()});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(!$('#shape-menu').hidden){closeShapes();$('#shape-toggle').focus();e.preventDefault();return}
    if(editing){e.preventDefault();finishEdit();document.activeElement?.blur();return}
    if($('#dialog').open)return;if(activeEditor()){document.activeElement.blur();return}
    selected.clear();setTool('select');selectVisual();return;
  }
  if(activeEditor()||$('#dialog').open||!board)return;const mod=e.metaKey||e.ctrlKey,key=e.key.toLowerCase();
  if(e.code==='Space'){e.preventDefault();space=true;$('#canvas').style.cursor='grab';return}
  if(mod){
    if(key==='z'){e.preventDefault();e.shiftKey?redo():undo()}
    if(key==='d'){e.preventDefault();duplicate()}
    if(key==='a'){e.preventDefault();selectIds(board.objects.map(n=>n.id))}
    if(key==='g'){e.preventDefault();command(e.shiftKey?'ungroup':'group')}
    if(key==='f'){e.preventDefault();searchBoard()}
    if(key==='s'){e.preventDefault();save();toast('Saved on this device')}
    return;
  }
  if(['Backspace','Delete'].includes(e.key)){e.preventDefault();deleteSelected();return}
  if(e.key==='Enter'&&selected.size===1){e.preventDefault();startEdit([...selected][0]);return}
  if(e.key.startsWith('Arrow')&&selected.size){e.preventDefault();let step=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;commit(()=>editableNodes().forEach(n=>M.translate(n,dx,dy)));return}
  const map={v:'select',h:'hand',n:'sticky',t:'text',r:'shape',o:'circle',f:'frame',c:'connector',p:'pen'};if(key==='l')linkDialog();else if(map[key])setTool(map[key]);
});
window.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;$('#canvas').style.cursor=tool==='hand'?'grab':tool==='select'?'default':'crosshair'}});
window.addEventListener('blur',()=>{space=false;endPointer()});
window.addEventListener('resize',()=>{closeShapes();applyView()});

function studioSample(){
  const title=node('text',180,65,940,65,'A little inspiration. A lot of possibility.','#303e28',{fontSize:30});
  const subtitle=node('text',184,132,920,40,'Collect the pieces. Find the connections. Make something yours.','#8e9c80',{fontSize:14,fontWeight:400});
  const frames=[node('frame',180,220,320,510,'01  /  COLLECT','transparent'),node('frame',535,220,320,510,'02  /  CONNECT','transparent'),node('frame',890,220,300,510,'03  /  CREATE','transparent')];
  const image=node('image',205,285,270,169,'Color & form study','#ffffff',{src:SAMPLE_IMAGE});
  const resource=node('link',205,480,270,180,'Freeform inspiration','#ffffff',{url:'https://support.apple.com/en-ie/guide/freeform/welcome/mac'});
  const note=node('sticky',568,287,245,155,'What if we made more room\nfor the unexpected?',colors[0],{fontSize:17});
  const diamond=node('diamond',625,493,130,130,'A fresh\nperspective',colors[3],{fontSize:14});
  const next=node('sticky',922,287,235,155,'Start with one small idea.\nSee where it takes you.',colors[1],{fontSize:17});
  const footer=node('text',923,522,230,100,'↗  Add an image or PDF\n↗  Save a view as a scene\n↗  Group and arrange ideas','#7e8c70',{fontSize:13,fontWeight:400});
  const connection={id:uid(),type:'connector',from:note.id,to:diamond.id,color:'#9ca88e',strokeWidth:2};
  return [title,subtitle,...frames,image,resource,note,diamond,next,footer,connection];
}
const SAMPLE_IMAGE="data:image/png;base64,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";

init();

// Flush pending board edits before the updater switches the served app version.
window.sparkboardBeforeUpdate=async()=>{finishEdit();await save();if(!document.querySelector('#saved').textContent.startsWith('✓'))throw Error('Your board could not be saved. Export a backup before updating.');};
