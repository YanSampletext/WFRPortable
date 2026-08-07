/* ===== INJECTED: ARCANE/FAITH/MUTATION MODULE ===== */
/* ==========================================================================
   МОДУЛЬ: МАГИЯ · ВЕРА · СКВЕРНА→МУТАЦИИ  (WFRP4, гл. VII–VIII)
   Реализована механика. Тексты эффектов — краткие функциональные формулировки
   своими словами (не дословный текст книги).
   ========================================================================== */

// --- Таблицы d100 (диапазоны включительны). Эффекты сжаты до сути. ---
const ARC_MINOR_MISCAST = [
  [1,5,'Знак Ведьмы: следующее живое существо, рождённое в пределах 1 мили, будет мутантом.'],
  [6,10,'Скисшее Молоко: всё молоко в пределах 1d100 ярдов мгновенно скисает.'],
  [11,15,'Гниение: посевы на [БСВ] полях в радиусе [БСВ] миль сгнивают за одну ночь.'],
  [16,20,'Воск Души: уши забиты воском — 1 «Оглохший», не проходит, пока уши не прочистят успешной проверкой лечения.'],
  [21,25,'Колдовской Свет: светишься цветом своего Знания как большой костёр, 1d10 раундов.'],
  [26,30,'Тёмный Шёпот: средняя (+20) проверка силы воли или 1 очко порчи.'],
  [31,35,'Разрыв: кровь из носа, ушей и глаз — 1d10 состояний «Кровоточащий».'],
  [36,40,'Духовная Встряска: получаешь состояние «Лежащий».'],
  [41,45,'Развязывание: все пряжки расстёгиваются, шнурки развязываются — падают ремни, мешки, броня.'],
  [46,50,'Своенравный Костюм: одежда живёт своей жизнью — 1 «Опутанный» с силой 1d10×5.'],
  [51,55,'Проклятие Умеренности: весь алкоголь в 1d100 ярдах портится, горкнет и воняет.'],
  [56,60,'Истощение Душ: 1 «Уставший» на 1d10 часов.'],
  [61,65,'Отвлечение: в бою — «Ошеломлённый»; вне боя не можешь сосредоточиться несколько минут.'],
  [66,70,'Нечестивые Видения: 1 «Ослепший»; серьёзная (+0) проверка хладнокровия или ещё одно.'],
  [71,75,'Заплетающийся Язык: −10 ко всем проверкам языка (включая сотворение) на 1d10 раундов.'],
  [76,80,'Ужас!: трудная (−20) проверка хладнокровия или 1 «Сломленный».'],
  [81,85,'Проклятие Скверны: получи 1 очко порчи.'],
  [86,90,'Двойная Неприятность: эффект твоего заклинания срабатывает в другом месте в пределах 1d10 миль.'],
  [91,95,'Приумножение Несчастий: два броска по этой таблице, перебрасывая 91–00.'],
  [96,100,'Каскад Хаоса: бросай по таблице «Крупные ошибки».'],
];
const ARC_MAJOR_MISCAST = [
  [1,5,'Призрачные Голоса: все в [СВ] ярдах слышат голоса Царства Хаоса — средняя (+20) проверка хладнокровия или 1 очко порчи (для разумных).'],
  [6,10,'Ведьмин Взор: глаза меняют цвет на 1d10 часов; на это время 1 «Ослепший», который нельзя снять ничем.'],
  [11,15,'Эфирный Шок: 1d10 ран, игнорируя бонус выносливости и очки доспеха; средняя (+20) проверка выносливости или «Оглушённый».'],
  [16,20,'Поступь Смерти: 1d10 часов вся растительность рядом с тобой увядает и умирает.'],
  [21,25,'Кишечный Бунт: пачкаешь себя — 1 «Уставший», не снимается, пока не переоденешься и не отмоешься.'],
  [26,30,'Духовное Пламя: «Горящий» — тебя охватывает неестественное пламя цвета твоего Знания.'],
  [31,35,'Язык без Костей: 1d10 раундов тараторишь — не можешь говорить и творить заклинания.'],
  [36,40,'Копошение: тебя связывает боем эфирный рой (крысы/пауки/змеи, черта «Рой»); через 1d10 раундов рассеивается.'],
  [41,45,'Тряпичная Кукла: подброшен на 1d10 ярдов — 1d10 ран при падении (игнор очков доспеха) и «Лежащий».'],
  [46,50,'Обморожение Конечности: случайная конечность заморожена на 1d10 часов — бесполезна, как при ампутации.'],
  [51,55,'Тёмный Взгляд: теряешь «Второе зрение» на 1d10 часов; проверки концентрации −20 всё это время.'],
  [56,60,'Предвиденье Хаоса: бонусный пул 1d10 очков удачи (можно сверх лимита); каждая трата — 1 очко порчи; неистраченные сгорают в конце сессии.'],
  [61,65,'Левитация: паришь в 1d10 ярдах над землёй 1d10 минут; по окончании — правила падения.'],
  [66,70,'Отрыжка: неудержимая рвота — «Оглушённый» на 1d10 раундов.'],
  [71,75,'Тряска Хаоса: все существа в 1d100 ярдах — средняя (+20) проверка атлетики или «Лежащий».'],
  [76,80,'Сердце Предателя: предай/атакуй союзника в полную силу — вернёшь все очки удачи; лиши другого очка судьбы — получи +1 судьбы.'],
  [81,85,'Нечистивая Слабость: 1 очко порчи, «Уставший» и «Лежащий».'],
  [86,90,'Адская Вонь: черта «Отвлекающий» и всеобщая неприязнь на 1d10 часов.'],
  [91,95,'Утечка Силы: 1d10 минут не можешь использовать таланты сотворения (тайная магия, магия Хаоса и т.п.).'],
  [96,100,'Эфирный Отклик: каждый в [БСВ] ярдах получает 1d10 ран (игнор БВ и доспеха) и «Лежащий»; если целей нет — твоя голова взрывается, мгновенная смерть.'],
];
const WRATH_OF_GODS = [
  [1,5,'Священные видения: средняя (+20) проверка выносливости, при провале — 1 «Оглушённый». Видения задаёт GM.'],
  [6,10,'Подумай над своими делами: неделю успешные проверки молитвы дают не больше +0 SL.'],
  [11,15,'Прислушайся к моим урокам: −10 к молитве на [1d10+грех] раундов.'],
  [16,20,'Докажи преданность: «Лежащий», не снимается до успеха средней (+20) проверки молитвы.'],
  [21,25,'Ты испытываешь моё терпение: нельзя молиться 1d10 раундов.'],
  [26,30,'Ты не понимаешь мои намерения: −10 к умениям, связанным с божеством, на [1d10+грех] часов.'],
  [31,35,'Недостаток веры: нельзя молиться [1d10+грех] раундов.'],
  [36,40,'Раздели мою боль: [1+грех] ран (игнор БВ и доспеха); средняя (+20) выносливость или «Оглушённый».'],
  [41,45,'Твои мотивы недостойны: цели молитвы — «Лежащий»; благословения/чудеса на них авто-проваливаются [1d10+грех] дней.'],
  [46,50,'Прекрати лепетать: нельзя молиться [2d10+грех] раундов.'],
  [51,55,'Почувствуй мой гнев: [1d10+грех] ран; серьёзная (+0) выносливость или «Оглушённый».'],
  [56,60,'Я не помогу тебе: −10 к умениям божества на [1d10+грех] дней.'],
  [61,65,'Божественные раны: [1+грех] состояний «Кровоточащий».'],
  [66,70,'Ослепляющий удар: «Лежащий» + [1+грех] «Ослепший»; снимаются серьёзной (+0) молитвой — успех снимает 1+SL штук.'],
  [71,75,'Какова твоя жертва?: [1d10+грех] ран (игнор БВ/доспеха); сложная (−10) выносливость или «Оглушённый».'],
  [76,80,'Ты согрешил против меня: [1d10+грех] раундов твоё действие — проверки молитвы (покаяние).'],
  [81,85,'Очищение плоти: [2d10+грех] ран (игнор БВ/доспеха); трудная (−20) выносливость или «Оглушённый»; при провале на −4 SL и хуже — «Бессознательный» минимум 1d10 раундов.'],
  [86,90,'Демоническое вмешательство: 1d10 малых демонов появляются в 2d10 ярдах и атакуют ближайших.'],
  [91,95,'Бойся моего гнева: [1+грех] состояний «Сломленный».'],
  [96,100,'Продолжай покаяние: ты должен совершить епитимью.'],
  [101,105,'Кастигация: раны падают до 0, затем «Бессознательный», не снимается до восстановления хотя бы 1 раны.'],
  [106,110,'Не поминай имя всуе: теряешь таланты «Благословение» и «Воззвание» на [1d10+грех] дней.'],
  [111,115,'Не надейся на тщеславие: теряешь всё снаряжение, остаёшься голым; епитимьи возвращают магические предметы по одному.'],
  [116,120,'Ты злоупотребляешь милосердием: без «Благословения» и «Воззвания» [2d10+грех] дней.'],
  [121,125,'Вот твоё зло: мучительные видения всех неудач — вместе с GM создай персонажу новую психологию.'],
  [126,130,'Гром и молния: раны падают до 0, затем «Горящий».'],
  [131,135,'Страдай так, как я: [1+грех] «Кровоточащий» каждое утро, пока не выполнишь епитимью.'],
  [136,140,'Отлучение: без «Благословения» и «Воззвания» до 2 епитимий; служители бога знают об этом, взаимодействие с ними — очень трудное (−30).'],
  [141,145,'Докажи свою ценность: божественный слуга появляется в d100 ярдах и мешает/укоряет по природе бога.'],
  [146,150,'Я изгоняю тебя: бог оставил тебя — навсегда теряешь таланты «Благословение», «Воззвание» и все молитвы.'],
];
const MUT_PHYSICAL = [
  [1,5,'Звероподобные ноги: +1 скорость.'],
  [6,10,'Жирный: −1 скорость, +5 сила, +5 выносливость.'],
  [11,15,'Вытянутые пальцы: +10 проворство.'],
  [16,20,'Тощий: −10 сила, +5 ловкость.'],
  [21,25,'Огромные глаза: +10 к проверкам восприятия, связанным со зрением.'],
  [26,30,'Дополнительные суставы ног: +5 ловкость.'],
  [31,35,'Дополнительный рот: бросок по таблице зон попадания — там и вырастет.'],
  [36,40,'Мясистые щупальца: черта существа «Щупальца».'],
  [41,45,'Мерцающая кожа: светишься как свеча.'],
  [46,50,'Нечеловеческая красота: +10 харизма; шрамы пропадают.'],
  [51,55,'Перевёрнутое лицо: −20 ко всем проверкам харизмы.'],
  [56,60,'Железная кожа: +2 очка доспеха во всех зонах, −10 ловкость.'],
  [61,65,'Свисающий язык: −10 ко всем вербальным проверкам языка.'],
  [66,70,'Клочковатые перья: два броска по таблице зон попадания — там растут.'],
  [71,75,'Короткие ноги: −1 скорость.'],
  [76,80,'Колючая чешуя: +1 очко доспеха во всех зонах.'],
  [81,85,'Неравные рога: +1 доспех голове; оружие существа с уроном = бонус силы.'],
  [86,90,'Сочащийся гной: бросок по таблице зон попадания — оттуда сочится.'],
  [91,95,'Усатое рыло: +10 к выслеживанию.'],
  [96,100,'Выбор GM: мастер выбирает мутацию или черту существа.'],
];
const MUT_MENTAL = [
  [1,5,'Отвратительное влечение: −5 харизма, −5 сила воли.'],
  [6,10,'Внутренний зверь: +10 сила воли, −5 харизма, −5 интеллект.'],
  [11,15,'Хаотичные сны: «Уставший» на первые два часа каждого дня.'],
  [16,20,'Пресмыкающийся: −5 инициатива, −5 проворство.'],
  [21,25,'Эксцентричные фантазии: −5 инициатива, −5 сила воли.'],
  [26,30,'Пугливый: −10 сила воли.'],
  [31,35,'Ненавистник: враждебность (психология) ко всем не своего вида.'],
  [36,40,'Коварный: +10 сила воли, −10 харизма.'],
  [41,45,'Ревнивые мысли: −10 харизма.'],
  [46,50,'Одинокий дух: −10 к любой проверке, когда ты один.'],
  [51,55,'Заскок: −10 интеллект.'],
  [56,60,'Богохульная настойчивость: −10 сила воли, +10 ловкость.'],
  [61,65,'Шаткий дух: «Сломленный» при провале любой проверки на силе воли.'],
  [66,70,'Мнительный разум: −5 инициатива, −5 интеллект.'],
  [71,75,'Азартный охотник: +10 сила воли, −10 инициатива.'],
  [76,80,'Мучительные видения: −10 инициатива.'],
  [81,85,'Абсолютно безумный: −20 харизма, +10 сила воли.'],
  [86,90,'Бесконечное безумие: −10 к проверкам, не вредящим другим; +10 к вредящим.'],
  [91,95,'Нечестивая ненависть: бешенство (психология), +10 к рукопашной.'],
  [96,100,'Беспокойная тряска: +5 ловкость, −5 харизма.'],
];

