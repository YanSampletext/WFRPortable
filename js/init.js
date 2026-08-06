// Запуск приложения.
//
// Блок выделен в отдельный файл и подключается последним не из вкусовых
// соображений: он вызывает loadRoster/freshState/migrateState из roster.js и
// рисует лендинг. Объявления функций поднимаются только внутри своего
// <script>, поэтому запуск обязан идти после всех остальных файлов.

// ===================== INIT =====================
(function(){
  // Миграция старого одиночного state → roster
  try{
    const raw = localStorage.getItem('wfrp4_sheet_v1');
    if(raw){
      const saved = JSON.parse(raw);
      if(saved && (saved.name || (saved.race && saved.career))){
        const roster = loadRoster();
        if(!saved.id) saved.id = genCharId();
        if(!roster.find(p => p.id === saved.id)){
          saved._updated = Date.now();
          roster.push(saved);
          saveRoster(roster);
        }
      }
      localStorage.removeItem('wfrp4_sheet_v1');
    }
  } catch(e){}

  Object.assign(state, freshState());
  migrateState();

  // Начинаем с лендинга
  applySavedTheme();
  document.getElementById('view-app').style.display = 'none';
  document.getElementById('view-landing').style.display = 'flex';
  renderLandingChars();
  showRandomEpigraph();

  // === Мобильная клавиатура: цифровой блок для числовых полей ===
  // Бланк постоянно перерисовывается, поэтому навешиваем inputmode
  // на все input[type=number] по мере их появления через MutationObserver.
  function tagNumericInputs(root){
    const list = (root || document).querySelectorAll
      ? (root || document).querySelectorAll('input[type="number"]:not([inputmode])')
      : [];
    list.forEach(inp => {
      inp.setAttribute('inputmode', 'numeric');
      // Разрешаем числа со знаком минус только там, где это уместно — по умолчанию цифры.
    });
  }
  try {
    tagNumericInputs(document);
    let _tnT;
    const mo = new MutationObserver(() => { clearTimeout(_tnT); _tnT = setTimeout(() => tagNumericInputs(document), 150); });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch(e){}
})();
