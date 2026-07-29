/* 🛌 Восстановление здоровья (гл. V «Исцеление») */
function sv2HealBy(n, label){
  const calc = sheetCalc();
  const before = parseInt(state.sheet.currentHP)||0;
  const after = Math.min(calc.maxHP, before + Math.max(0,n));
  state.sheet.currentHP = after;
  if(typeof autosave==='function') autosave();
  const box=document.getElementById('rest-verdict');
  if(box) box.innerHTML = `<p style="font-size:12px;color:var(--gold2);margin:8px 0 0;">${label}: +${after-before} ран (${before} → ${after}${after>=calc.maxHP?' — полное здоровье':''})</p>`;
  renderTabHealth();
  const box2=document.getElementById('rest-verdict');
  if(box2) box2.innerHTML = `<p style="font-size:12px;color:var(--gold2);margin:8px 0 0;">${label}: +${after-before} ран (${before} → ${after}${after>=calc.maxHP?' — полное здоровье ✓':''})</p>`;
}
function sv2RestSleep(){
  const calc = sheetCalc();
  const target = (calc.totals['В']||0) + 20;
  const d = Math.floor(Math.random()*100)+1;
  const sl = Math.trunc(target/10) - Math.trunc(d/10);
  if(d <= target){
    const healed = Math.max(1, sl + calc.RVb);
    if(typeof showRollResult==='function') showRollResult('Сон: выносливость', target, d, 'Успех', 'success', '+'+sl+' ст.усп. → лечит '+healed);
    sv2HealBy(healed, '🌙 Сон (d100='+d+', SL +'+sl+' + БВ '+calc.RVb+')');
  } else {
    if(typeof showRollResult==='function') showRollResult('Сон: выносливость', target, d, 'Провал', 'fail', sl+' ст.усп. — раны не лечатся');
    const box=document.getElementById('rest-verdict');
    if(box) box.innerHTML = `<p style="font-size:12px;color:var(--text3);margin:8px 0 0;">Сон беспокойный (d100=${d} против ${target}) — раны этой ночью не заживают.</p>`;
  }
}
function sv2RestDay(){
  const calc = sheetCalc();
  sv2HealBy(calc.RVb, '☀ День отдыха (+БВ '+calc.RVb+')');
}
function sv2DrinkPotion(){
  const hp = parseInt(state.sheet.currentHP)||0;
  if(hp <= 0){ notify('Зелье не действует при 0 ран — нужен лекарь, магия или молитва.'); return; }
  if(state.sheet.potionUsedScene){ notify('Целебное зелье уже выпито в этой сцене (лимит: 1 за сцену).'); return; }
  const calc = sheetCalc();
  state.sheet.potionUsedScene = true;
  sv2HealBy(calc.RVb, '🧪 Целебное зелье (+БВ '+calc.RVb+')');
  notify('Целебное зелье выпито: +'+calc.RVb+' ран. Следующее — в новой сцене.');
}

/* ☠ Проверка смерти по правилам WFRP4 (гл. V) */
function sv2DeathCheck(){
  const calc = sheetCalc();
  const hp = parseInt(state.sheet.currentHP)||0;
  const tb = calc.RVb;
  const crit = (state.sheet.critWounds!=null) ? state.sheet.critWounds : (state.sheet.injuries||[]).length;
  const fate = calc.fate;
  const box = document.getElementById('death-verdict');
  let html='';
  if(hp>0){
    html = `<p style="font-size:12px;color:var(--gold2);margin:8px 0 0;">Жив. Ран осталось ${hp} — правила смерти срабатывают только при 0 ран.</p>`;
  } else if(crit<=tb){
    html = `<p style="font-size:12px;color:var(--gold2);margin:8px 0 0;">На грани: 0 ран — «Лежащий»; без исцеления через ${tb} раунд(а) — «Бессознательный». Критов ${crit} ≤ БВ ${tb}: пока жив, но бессознательного любой враг может добить.</p>`;
  } else {
    html = `<p style="font-size:12px;color:#c75b4a;margin:8px 0 0;"><b>Смертельно:</b> критов ${crit} &gt; БВ ${tb}. Персонаж умрёт в конце раунда, если никто не исцелит одну критическую рану.</p>
      <div class="sv4-row" style="gap:8px;margin-top:8px;flex-wrap:wrap;">
        ${fate>0?`<button class="btn btn-sm btn-gold" onclick="sv2SpendFate()">✴ Потратить очко Судьбы (${fate} → ${fate-1})</button>`:`<span class="muted" style="font-size:11px;">Очков Судьбы не осталось — остаётся уповать на лекаря…</span>`}
        <button class="btn btn-sm btn-red" onclick="sv2MarkDead()">☠ Морр принял</button>
      </div>`;
  }
  if(box) box.innerHTML = html;
}
function sv2SpendFate(){
  state.sheet.fateSpent = (state.sheet.fateSpent||0)+1;
  const calc = sheetCalc();
  if(state.sheet.currentLuck!=null) state.sheet.currentLuck = Math.min(state.sheet.currentLuck, calc.fate);
  if(typeof autosave==='function') autosave();
  notify('Очко Судьбы потрачено навсегда — смерть отступила.');
  renderTabHealth();
  const box=document.getElementById('death-verdict');
  if(box) box.innerHTML = `<p style="font-size:12px;color:var(--gold2);margin:8px 0 0;">Судьба вмешалась: персонаж чудом выживает — 0 ран, без сознания, но вне опасности. Судьба навсегда −1 (теперь ${calc.fate}).</p>`;
}
function sv2MarkDead(){
  state.sheet.gmDead = true;
  if(typeof autosave==='function') autosave();
  notify('Дело закрыто. Морр принял.');
  if(typeof goStep==='function') goStep(8);
  try{ if(typeof sv4NavGo==='function') sv4NavGo('persona'); }catch(e){}
}