function arcTableLookup(table, r){
  for(const [lo,hi,txt] of table){ if(r>=lo && r<=hi) return txt; }
  return '—';
}

// SL по WFRP4: разница десятков цели и броска (00/100 учитывается как 100).
function arcSL(target, rollVal){
  const t = Math.floor(target/10);
  const rr = Math.floor((rollVal===100?100:rollVal)/10);
  return t - rr;
}
function arcIsDouble(r){ return r===100 ? false : (r%11===0); } // 11,22,...,99
function arcUnitsDigit(r){ return (r===100?0:r)%10; }

// Магия, вера, скверна и время между приключениями
//
// Вырезано из app.js без изменения семантики: файл по-прежнему обычный
// <script>, все функции остаются глобальными, и разметка находит их так же,
// как находила. Проверка сотворения, молитвы и гнев богов, мутации от скверны, отдых.
//
// Подключается ПОСЛЕ app.js: тот держит state и расчёты, которыми здесь
// пользуются. Порядок задан в index.html и в списке ASSETS у sw.js.

// ===================== ПРОВЕРКА СОТВОРЕНИЯ =====================
function rollCastingTest(idx){
  const sp = (state.sheet.spells||[])[idx];
  if(!sp){ notify('Не выбрано заклинание.'); return; }
  const target = parseInt(state.sheet.langMagick)||0;
  if(target<=0){ notify('Укажи навык «язык (магик)» вверху вкладки.'); return; }
  const cn = parseInt(sp.cn)||0;
  const r = rollD100();
  const sl = arcSL(target, r);
  const success = r <= target;
  // каналированное добавляется к SL (упрощённо: суммируем накопленное)
  const effSL = sl + (parseInt(state.sheet.channelled)||0);
  const cast = success && effSL >= cn;
  let lines = [];
  lines.push(`<span class="ic">${ICONS.dice}</span> d100 = <b>${r}</b> против ${target} → ${success?'успех':'провал'}, SL ${sl>=0?'+':''}${sl}`);
  if(state.sheet.channelled>0) lines.push(`Каналировано: +${state.sheet.channelled} SL → итог SL ${effSL>=0?'+':''}${effSL}`);
  lines.push(cast ? `<span class="ic">${ICONS.check}</span> Заклинание сотворено (нужно ЗС ${cn}).` : `<span class="ic">${ICONS.cross}</span> Не сотворено (нужно SL ≥ ЗС ${cn}).`);
  // дубли → критическое сотворение / ошибка
  let auto = null;
  if(arcIsDouble(r)){
    lines.push(`<span class="ic">${ICONS.bolt}</span> <b>Дубль (${r})</b> — критическое сотворение: бросок по «малым ошибкам» (если нет «Инстинктивного понимания»), но выбери бонус: крит. заклинание / полная мощь / неудержимая сила.`);
    auto = 'minor';
  } else if(state.sheet.nearCorruption && arcUnitsDigit(r)===8){
    lines.push(`<span class="ic">${ICONS.warn}</span> Рядом с искажающим влиянием и «8» на единицах — малая ошибка.`);
    auto = 'minor';
  }
  // сотворение тратит накопленную ману
  state.sheet.channelled = 0;
  state.sheet.miscastLog = state.sheet.miscastLog || [];
  state.sheet.miscastLog.unshift({type:'cast', roll:r, text: lines.join(' · ')});
  if(state.sheet.miscastLog.length>12) state.sheet.miscastLog.pop();
  autosave();
  notify(cast ? `Сотворено: ${sp.name}` : `Провал сотворения: ${sp.name}`);
  if(auto==='minor'){ rollMinorMiscast(true); }
  else renderSheet();
}

