/* ═══ Болезни и инфекции (гл. V, «Литания чумы») ═══ */
const DISEASES = {
 'Малая инфекция': { inc:'1d10 дн', dur:'1d10 дн', sym:'затяжная (лёгкая), слабость, раненый',
   note:'Заражение: провал очень лёгкой (+60) проверки В после боя с критической раной.' },
 'Гнойные раны': { inc:'1d10 дн', dur:'1d10 дн', sym:'лихорадка, затяжная (серьёзная), слабость, раненый',
   note:'От существ с чертой «Инфицированный» или как развитие малой инфекции.' },
 'Кровавая гниль': { inc:'мгновенно', dur:'1d10 дн', sym:'ПАГУБА (ежедневная проверка В или смерть!), лихорадка (острая), слабость',
   note:'Развитие болезни или критической раны. Без лечения смертельна.' },
 'Зудящая оспа': { inc:'1d10 дн', dur:'1d10+7 дн', sym:'кашель и чихание, оспа', note:'После — иммунитет.' },
 'Оспа Пакера': { inc:'1d10 дн', dur:'5d10 дн', sym:'затяжная (серьёзная), оспа', note:'От скота, шкур, тел жертв.' },
 'Крысиная лихорадка': { inc:'3d10+5 дн', dur:'3d10+10 дн', sym:'конвульсии, лихорадка, затяжная (средняя), слабость, оспа, раненый',
   note:'От ран грызунов/скавенов или заражённой еды.' },
 'Скачущая диарея': { inc:'1d10 ч', dur:'1d10 дн', sym:'понос (умеренный), слабость, тошнота', note:'Заражённая пища.' },
 'Кровавый понос': { inc:'2d10 дн', dur:'1d10 дн', sym:'понос (острый), затяжная (серьёзная), лихорадка, слабость, тошнота', note:'Заражённая пища.' },
 'Чёрная чума': { inc:'1d10 мин', dur:'2d10 дн', sym:'бубоны, ПАГУБА (умеренная), лихорадка, гангрена, слабость', note:'Блохи и заражённые жидкости. Карантин Шаллии.' },
};
function diseaseAdd(name){
  const d = DISEASES[name]; if(!d) return;
  state.sheet.diseases = state.sheet.diseases || [];
  state.sheet.diseases.push({ name, inc:d.inc, dur:d.dur, sym:d.sym, day:0, phase:'инкубация' });
  if(typeof autosave==='function') autosave();
  renderTabHealth();
}
function diseaseDay(i, delta){
  const d = (state.sheet.diseases||[])[i]; if(!d) return;
  d.day = Math.max(0, (d.day||0) + delta);
  if(typeof autosave==='function') autosave();
  renderTabHealth();
}
function diseasePhase(i){
  const d = (state.sheet.diseases||[])[i]; if(!d) return;
  d.phase = d.phase==='инкубация' ? 'болезнь' : (d.phase==='болезнь' ? 'излечена' : 'инкубация');
  d.day = 0;
  if(typeof autosave==='function') autosave();
  renderTabHealth();
}
function diseaseDel(i){
  (state.sheet.diseases||[]).splice(i,1);
  if(typeof autosave==='function') autosave();
  renderTabHealth();
}
/* Проверка малой инфекции после боя с критом: очень лёгкая (+60) выносливость */
function sv2InfectionCheck(){
  const calc = sheetCalc();
  const target = (calc.totals['В']||0) + 60;
  const d = Math.floor(Math.random()*100)+1;
  const ok = d <= target;
  if(typeof showRollResult==='function')
    showRollResult('Малая инфекция: выносливость', target, d, ok?'Заражения нет':'ЗАРАЖЕНИЕ', ok?'success':'fail', ok?'рана чистая':'малая инфекция!');
  if(!ok){ diseaseAdd('Малая инфекция'); notify('Малая инфекция добавлена в болезни (инкубация 1d10 дней).'); }
}
