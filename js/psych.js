/* ═══ Заминки «Ой!» (гл. V, дубль на проваленной боевой проверке) ═══ */
const FUMBLE_TABLE = [
 [1,20,'Потеря плоти','Совершая атаку, вы теряете часть собственной плоти — 1 рана, игнорируя бонус выносливости и доспех.', {hp:-1}],
 [21,40,'Оружие клинит','Рукопашное оружие заклинивает, стрелковое не срабатывает — оружие получает 1 урон. В следующем раунде вы действуете последним: чините оружие.', null],
 [41,60,'Ошибка маневра','Маневр был ошибочен или неверный хват. В следующем раунде ваше действие получает штраф −10.', null],
 [61,70,'Споткнулись','Сложно восстановить равновесие. Вы теряете следующее движение.', null],
 [71,80,'Уронили оружие','Вы уронили оружие или боеприпасы. Вы теряете следующее действие.', null],
 [81,90,'Подвернули лодыжку','Слишком резкое движение. Травма «Порванная мышца (минорная)» — считается критической раной.', {injury:'Порванная мышца (минорная)'}],
 [91,100,'Попали по союзнику','Атака поражает случайного союзника (SL по броску на попадание). Если некому — вы бьёте себя по лицу: 1 «Оглушённый».', {cond:'Оглушённый'}],
];
function fumbleRoll(){
  const d = Math.floor(Math.random()*100)+1;
  const row = FUMBLE_TABLE.find(r => d>=r[0] && d<=r[1]);
  let modal = document.getElementById('crit-modal');
  if(!modal){ modal=document.createElement('div'); modal.id='crit-modal'; modal.className='sv4-roll-modal';
    modal.onclick=()=>modal.classList.remove('show'); document.body.appendChild(modal); }
  const eff = row[4];
  let applyBtn = '';
  if(eff && eff.hp) applyBtn = `<button class="btn btn-sm btn-gold" onclick="state.sheet.currentHP=Math.max(0,(parseInt(state.sheet.currentHP)||0)-1);autosave();notify('−1 рана (без БВ и брони)');this.closest('.sv4-roll-modal').classList.remove('show');if(_sheetTab==='health'||_sheetTab==='crit')renderSheet();">✓ −1 рана</button>`;
  if(eff && eff.injury) applyBtn = `<button class="btn btn-sm btn-gold" onclick="state.sheet.injuries=state.sheet.injuries||[];state.sheet.injuries.push('Заминка: ${eff.injury}');state.sheet.critWounds=(state.sheet.critWounds||0)+1;autosave();notify('Травма записана в увечья (крит. рана)');this.closest('.sv4-roll-modal').classList.remove('show');if(_sheetTab==='health'||_sheetTab==='crit')renderSheet();">✓ Записать травму</button>`;
  if(eff && eff.cond) applyBtn = `<button class="btn btn-sm btn-gold" onclick="sv2CondDelta('${eff.cond}',1);autosave();notify('Наложено: ${eff.cond}');this.closest('.sv4-roll-modal').classList.remove('show');">✓ 1 «${eff.cond}»</button>`;
  modal.innerHTML = `<div class="sv4-roll-card crit-fail" onclick="event.stopPropagation()">
    <div class="sv4-roll-skill">Заминка · таблица «Ой!»</div>
    <div class="sv4-roll-die">${d}</div>
    <div class="sv4-roll-outcome" style="font-size:17px;">${row[2]}</div>
    <p style="font-size:12px;color:var(--text2);margin:8px 4px;text-align:left;line-height:1.45;">${row[3]}</p>
    <p class="muted" style="font-size:10px;margin:4px;">Порох/взрывное/инженерное: заминка = ОСЕЧКА — весь урон в ведущую руку, оружие уничтожено.</p>
    <div class="sv4-row" style="gap:8px;justify-content:center;flex-wrap:wrap;">
      ${applyBtn}
      <button class="btn btn-sm" onclick="this.closest('.sv4-roll-modal').classList.remove('show')">Закрыть</button>
    </div></div>`;
  modal.classList.add('show');
  try{ state.sheet.rollLog=state.sheet.rollLog||[]; state.sheet.rollLog.unshift({name:'Заминка «Ой!»', target:0, d, outcome:row[2], sl:'', t:Date.now()}); if(state.sheet.rollLog.length>30)state.sheet.rollLog.length=30; autosave(); }catch(e){}
}