function rollChannelling(){
  const target = parseInt(state.sheet.channelSkill)||0;
  if(target<=0){ notify('Укажи навык «концентрация» вверху вкладки.'); return; }
  const r = rollD100();
  const sl = arcSL(target, r);
  const success = r <= target;
  let add = success ? Math.max(0, sl) : 0;
  if(success) state.sheet.channelled = (parseInt(state.sheet.channelled)||0) + add;
  let txt = `<span class="ic">${ICONS.dice}</span> Концентрация d100 = ${r} против ${target} → ${success?'успех':'провал'}, SL ${sl>=0?'+':''}${sl}. Накоплено каналированием: <b>${state.sheet.channelled||0}</b>.`;
  let auto=null;
  if(!success){ txt += ' Провал — малая ошибка, накопленное теряется.'; state.sheet.channelled=0; auto='minor'; }
  else if(arcIsDouble(r)){ txt += ' Дубль — малая ошибка.'; auto='minor'; }
  state.sheet.miscastLog = state.sheet.miscastLog || [];
  state.sheet.miscastLog.unshift({type:'channel', roll:r, text:txt});
  if(state.sheet.miscastLog.length>12) state.sheet.miscastLog.pop();
  autosave();
  if(auto==='minor') rollMinorMiscast(true);
  else renderSheet();
}

