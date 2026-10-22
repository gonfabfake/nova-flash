type Action = 'dialog'|'navigate'|'event'|'none';
type Item = { uid:string;type:'symbol'|'text';name:string;img:string;x:number;y:number;sx:number;sy:number;layer:number;rotation:number;visible:boolean;action:Action;title:string;destination:string;symbol:number|null;text?:string;size?:number;color?:string };
type Layout = {version:number;elements:Omit<Item,'uid'>[]};
type Legacy = {type:string;name?:string|null;img?:string|null;tx?:number;ty?:number;scaleX?:number;scaleY?:number;layer?:string;symbol?:number;text?:string;size?:number;color?:string};
const labels:Record<string,string>={shop_mc:'Loja',roomList_mc:'Lista de salas',store_mc:'Armazém',consortia_mc:'Sociedade',hotWell_mc:'Spa',tofflist_mc:'Classificação',campaignLab_mc:'Laboratório',civil_mc:'Centro civil',active_mc:'Atividades',auction_mc:'Leilão',dungeon_mc:'Masmorras',church_mc:'Igreja',lottery_mc:'Loteria'};
const $=(id:string)=>document.getElementById(id)!;
const stage=$('stage'),viewport=$('viewport'),objects=$('objects');
stage.style.backgroundImage='url("'+import.meta.env.BASE_URL+'assets/bg.png")';
const config=(window as unknown as {HALL_CONFIG?:Legacy[]}).HALL_CONFIG||[];
let seq=0, selected='',zoom=1;
const items:Item[]=config.filter(o=>o.type==='symbol'||o.type==='text').map(o=>({uid:'obj'+ ++seq,type:o.type as 'symbol'|'text',name:o.name||'',img:o.img||'',x:o.tx??0,y:o.ty??0,sx:o.scaleX??1,sy:o.scaleY??1,layer:Number(o.layer?.match(/\d+/)?.[0])||seq,rotation:0,visible:true,action:o.name&&!o.name.startsWith('txt_')?'dialog':'none',title:labels[o.name||'']||o.name||'',destination:'Módulo ainda não conectado',symbol:o.symbol??null,text:o.text,size:o.size,color:o.color}));
selected=items[0]?.uid||'';
const keys=['name','img','x','y','sx','sy','layer','rotation','visible','action','title','destination'] as const;
const numeric=new Set(['x','y','sx','sy','layer','rotation']);
const current=()=>items.find(o=>o.uid===selected);
const status=(value:string)=>{$('status').textContent=value;};
function assetPath(path:string){return import.meta.env.BASE_URL+path.replace(/^\/+/,'');}
function fit(){zoom=Math.max(.2,Math.min(viewport.clientWidth/1000,viewport.clientHeight/600));scale();}
function scale(){stage.style.transform='scale('+zoom+')';}
function list(){
 const term=($('filter') as HTMLInputElement).value.toLowerCase();objects.replaceChildren();
 for(const o of items){if(!(o.name+' '+o.img+' '+o.symbol).toLowerCase().includes(term))continue;
  const b=document.createElement('button');b.textContent=(o.name||o.text||o.symbol||'Imagem')+' • '+o.layer;
  if(o.uid===selected)b.className='active';b.onclick=()=>select(o.uid);objects.append(b);}
}
function form(){const o=current();for(const key of keys){const input=$(key) as HTMLInputElement|HTMLSelectElement;input.toggleAttribute('disabled',!o);if(!o)continue;
 if(key==='visible')(input as HTMLInputElement).checked=o.visible;
 else input.value=String(o[key]??'');
}}
function select(uid:string){selected=uid;for(const child of Array.from(stage.children) as HTMLElement[])child.classList.toggle('selected',child.dataset.uid===uid);list();form();}
function render(){
 stage.replaceChildren();items.sort((a,b)=>b.layer-a.layer);
 for(const o of items){const node=document.createElement('div');node.className='sprite'+(o.uid===selected?' selected':'');
 node.dataset.uid=o.uid;node.style.left=o.x+'px';node.style.top=o.y+'px';node.style.zIndex=String(1000-o.layer);
 node.style.transform='rotate('+o.rotation+'deg) scale('+o.sx+','+o.sy+')';node.style.display=o.visible?'block':'none';
 if(o.img){const image=document.createElement('img');image.src=assetPath(o.img);image.draggable=false;image.alt='';
 image.onerror=()=>{node.classList.add('error');node.title='Imagem não encontrada: '+o.img;};node.append(image);}
 else{node.classList.add('error');node.textContent=o.text||o.name||'Imagem sem caminho';}
 node.onpointerdown=e=>{if(e.button!==0)return;select(o.uid);drag={uid:o.uid,px:e.clientX,py:e.clientY,x:o.x,y:o.y};stage.setPointerCapture(e.pointerId);e.preventDefault();};
 stage.append(node);}
 list();form();$('summary').textContent=items.length+' objetos, '+items.filter(x=>x.img).length+' imagens, '+items.filter(x=>x.action!=='none').length+' interações.';
}
let drag:{uid:string;px:number;py:number;x:number;y:number}|null=null;
stage.onpointermove=e=>{if(!drag)return;const o=items.find(x=>x.uid===drag!.uid);if(!o)return;
 o.x=Math.round((drag.x+(e.clientX-drag.px)/zoom)*10)/10;o.y=Math.round((drag.y+(e.clientY-drag.py)/zoom)*10)/10;
 const child=(Array.from(stage.children) as HTMLElement[]).find(x=>x.dataset.uid===o.uid);if(child){child.style.left=o.x+'px';child.style.top=o.y+'px';}
 ($('x') as HTMLInputElement).value=String(o.x);($('y') as HTMLInputElement).value=String(o.y);};
