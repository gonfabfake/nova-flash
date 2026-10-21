(() => {
  'use strict';
  const W = 1000, H = 600;
  const stage = document.getElementById('stage');
  const workspace = document.getElementById('workspace');
  const status = document.getElementById('status');
  const assetStatus = document.getElementById('assetStatus');
  const backdrop = document.getElementById('dialogBackdrop');
  const closeDialog = document.getElementById('closeDialog');
  const config = Array.isArray(window.HALL_CONFIG) ? window.HALL_CONFIG : [];
  const locations = {
    shop_mc:['Loja','Acesse os itens, equipamentos e acessórios quando o módulo da loja for conectado.'],
    roomList_mc:['Lista de salas','Aqui ficará a lista de salas e partidas disponíveis no servidor.'],
    store_mc:['Armazém','Consulte os itens guardados no armazém do personagem.'],
    consortia_mc:['Sociedade','Área de guildas e sociedades do jogo.'],
    hotWell_mc:['Spa','Área social e de atividades especiais.'],
    tofflist_mc:['Classificação','Consulte rankings e classificações quando os dados estiverem disponíveis.'],
    campaignLab_mc:['Laboratório de campanhas','Área de campanhas e desafios.'],
    civil_mc:['Centro civil','Área de atividades e serviços da cidade.'],
    active_mc:['Atividades','Explore eventos e atividades disponíveis.'],
    auction_mc:['Leilão','Área destinada ao mercado e leilões.'],
    dungeon_mc:['Masmorras','Área para desafios e expedições.'],
    church_mc:['Igreja','Área social e de cerimônias.'],
    lottery_mc:['Loteria','Área de sorteios e recompensas.']
  };
  let previousFocus = null;
  let loaded = 0, failed = 0, total = 0;
  const countLabel = () => assetStatus.textContent = `Imagens: ${loaded}/${total}${failed ? ` • ${failed} indisponível(is)` : ''}`;
  function resize() {
    const r = workspace.getBoundingClientRect();
    const s = Math.max(.05, Math.min(r.width/W, r.height/H));
    stage.style.transform = `scale(${s})`;
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(workspace);
  window.addEventListener('resize', resize);
  function openLocation(name) {
    previousFocus = document.activeElement;
    const [title,description] = locations[name] || [name, 'Este espaço ainda não possui módulo conectado.'];
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogDescription').textContent = description;
    status.textContent = `${title} selecionado`;
    backdrop.hidden = false;
    closeDialog.focus();
    document.dispatchEvent(new CustomEvent('hall:location', { detail:{ id:name, title } }));
    // Integração: escute o evento hall:location no seu cliente e abra o módulo correspondente.
  }
  function hideDialog() { backdrop.hidden = true; if (previousFocus?.focus) previousFocus.focus(); }
  closeDialog.addEventListener('click', hideDialog);
  document.getElementById('confirmDialog').addEventListener('click', hideDialog);
  backdrop.addEventListener('click', e => {if(e.target === backdrop) hideDialog();});
  window.addEventListener('keydown', e => {
    if(e.key === 'Escape' && !backdrop.hidden) hideDialog();
    if(e.key === 'Tab' && !backdrop.hidden) {
      const nodes = [closeDialog, document.getElementById('confirmDialog')];
      const at = nodes.indexOf(document.activeElement);
      if(e.shiftKey && at === 0){ e.preventDefault(); nodes[1].focus(); }
      else if(!e.shiftKey && at === 1){ e.preventDefault(); nodes[0].focus(); }
    }
  });
  document.getElementById('fitBtn').addEventListener('click', resize);
  document.getElementById('fullBtn').addEventListener('click', async () => {
    try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.getElementById('app').requestFullscreen(); }
    catch { status.textContent = 'Tela cheia não permitida neste navegador.'; }
    resize();
  });
  const fragment = document.createDocumentFragment();
  // Camadas Flash: numeração menor corresponde à camada superior no arquivo exportado.
  config.forEach((item,index) => {
    if(!item || !['symbol','text'].includes(item.type)) return;
    const isNamed = item.type === 'symbol' && typeof item.name === 'string';
    const interactive = isNamed && !item.name.startsWith('txt_');
    const node = document.createElement(interactive ? 'button' : 'div');
    node.className = `el ${interactive ? 'hotspot' : item.type === 'text' ? 'txt' : (isNamed && item.name.startsWith('txt_') ? 'label':'deco')}`;
    const x = Number(item.tx) || 0, y = Number(item.ty) || 0;
    node.style.left = `${x}px`; node.style.top = `${y}px`;
    const layerNumber = Number((item.layer || '').match(/\d+/)?.[0]);
    node.style.zIndex = String(Number.isFinite(layerNumber) && layerNumber > 0 ? 1000-layerNumber : 500-index);
    if (item.type === 'symbol') {
      node.style.transform = `scale(${Number.isFinite(item.scaleX) ? item.scaleX : 1},${Number.isFinite(item.scaleY) ? item.scaleY : 1})`;
      if(item.img) {
        total++;
        const img = document.createElement('img'); img.src = item.img; img.alt = '';
        img.draggable = false;
        img.addEventListener('load',()=>{loaded++;countLabel();});
        img.addEventListener('error',()=>{failed++;countLabel();});
        node.appendChild(img);
      }
      if(interactive) {
        const title = locations[item.name]?.[0] || item.name;
        node.type='button';node.setAttribute('aria-label',`Abrir ${title}`);node.title=title;
        node.addEventListener('click',()=>openLocation(item.name));
        node.addEventListener('pointerenter',()=>{if(backdrop.hidden) status.textContent = title;});
      }
    } else {
      node.textContent = item.text || '';
      if(item.width) node.style.width=`${item.width}px`;
      if(item.height) node.style.height=`${item.height}px`;
      node.style.fontSize=`${Number(item.size)||14}px`;
      if(/^#[\da-f]{3,8}$/i.test(item.color||'')) node.style.color=item.color;
    }
    fragment.appendChild(node);
  });
  stage.appendChild(fragment);
  countLabel();resize();
  status.textContent = `Salão carregado • ${stage.querySelectorAll('.hotspot').length} locais interativos`;
})();