function rollMinorMiscast(silent){
  const r = rollD100();
  const txt = `МАЛАЯ ОШИБКА (${r}): ${arcTableLookup(ARC_MINOR_MISCAST, r)}`;
  state.sheet.miscastLog = state.sheet.miscastLog || [];
  state.sheet.miscastLog.unshift({type:'minor', roll:r, text:txt});
  if(state.sheet.miscastLog.length>12) state.sheet.miscastLog.pop();
  autosave();
  if(!silent) notify('Бросок: малая ошибка');
  renderSheet();
}
function rollMajorMiscast(silent){
  const r = rollD100();
  const txt = `КРУПНАЯ ОШИБКА (${r}): ${arcTableLookup(ARC_MAJOR_MISCAST, r)}`;
  state.sheet.miscastLog = state.sheet.miscastLog || [];
  state.sheet.miscastLog.unshift({type:'major', roll:r, text:txt});
  if(state.sheet.miscastLog.length>12) state.sheet.miscastLog.pop();
  autosave();
  if(!silent) notify('Бросок: крупная ошибка');
  renderSheet();
}

// ===================== ВЕРА: МОЛИТВА / ГНЕВ =====================
function rollPrayTest(idx, kind){
  const list = kind==='miracle' ? (state.sheet.miracles||[]) : (state.sheet.blessings||[]);
  const it = list[idx];
  const target = parseInt(state.sheet.praySkill)||0;
  if(target<=0){ notify('Укажи навык «молитва» вверху раздела «Вера».'); return; }
  const r = rollD100();
  const sl = arcSL(target, r);
  const success = r <= target;
  const sin = parseInt(state.sheet.sin)||0;
  let lines = [`<span class="ic">${ICONS.dice}</span> Молитва d100 = <b>${r}</b> против ${target} → ${success?'успех':'провал'}, SL ${sl>=0?'+':''}${sl}` + (it?` — ${it.name}`:'')];
  // Гнев: дубль (заминка) ИЛИ единицы ≤ грех
  const triggerWrath = arcIsDouble(r) || (sin>0 && arcUnitsDigit(r) <= sin);
  if(success) lines.push('<span class="ic">${ICONS.check}</span> Благословение/чудо проявляется (каждые +2 SL — усиление: цель/дистанция/длительность).');
  else lines.push('<span class="ic">${ICONS.cross}</span> Не проявляется.');
  state.sheet.wrathLog = state.sheet.wrathLog || [];
  state.sheet.wrathLog.unshift({type:'pray', roll:r, text: lines.join(' · ')});
  if(state.sheet.wrathLog.length>12) state.sheet.wrathLog.pop();
  autosave();
  if(triggerWrath){
    notify('Гнев богов!');
    rollWrath(true);
  } else {
    notify(success ? `Проявлено: ${it?it.name:''}` : 'Молитва не удалась');
    renderSheet();
  }
}
function rollWrath(silent){
  const sin = parseInt(state.sheet.sin)||0;
  const base = rollD100();
  const total = Math.min(150, base + 10*sin); // книга: +10 за очко греха, таблица до 150
  const txt = `ГНЕВ БОГОВ: d100 ${base}${sin?` + ${10*sin} (грех ${sin})`:''} = ${total} → ${arcTableLookup(WRATH_OF_GODS, total)}`;
  state.sheet.wrathLog = state.sheet.wrathLog || [];
  state.sheet.wrathLog.unshift({type:'wrath', roll:total, text:txt});
  if(state.sheet.wrathLog.length>12) state.sheet.wrathLog.pop();
  state.sheet.sin = Math.max(0, sin - 1); // книга: после броска грех уменьшается на 1 (мин 0)
  autosave();
  if(!silent) notify('Бросок: Гнев богов');
  renderSheet();
}

// ===================== СКВЕРНА → МУТАЦИЯ =====================
function rollMutation(kind){
  const table = kind==='ment' ? MUT_MENTAL : MUT_PHYSICAL;
  const r = rollD100();
  const label = kind==='ment' ? 'Ментальная' : 'Физическая';
  const res = `${label} мутация (d100 ${r}): ${arcTableLookup(table, r)}`;
  const prev = state.sheet.mutations || '';
  state.sheet.mutations = prev ? (prev + '\n• ' + res) : ('• ' + res);
  // сбросить скверну на величину порога
  const thr = sheetCalc().corruptionThreshold || 0;
  state.sheet.corruption = Math.max(0, (parseInt(state.sheet.corruption)||0) - thr);
  autosave();
  notify(res);
  if(typeof renderTabHealth==='function') renderTabHealth();
}