stage.onpointerup=()=>{if(drag){drag=null;render();status('Posição ajustada. Exporte para aplicar.');}};
stage.onpointercancel=()=>{drag=null;};
for(const key of keys){$(key).addEventListener('input',()=>{const o=current();if(!o)return;const el=$(key) as HTMLInputElement;
 const value=key==='visible'?el.checked:numeric.has(key)?Number(el.value):el.value;
 (o as unknown as Record<string,unknown>)[key]=value;render();});}
$('filter').oninput=list;
document.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||!current())return;
 if(['INPUT','SELECT','TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName))return;e.preventDefault();
 const o=current()!,d=e.shiftKey?10:1;
 if(e.key==='ArrowUp')o.y-=d;if(e.key==='ArrowDown')o.y+=d;
 if(e.key==='ArrowLeft')o.x-=d;if(e.key==='ArrowRight')o.x+=d;render();});
$('add').onclick=()=>{const uid='obj'+ ++seq;items.push({uid,type:'symbol',name:'novo_'+seq,img:'',x:400,y:250,sx:1,sy:1,layer:1,rotation:0,visible:true,action:'dialog',title:'Nova área',destination:'',symbol:null});selected=uid;render();};
$('clone').onclick=()=>{const o=current();if(!o)return;const uid='obj'+ ++seq;items.push({...o,uid,name:o.name+'_copia',x:o.x+20,y:o.y+20});selected=uid;render();};
$('del').onclick=()=>{const ix=items.findIndex(o=>o.uid===selected);if(ix<0)return;items.splice(ix,1);selected=items[0]?.uid||'';render();};
$('fit').onclick=fit;$('plus').onclick=()=>{zoom=Math.min(2,zoom+.1);scale();};$('minus').onclick=()=>{zoom=Math.max(.2,zoom-.1);scale();};
new ResizeObserver(fit).observe(viewport);
const serialize=():Layout=>({version:1,elements:items.map(({uid,...o})=>({...o}))});
function restore(value:unknown){if(!value||typeof value!=='object')throw Error('Projeto inválido');
 const d=value as Layout;if(d.version!==1||!Array.isArray(d.elements))throw Error('Formato JSON inválido');
 items.splice(0,items.length,...d.elements.filter(o=>o&&['text','symbol'].includes(o.type)).map(o=>({...o,uid:'obj'+ ++seq,
 x:Number(o.x)||0,y:Number(o.y)||0,sx:Number(o.sx??1),sy:Number(o.sy??1),layer:Number(o.layer)||1,rotation:Number(o.rotation)||0,
 visible:o.visible!==false,action:(['dialog','navigate','event','none'].includes(o.action)?o.action:'none') as Action})));
 selected=items[0]?.uid||'';render();}
$('save').onclick=()=>{localStorage.setItem('ddtank-editor-v1',JSON.stringify(serialize()));status('Projeto salvo no navegador.');};
$('restore').onclick=()=>{try{restore(JSON.parse(localStorage.getItem('ddtank-editor-v1')||'null'));status('Projeto restaurado.');}catch(e){status(String(e));}};
$('import').onclick=()=>($('upload') as HTMLInputElement).click();
($('upload') as HTMLInputElement).onchange=async e=>{const input=e.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;
 try{restore(JSON.parse(await file.text()));status('Projeto importado.');}catch(err){status(String(err));}input.value='';};
function download(name:string,content:string,type='text/plain'){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$('json').onclick=()=>download('hall-layout.json',JSON.stringify(serialize(),null,2),'application/json');
$('config').onclick=()=>{
 const payload=items.map(o=>({type:o.type,layer:'Layer '+o.layer,symbol:o.symbol,name:o.name,tx:o.x,ty:o.y,scaleX:o.sx,scaleY:o.sy,img:o.img||null,text:o.text,size:o.size,color:o.color,rotation:o.rotation,visible:o.visible,action:o.action,title:o.title,destination:o.destination}));
 download('config.js','window.HALL_CONFIG = '+JSON.stringify(payload,null,2)+';\n','application/javascript');
};
$('css').onclick=()=>download('hall-custom.css','/* CSS opcional para o salão */\n#game{overflow:hidden}\n.hall-location-controls{z-index:2}\n','text/css');
$('actions').onclick=()=>{
 const rules=Object.fromEntries(items.filter(x=>x.name&&x.action!=='none').map(o=>[o.name,{action:o.action,title:o.title,destination:o.destination}]));
 const script='/* Instale como script de módulo no salão. */\n'+
 'const rules='+JSON.stringify(rules,null,2)+';\n'+
 'document.addEventListener("hall:location",event=>{const rule=rules[event.detail?.id];if(!rule)return;\n'+
 'if(rule.action==="navigate"){const route=rule.destination||"";if(/^\\/(?!\\/)[\\w/.?#&=%-]+$/.test(route)&&!route.includes(".."))location.href=route;}\n'+
 'if(rule.action==="event")document.dispatchEvent(new CustomEvent("ddtank:module",{detail:{id:event.detail.id,command:rule.destination}}));\n'+
 '});\n';
 download('hall-actions.js',script,'application/javascript');
};
$('test').onclick=()=>{const o=current();if(!o)return;
 if(o.action==='event'||o.action==='navigate'){status(o.action+': '+o.destination+' (prévia sem navegação)');return;}
 if(o.action==='none'){status('Nenhuma ação configurada.');return;}
 $('modalTitle').textContent=o.title||o.name;$('modalText').textContent=o.destination||'Módulo em desenvolvimento';($('modal') as HTMLDialogElement).showModal();};
$('close').onclick=()=>($('modal') as HTMLDialogElement).close();
render();fit();status('Editor pronto: selecione e arraste as imagens.');