/* ═══ Психология (гл. V): страх, ужас, бешенство ═══ */
function psyCoolTarget(){
  const c = sheetCalc();
  return (c.totals['СВ']||0) + (typeof skillAdvancesTotal==='function' ? (skillAdvancesTotal('хладнокровие')||0) : 0);
}
function psyState(){ state.sheet.psych = state.sheet.psych || {fearRank:0, fearSL:0, fearActive:false, frenzy:false}; return state.sheet.psych; }
function psyFearStart(){
  const r = parseInt(prompt('Ранг страха существа (например, 1–3):','1'))||0;
  if(r<=0) return;
  const p = psyState(); p.fearRank=r; p.fearSL=0; p.fearActive=true;
  autosave(); renderTabHealth();
}
function psyFearRoll(){
  const p = psyState(); if(!p.fearActive) return;
  const target = psyCoolTarget();
  const d = Math.floor(Math.random()*100)+1;
  const sl = Math.trunc(target/10)-Math.trunc(d/10);
  p.fearSL = Math.max(0, p.fearSL + sl);
  const done = p.fearSL >= p.fearRank;
  if(done) p.fearActive = false;
  if(typeof showRollResult==='function')
    showRollResult('Страх: хладнокровие', target, d, done?'Страх преодолён!':'Копим самообладание', done?'success':(sl>=0?'success':'fail'), (sl>=0?'+':'')+sl+' SL · всего '+p.fearSL+' / '+p.fearRank);
  autosave(); renderTabHealth();
}
function psyTerror(){
  const r = parseInt(prompt('Ранг ужаса существа:','2'))||0;
  if(r<=0) return;
  const target = psyCoolTarget();
  const d = Math.floor(Math.random()*100)+1;
  const sl = Math.trunc(target/10)-Math.trunc(d/10);
  if(d <= target){
    if(typeof showRollResult==='function') showRollResult('Ужас: хладнокровие', target, d, 'Устоял', 'success', '+'+sl+' SL — ужас не берёт');
  } else {
    const broken = r + Math.max(0, -sl);
    for(let k=0;k<broken;k++) sv2CondDelta('Сломленный', 1);
    if(typeof showRollResult==='function') showRollResult('Ужас: хладнокровие', target, d, 'УЖАС!', 'crit-fail', broken+' × «Сломленный» ('+r+' ранг '+(Math.max(0,-sl))+' за SL)');
    notify('Наложено '+broken+' «Сломленный». Далее существо вызывает страх ('+r+').');
    const p = psyState(); p.fearRank=r; p.fearSL=0; p.fearActive=true;
  }
  autosave(); renderTabHealth();
}
function psyFrenzy(){
  const p = psyState();
  if(p.frenzy){
    p.frenzy=false; sv2CondDelta('Уставший',1);
    notify('Бешенство окончено — 1 «Уставший».');
    autosave(); renderTabHealth(); return;
  }
  const c = sheetCalc(); const target = c.totals['СВ']||0;
  const d = Math.floor(Math.random()*100)+1;
  if(d <= target){
    p.frenzy = true;
    if(typeof showRollResult==='function') showRollResult('Бешенство: сила воли', target, d, 'БЕШЕНСТВО!', 'crit-success', '+1 БС · иммунитет к психологии · только атака');
  } else {
    if(typeof showRollResult==='function') showRollResult('Бешенство: сила воли', target, d, 'Не завёлся', 'fail', 'ярость не приходит');
  }
  autosave(); renderTabHealth();
}