// ===================== ВКЛАДКА: МАГИЯ / ВЕРА =====================
function arcSpellRows(){
  const sp = state.sheet.spells||[];
  if(!sp.length) return '<p class="muted" style="font-size:12px;">Гримуар пуст · Ветра магии ещё не покорены. Добавь ниже (название и ЗС обязательны для проверки сотворения).</p>';
  let h = `<table class="sv4-table" style="width:100%;font-size:12px;"><tr><th>Заклинание</th><th>ЗС</th><th>Дист.</th><th>Цель</th><th>Длит.</th><th></th></tr>`;
  sp.forEach((s,i)=>{
    h += `<tr>
      <td><input class="sv4-text" style="min-width:120px;" placeholder="название заклинания" value="${escAttr(s.name)}" onchange="state.sheet.spells[${i}].name=this.value;autosave();"/></td>
      <td><label class="sv4-cell-lbl">ЗС <input type="number" class="sv4-mini" style="width:46px;" value="${s.cn||0}" title="число сотворения" onchange="state.sheet.spells[${i}].cn=Math.max(0,parseInt(this.value)||0);autosave();"/></label></td>
      <td><input class="sv4-text" style="width:70px;" placeholder="дист." value="${escAttr(s.range)}" onchange="state.sheet.spells[${i}].range=this.value;autosave();"/></td>
      <td><input class="sv4-text" style="width:60px;" placeholder="цель" value="${escAttr(s.target)}" onchange="state.sheet.spells[${i}].target=this.value;autosave();"/></td>
      <td><input class="sv4-text" style="width:70px;" placeholder="длит." value="${escAttr(s.duration)}" onchange="state.sheet.spells[${i}].duration=this.value;autosave();"/></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-gold" onclick="rollCastingTest(${i})" title="проверка сотворения"><span class="ic">${ICONS.dice}</span></button>
        <button class="sv4-cond-btn" onclick="state.sheet.spells.splice(${i},1);autosave();renderSheet();">×</button>
      </td>
    </tr>`;
  });
  h += `</table>`;
  return h;
}
function arcPrayerRows(kind){
  const list = kind==='miracle' ? (state.sheet.miracles||[]) : (state.sheet.blessings||[]);
  const fld = kind==='miracle' ? 'miracles' : 'blessings';
  if(!list.length) return `<p class="muted" style="font-size:12px;">Боги пока молчат.</p>`;
  let h = `<table class="sv4-table" style="width:100%;font-size:12px;"><tr><th>${kind==='miracle'?'Чудо':'Благословение'}</th><th>Дист.</th><th>Цель</th><th>Длит.</th><th></th></tr>`;
  list.forEach((s,i)=>{
    h += `<tr>
      <td><input class="sv4-text" style="min-width:120px;" placeholder="название" value="${escAttr(s.name)}" onchange="state.sheet.${fld}[${i}].name=this.value;autosave();"/></td>
      <td><input class="sv4-text" style="width:70px;" placeholder="дист." value="${escAttr(s.range)}" onchange="state.sheet.${fld}[${i}].range=this.value;autosave();"/></td>
      <td><input class="sv4-text" style="width:60px;" placeholder="цель" value="${escAttr(s.target)}" onchange="state.sheet.${fld}[${i}].target=this.value;autosave();"/></td>
      <td><input class="sv4-text" style="width:70px;" placeholder="длит." value="${escAttr(s.duration)}" onchange="state.sheet.${fld}[${i}].duration=this.value;autosave();"/></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-gold" onclick="rollPrayTest(${i},'${kind}')" title="проверка молитвы"><span class="ic">${ICONS.dice}</span></button>
        <button class="sv4-cond-btn" onclick="state.sheet.${fld}.splice(${i},1);autosave();renderSheet();">×</button>
      </td>
    </tr>`;
  });
  h += `</table>`;
  return h;
}
function arcLog(list){
  if(!list || !list.length) return '<p class="muted" style="font-size:11px;">Боги пока молчат.</p>';
  return list.map(e=>`<div class="muted" style="font-size:11px;border-bottom:1px solid var(--border);padding:3px 0;">${e.text}</div>`).join('');
}

function renderTabArcane(){

  const s = state.sheet;
  let h = '';

  // ---- МАГИЯ ----
  h += `<div class="panel" style="margin-bottom:14px;">
    <div class="panel-title">✦ Магия (тайные знания)</div>
    <p class="muted" style="font-size:12px;">Сотворение = проверка <b>языка (магик)</b>; нужно набрать <b>SL ≥ ЗС</b> заклинания. Дубль на броске → критическое сотворение (малая ошибка + бонус). Каналирование копит SL «концентрацией».</p>
    <div class="sv4-row" style="gap:14px;flex-wrap:wrap;align-items:center;margin:8px 0;">
      <label style="font-size:12px;">язык (магик): <input type="number" class="sv4-mini gold" style="width:60px;" value="${s.langMagick||0}" onchange="state.sheet.langMagick=Math.max(0,parseInt(this.value)||0);autosave();"/></label>
      <label style="font-size:12px;">концентрация: <input type="number" class="sv4-mini" style="width:60px;" value="${s.channelSkill||0}" onchange="state.sheet.channelSkill=Math.max(0,parseInt(this.value)||0);autosave();"/></label>
      <label style="font-size:12px;" title="любая 8 на кубе единиц рядом с искажением → малая ошибка"><input type="checkbox" ${s.nearCorruption?'checked':''} onchange="state.sheet.nearCorruption=this.checked;autosave();"/> рядом с искажением</label>
    </div>
    <div class="sv4-row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
      <button class="btn btn-sm" onclick="rollChannelling()"><span class="ic">${ICONS.dice}</span> Каналировать (концентрация)</button>
      <span class="muted" style="font-size:12px;">накоплено: <b style="color:var(--gold2);">${s.channelled||0}</b> SL</span>
      ${(s.channelled||0)>0?`<button class="sv4-cond-btn" onclick="state.sheet.channelled=0;autosave();renderSheet();" title="сбросить">×</button>`:''}
      <span style="flex:1;"></span>
      <button class="btn btn-sm" onclick="rollMinorMiscast()"><span class="ic">${ICONS.dice}</span> Малая ошибка</button>
      <button class="btn btn-sm" onclick="rollMajorMiscast()"><span class="ic">${ICONS.dice}</span> Крупная ошибка</button>
    </div>
    ${arcSpellRows()}
    <div class="sv4-row" style="margin-top:6px;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-sm btn-gold" onclick="spellPickerOpen()">📖 Из книги…</button>
      <button class="btn btn-sm" onclick="state.sheet.spells=state.sheet.spells||[];state.sheet.spells.push({name:'',cn:0,range:'',target:'',duration:''});autosave();renderSheet();">+ Своё</button>
    </div>
    <details style="margin-top:8px;"><summary class="muted" style="font-size:12px;cursor:pointer;">Журнал сотворений / ошибок</summary>${arcLog(s.miscastLog)}</details>
  </div>`;

  // ---- ВЕРА ----
  const sin = s.sin||0;
  h += `<div class="panel">
    <div class="panel-title">✦ Вера (благословения и чудеса)</div>
    <p class="muted" style="font-size:12px;">Проявление = проверка <b>молитвы</b>. Дубль (заминка) или «единицы ≤ очков греха» → <b>Гнев богов</b> (+10 за каждое очко греха, затем грех обнуляется).</p>
    <div class="sv4-row" style="gap:14px;flex-wrap:wrap;align-items:center;margin:8px 0;">
      <label style="font-size:12px;">молитва: <input type="number" class="sv4-mini gold" style="width:60px;" value="${s.praySkill||0}" onchange="state.sheet.praySkill=Math.max(0,parseInt(this.value)||0);autosave();"/></label>
      <label style="font-size:12px;">очки греха: <input type="number" class="sv4-mini ${sin>0?'danger':''}" style="width:56px;" value="${sin}" onchange="state.sheet.sin=Math.max(0,parseInt(this.value)||0);autosave();renderSheet();"/></label>
      <button class="btn btn-sm" onclick="rollWrath()"><span class="ic">${ICONS.dice}</span> Гнев богов</button>
    </div>
    <div class="sv4-block-title" style="margin-top:6px;">Благословения</div>
    ${arcPrayerRows('blessing')}
    <div class="sv4-row" style="margin:4px 0 10px;"><button class="btn btn-sm btn-gold" onclick="state.sheet.blessings=state.sheet.blessings||[];state.sheet.blessings.push({name:'',range:'6 ярдов',target:'1',duration:'6 раундов'});autosave();renderSheet();">+ Благословение</button></div>
    <div class="sv4-block-title">Чудеса</div>
    ${arcPrayerRows('miracle')}
    <div class="sv4-row" style="margin-top:4px;"><button class="btn btn-sm btn-gold" onclick="state.sheet.miracles=state.sheet.miracles||[];state.sheet.miracles.push({name:'',range:'',target:'',duration:''});autosave();renderSheet();">+ Чудо</button></div>
    <details style="margin-top:8px;"><summary class="muted" style="font-size:12px;cursor:pointer;">Журнал молитв / гнева</summary>${arcLog(s.wrathLog)}</details>
  </div>`;

  return h;
}


