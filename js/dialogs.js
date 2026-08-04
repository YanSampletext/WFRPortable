/* ═══ Диалоги в стиле дела Ордо вместо нативных confirm/prompt ═══ */
function ordoDialogClose(){
  const d = document.getElementById('ordo-dlg');
  if(d){ d.classList.remove('show'); d.innerHTML = ''; }
  document.removeEventListener('keydown', _ordoDlgKey);
}
function _ordoDlgKey(e){ if(e.key === 'Escape') ordoDialogClose(); }
function _ordoDialogShell(inner){
  let d = document.getElementById('ordo-dlg');
  if(!d){
    d = document.createElement('div'); d.id = 'ordo-dlg'; d.className = 'ordo-dlg-back';
    d.addEventListener('click', (e)=>{ if(e.target === d) ordoDialogClose(); });
    document.body.appendChild(d);
  }
  d.innerHTML = `<div class="ordo-dlg-card" role="dialog" aria-modal="true">${inner}</div>`;
  d.classList.add('show');
  document.addEventListener('keydown', _ordoDlgKey);
  return d;
}
/* Да / Нет. onYes — что делать при согласии. danger:true — красная кнопка. */
function ordoConfirm(opts){
  const o = opts || {};
  const yes = o.yes || 'Да';
  const no  = o.no  || 'Отмена';
  _ordoDialogShell(`
    <div class="ordo-dlg-seal">✠</div>
    <div class="ordo-dlg-title">${o.title || 'Подтверждение'}</div>
    <div class="ordo-dlg-text">${o.text || ''}</div>
    <div class="ordo-dlg-btns">
      <button class="ordo-dlg-btn ${o.danger ? 'danger' : 'gold'}" id="ordo-dlg-yes">${yes}</button>
      <button class="ordo-dlg-btn" onclick="ordoDialogClose()">${no}</button>
    </div>`);
  const yb = document.getElementById('ordo-dlg-yes');
  yb.onclick = () => { ordoDialogClose(); if(typeof o.onYes === 'function') o.onYes(); };
  setTimeout(()=>{ try{ yb.focus(); }catch(e){} }, 30);
}
/* Несколько равноправных вариантов: options:[{label, danger, cb}] */
function ordoChoice(opts){
  const o = opts || {}; const list = o.options || [];
  _ordoDialogShell(`
    <div class="ordo-dlg-seal">✠</div>
    <div class="ordo-dlg-title">${o.title || 'Выбор'}</div>
    <div class="ordo-dlg-text">${o.text || ''}</div>
    <div class="ordo-dlg-btns col">
      ${list.map((x,i)=>`<button class="ordo-dlg-btn ${x.danger?'danger':(i===0?'gold':'')}" data-i="${i}">${x.label}</button>`).join('')}
      <button class="ordo-dlg-btn ghost" onclick="ordoDialogClose()">${o.cancel || 'Отмена'}</button>
    </div>`);
  document.querySelectorAll('#ordo-dlg .ordo-dlg-btn[data-i]').forEach(btn => {
    btn.onclick = () => {
      const item = list[parseInt(btn.dataset.i)];
      ordoDialogClose();
      if(item && typeof item.cb === 'function') item.cb();
    };
  });
}
/* Просто сообщение с одной кнопкой */
function ordoAlert(opts){
  const o = opts || {};
  _ordoDialogShell(`
    <div class="ordo-dlg-seal">✠</div>
    <div class="ordo-dlg-title">${o.title || 'Сообщение'}</div>
    <div class="ordo-dlg-text">${o.text || ''}</div>
    <div class="ordo-dlg-btns">
      <button class="ordo-dlg-btn gold" onclick="ordoDialogClose()">${o.ok || 'Понятно'}</button>
    </div>`);
}
/* Выбор числа кнопками (без клавиатуры) — для рангов страха/ужаса */
function ordoNumber(opts){
  const o = opts || {};
  const min = o.min || 1, max = o.max || 5;
  let btns = '';
  for(let i = min; i <= max; i++) btns += `<button class="ordo-dlg-num" data-v="${i}">${i}</button>`;
  _ordoDialogShell(`
    <div class="ordo-dlg-seal">✠</div>
    <div class="ordo-dlg-title">${o.title || 'Значение'}</div>
    <div class="ordo-dlg-text">${o.text || ''}</div>
    <div class="ordo-dlg-nums">${btns}</div>
    <div class="ordo-dlg-btns"><button class="ordo-dlg-btn ghost" onclick="ordoDialogClose()">Отмена</button></div>`);
  document.querySelectorAll('#ordo-dlg .ordo-dlg-num').forEach(btn => {
    btn.onclick = () => { const v = parseInt(btn.dataset.v); ordoDialogClose(); if(typeof o.onPick==='function') o.onPick(v); };
  });
}
/* Текстовый ввод в стиле приложения */
function ordoInput(opts){
  const o = opts || {};
  _ordoDialogShell(`
    <div class="ordo-dlg-seal">✠</div>
    <div class="ordo-dlg-title">${o.title || 'Ввод'}</div>
    <div class="ordo-dlg-text">${o.text || ''}</div>
    <input id="ordo-dlg-input" class="ordo-dlg-input" value="${(o.value||'').replace(/"/g,'&quot;')}" />
    <div class="ordo-dlg-btns">
      <button class="ordo-dlg-btn gold" id="ordo-dlg-ok">Готово</button>
      <button class="ordo-dlg-btn" onclick="ordoDialogClose()">Отмена</button>
    </div>`);
  const inp = document.getElementById('ordo-dlg-input');
  document.getElementById('ordo-dlg-ok').onclick = () => {
    const v = inp.value; ordoDialogClose(); if(typeof o.onOk==='function') o.onOk(v);
  };
  inp.onkeydown = (e)=>{ if(e.key==='Enter'){ const v=inp.value; ordoDialogClose(); if(typeof o.onOk==='function') o.onOk(v); } };
  setTimeout(()=>{ try{ inp.focus(); inp.select(); }catch(e){} }, 40);
}