/* ===== INJECTED: DOWNTIME / ENDEAVOURS MODULE ===== */
/* ==========================================================================
   МОДУЛЬ: МЕЖДУ ПРИКЛЮЧЕНИЯМИ (WFRP4, гл. VI)
   Функциональный тип: хочешь — пользуешься. Логика как у магазина XP —
   усилие отыгрывается, его РЕЗУЛЬТАТ (деньги / предмет / скидка опыта)
   попадает в журнал, и одной кнопкой заносится в лист персонажа.
   ========================================================================== */

// --- деньги: нормализация мп <-> монеты (1 ЗК = 20 СШ = 240 МП) ---
function dtMoneyToBp(m){ m=m||{}; return (m.gc||0)*240 + (m.ss||0)*12 + (m.bp||0); }
function dtBpToMoney(bp){ bp=Math.max(0,Math.floor(bp||0)); const gc=Math.floor(bp/240); bp-=gc*240; const ss=Math.floor(bp/12); bp-=ss*12; return {gc, ss, bp}; }
function dtFmtMoney(m){
  const parts=[]; if(m.gc) parts.push(`${m.gc} ЗК`); if(m.ss) parts.push(`${m.ss} СШ`); if(m.bp) parts.push(`${m.bp} МП`);
  return parts.length?parts.join(' '):'0';
}

// статус текущей ступени карьеры → {tier:'медь'|'серебро'|'золото', num}
function dtCurrentStatus(){
  const c = state.career ? DATA.careers[state.career] : null;
  const t = c && c.tiers ? c.tiers[(state.sheet.tier||1)-1] : null;
  const raw = (t && t.status) ? t.status.toLowerCase() : 'медный 0';
  const num = parseInt((raw.match(/\d+/)||['0'])[0]) || 0;
  let tier='медь';
  if(raw.includes('серебр')) tier='серебро';
  else if(raw.includes('золот')) tier='золото';
  return { tier, num, raw: (t&&t.status)||'медный 0' };
}

// бросок дохода по статусу (та же модель, что стартовое богатство):
// медь pos×2d10 МП, серебро pos×1d10 СШ, золото pos×1 ЗК
function dtRollIncome(){
  const st = dtCurrentStatus();
  let reward = {gc:0,ss:0,bp:0}, detail='';
  if(st.num<=0){ detail='Медь 0 — стандартного дохода нет (нищий).'; }
  else if(st.tier==='медь'){ let s=0; for(let i=0;i<st.num;i++) s+=roll(2,10); reward.bp=s; detail=`${st.num}×2d10 = ${s} МП`; }
  else if(st.tier==='серебро'){ let s=0; for(let i=0;i<st.num;i++) s+=roll(1,10); reward.ss=s; detail=`${st.num}×1d10 = ${s} СШ`; }
  else { reward.gc=st.num; detail=`${st.num}×1 = ${st.num} ЗК`; }
  dtPush('Доход', `Доходное предприятие (статус ${st.raw}). ${detail}`, {type:'money', money:reward});
}

// стоимость обучения: XP уже тратится в магазине; здесь считаем плату учителю.
// базовое умение/характеристика: XP + 1d10 МП; продвинутое: ×2.
function dtTrainingCost(){
  const xp = parseInt(byId('dt-train-xp') && byId('dt-train-xp').value) || 0;
  const adv = byId('dt-train-adv') && byId('dt-train-adv').checked;
  if(xp<=0){ notify('Укажи стоимость улучшения в XP.'); return; }
  const die = roll(1,10);
  const baseBp = xp + die;
  const totalBp = adv ? baseBp*2 : baseBp;
  const m = dtBpToMoney(totalBp);
  dtPush('Тренировка', `Плата учителю за улучшение ${xp} XP${adv?' (продвинутое, ×2)':''}: ${xp} + 1d10(${die})${adv?' ×2':''} = ${totalBp} МП.`, {type:'spend', money:m, note:'оплата учителю'});
}

// заказ вещи: фиксируем название/цену, заносим как трату + предмет
function dtOrderItem(){
  const name = (byId('dt-order-name') && byId('dt-order-name').value || '').trim();
  const gc = parseInt(byId('dt-order-gc') && byId('dt-order-gc').value)||0;
  const ss = parseInt(byId('dt-order-ss') && byId('dt-order-ss').value)||0;
  const bp = parseInt(byId('dt-order-bp') && byId('dt-order-bp').value)||0;
  if(!name){ notify('Укажи, что заказываешь.'); return; }
  const price={gc,ss,bp};
  dtPush('Заказ', `Заказ предмета «${name}» за ${dtFmtMoney(price)}.`, {type:'buy', item:name, money:price});
}

// произвольный результат отыгранного усилия (ролеплей): просто заметка,
// при желании можно прикрепить награду вручную
function dtCustom(){
  const txt = (byId('dt-custom-text') && byId('dt-custom-text').value || '').trim();
  if(!txt){ notify('Опиши, что ты отыграл.'); return; }
  dtPush('Усилие', txt, {type:'note'});
  if(byId('dt-custom-text')) byId('dt-custom-text').value='';
}

// добавить запись в журнал (с защитой лимита 3 усилий — мягкое предупреждение)
function dtPush(kind, text, reward){
  state.sheet.downtimeLog = state.sheet.downtimeLog || [];
  state.sheet.downtimeLog.unshift({ kind, text, reward: reward||{type:'note'}, applied:false, id: Date.now()+'_'+Math.floor(Math.random()*1e6) });
  if(state.sheet.downtimeLog.length>40) state.sheet.downtimeLog.pop();
  autosave();
  renderSheet();
}

// ЗАНЕСТИ В ЛИСТ: применяем награду к кошельку / инвентарю / (скидка опыта = трата денег)
function dtApply(id){
  const log = state.sheet.downtimeLog||[];
  const e = log.find(x=>x.id===id);
  if(!e || e.applied){ return; }
  const r = e.reward||{};
  if(!state.sheet.money) state.sheet.money={gc:0,ss:0,bp:0};
  if(r.type==='money' && r.money){
    // прибавить деньги
    const cur = dtMoneyToBp(state.sheet.money) + dtMoneyToBp(r.money);
    state.sheet.money = dtBpToMoney(cur);
    notify(`+${dtFmtMoney(r.money)} в кошелёк.`);
  } else if(r.type==='spend' && r.money){
    // списать деньги (плата учителю)
    const cur = dtMoneyToBp(state.sheet.money) - dtMoneyToBp(r.money);
    if(cur<0){ notify('Недостаточно денег в кошельке для этой траты.'); return; }
    state.sheet.money = dtBpToMoney(cur);
    notify(`−${dtFmtMoney(r.money)} из кошелька (${r.note||'трата'}).`);
  } else if(r.type==='buy'){
    // списать цену и добавить предмет
    const cur = dtMoneyToBp(state.sheet.money) - dtMoneyToBp(r.money||{});
    if(cur<0){ notify('Недостаточно денег для покупки.'); return; }
    state.sheet.money = dtBpToMoney(cur);
    state.sheet.trappings = state.sheet.trappings||[];
    state.sheet.trappings.push({ name: r.item||'предмет', enc:0, desc:`заказано между приключениями за ${dtFmtMoney(r.money||{})}` });
    notify(`Добавлено в имущество: ${r.item}. Списано ${dtFmtMoney(r.money||{})}.`);
  } else {
    notify('У этой записи нет переносимой награды — это просто заметка.');
    return;
  }
  e.applied = true;
  autosave();
  renderSheet();
}

function dtUndo(id){
  const log = state.sheet.downtimeLog||[];
  const e = log.find(x=>x.id===id);
  if(!e) return;
  // откат денежных эффектов
  const r = e.reward||{};
  if(e.applied && state.sheet.money){
    let cur = dtMoneyToBp(state.sheet.money);
    if(r.type==='money' && r.money) cur -= dtMoneyToBp(r.money);
    else if((r.type==='spend'||r.type==='buy') && r.money) cur += dtMoneyToBp(r.money);
    state.sheet.money = dtBpToMoney(Math.max(0,cur));
    if(r.type==='buy'){
      // удалить последний добавленный предмет с таким именем
      const idx = (state.sheet.trappings||[]).map(t=>t.name).lastIndexOf(r.item);
      if(idx>=0) state.sheet.trappings.splice(idx,1);
    }
    e.applied=false;
    notify('Награда отменена и возвращена.');
  }
  autosave(); renderSheet();
}
function dtRemove(id){
  state.sheet.downtimeLog = (state.sheet.downtimeLog||[]).filter(x=>x.id!==id);
  autosave(); renderSheet();
}

// ===================== ВКЛАДКА: МЕЖДУ ПРИКЛЮЧЕНИЯМИ =====================
function renderTabDowntime(){
  const s = state.sheet;
  const st = dtCurrentStatus();
  const used = s.endeavoursUsed||0;
  const wallet = s.money||{gc:0,ss:0,bp:0};
  let h = '';

  // шапка: усилия + кошелёк
  h += `<div class="panel" style="margin-bottom:14px;">
    <div class="panel-title">⌛ Между приключениями</div>
    <p class="muted" style="font-size:12px;">Опциональный модуль. Между приключениями доступно до <b>3 усилий</b> (без последствий — не больше одного в неделю). Отыграй усилие — и занеси его результат в лист одной кнопкой, как в магазине.</p>
    <div class="sv4-row" style="gap:16px;flex-wrap:wrap;align-items:center;margin-top:8px;">
      <div style="font-size:13px;">Потрачено усилий:
        <button class="btn btn-sm" onclick="state.sheet.endeavoursUsed=Math.max(0,(state.sheet.endeavoursUsed||0)-1);autosave();renderSheet();">−</button>
        <b style="color:var(--gold2);font-size:16px;">${used}</b> / 3
        <button class="btn btn-sm" onclick="state.sheet.endeavoursUsed=(state.sheet.endeavoursUsed||0)+1;autosave();renderSheet();">+</button>
      </div>
      <div style="font-size:13px;">Кошелёк: <b style="color:var(--gold2);">${dtFmtMoney(wallet)}</b></div>
      <div style="font-size:12px;" class="muted">Статус ступени: ${escHtml(st.raw)}</div>
    </div>
  </div>`;

  // карточки усилий
  h += `<div class="panel" style="margin-bottom:14px;">
    <div class="panel-title">Доход</div>
    <p class="muted" style="font-size:12px;">Стандартный заработок по статусу. Опиши, чем персонаж заработал, и брось доход.</p>
    <button class="btn btn-gold btn-sm" onclick="dtRollIncome()"><span class="ic">${ICONS.dice}</span> Бросить доход (${escHtml(st.raw)})</button>
  </div>`;

  h += `<div class="panel" style="margin-bottom:14px;">
    <div class="panel-title">Тренировка / обучение</div>
    <p class="muted" style="font-size:12px;">Опыт за улучшение тратится в «Магазине XP»; здесь считается <b>плата учителю</b>: XP + 1d10 МП (продвинутое умение — ×2).</p>
    <div class="sv4-row" style="gap:10px;flex-wrap:wrap;align-items:center;">
      <label style="font-size:12px;">XP улучшения: <input id="dt-train-xp" type="number" class="sv4-mini" style="width:64px;" value="0"/></label>
      <label style="font-size:12px;"><input id="dt-train-adv" type="checkbox"/> продвинутое (×2)</label>
      <button class="btn btn-sm btn-gold" onclick="dtTrainingCost()"><span class="ic">${ICONS.dice}</span> Посчитать плату</button>
    </div>
  </div>`;

  h += `<div class="panel" style="margin-bottom:14px;">
    <div class="panel-title">Заказ предмета</div>
    <p class="muted" style="font-size:12px;">Заказ редкой вещи у мастера. Укажи цену — при заносе в лист она спишется с кошелька, а предмет добавится в имущество.</p>
    <div class="sv4-row" style="gap:8px;flex-wrap:wrap;align-items:center;">
      <input id="dt-order-name" class="sv4-text" style="min-width:160px;" placeholder="что заказываешь"/>
      <label style="font-size:12px;">ЗК <input id="dt-order-gc" type="number" class="sv4-mini" style="width:50px;" value="0"/></label>
      <label style="font-size:12px;">СШ <input id="dt-order-ss" type="number" class="sv4-mini" style="width:50px;" value="0"/></label>
      <label style="font-size:12px;">МП <input id="dt-order-bp" type="number" class="sv4-mini" style="width:50px;" value="0"/></label>
      <button class="btn btn-sm btn-gold" onclick="dtOrderItem()">+ Заказать</button>
    </div>
  </div>`;

  h += `<div class="panel" style="margin-bottom:14px;">
    <div class="panel-title">Своё усилие (отыгрыш)</div>
    <p class="muted" style="font-size:12px;">Любое другое усилие — слежка, одолжение, разжигание разногласий и т.п. Запиши, что отыграл; награду, если есть, прикрепишь вручную в журнале.</p>
    <div class="sv4-row" style="gap:8px;">
      <input id="dt-custom-text" class="sv4-text" style="flex:1;min-width:200px;" placeholder="что сделал персонаж в простое..."/>
      <button class="btn btn-sm" onclick="dtCustom()">+ В журнал</button>
    </div>
  </div>`;

  // ЖУРНАЛ результатов с кнопками «занести в лист»
  h += `<div class="panel">
    <div class="panel-title">Журнал простоя</div>`;
  const log = s.downtimeLog||[];
  if(!log.length){
    h += `<p class="muted" style="font-size:12px;">Пока пусто. Выполни усилие выше — результат появится здесь.</p>`;
  } else {
    log.forEach(e=>{
      const r = e.reward||{};
      const hasReward = (r.type==='money'||r.type==='spend'||r.type==='buy');
      let badge='';
      if(r.type==='money') badge = `<span style="color:#7bd47b;">+${dtFmtMoney(r.money||{})}</span>`;
      else if(r.type==='spend') badge = `<span style="color:#e0894a;">−${dtFmtMoney(r.money||{})}</span>`;
      else if(r.type==='buy') badge = `<span style="color:#e0894a;">−${dtFmtMoney(r.money||{})} → ${escHtml(r.item||'')}</span>`;
      h += `<div style="border-bottom:1px solid var(--border);padding:8px 0;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap;">
          <span style="font-size:12px;"><b style="color:var(--gold2);">${escHtml(e.kind)}</b> · ${escHtml(e.text)}</span>
          <span style="font-size:12px;white-space:nowrap;">${badge}</span>
        </div>
        <div class="sv4-row" style="gap:6px;margin-top:6px;">
          ${hasReward ? (e.applied
              ? `<span class="muted" style="font-size:11px;">✓ занесено в лист</span> <button class="btn btn-sm" onclick="dtUndo('${e.id}')">Отменить</button>`
              : `<button class="btn btn-sm btn-gold" onclick="dtApply('${e.id}')">↘ Занести в лист</button>`)
            : `<span class="muted" style="font-size:11px;">заметка</span>`}
          <button class="sv4-cond-btn" onclick="dtRemove('${e.id}')" title="удалить запись">×</button>
        </div>
      </div>`;
    });
  }
  h += `</div>`;
  return h;
}
