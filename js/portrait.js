// Портрет персонажа.
//
// На карточке досье с давних пор висело «портрет (скоро)» — единственное
// невыполненное обещание в интерфейсе, и на самом видном месте.
//
// Снимок с телефона — это 3–8 МБ, а весь localStorage вмещает 5–10 МБ на
// всё приложение: положить туда фото как есть значит потерять и фото, и
// остальные досье. Поэтому картинка ужимается до 256×256 и уходит в JPEG —
// это 15–25 КБ, и десяток персонажей с портретами занимает меньше четверти
// мегабайта. Обрезаем по центру и «под обложку»: лицо на карточке важнее,
// чем сохранённые поля кадра.
(function () {
  'use strict';

  var SIDE = 256;      // сторона хранимого квадрата
  var QUALITY = 0.78;  // ниже уже видно кашу на бороде

  function input() {
    var el = document.getElementById('portrait-file');
    if (el) return el;
    el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/*';
    el.id = 'portrait-file';
    el.style.display = 'none';
    el.addEventListener('change', function () {
      var f = el.files && el.files[0];
      el.value = '';                       // иначе тот же файл второй раз не выберется
      if (f) fromFile(f);
    });
    document.body.appendChild(el);
    return el;
  }

  // Телефоны пишут ориентацию в EXIF, и без учёта этого портреты приезжают
  // лежащими на боку. createImageBitmap умеет применить её сам.
  function decode(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(function () { return decodeViaImg(file); });
    }
    return decodeViaImg(file);
  }

  function decodeViaImg(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error('не картинка')); };
      img.src = url;
    });
  }

  function toSquare(src) {
    var w = src.width || src.naturalWidth;
    var h = src.height || src.naturalHeight;
    if (!w || !h) throw new Error('пустая картинка');
    var side = Math.min(w, h);                 // берём центральный квадрат
    var sx = Math.round((w - side) / 2);
    var sy = Math.round((h - side) / 2);
    var c = document.createElement('canvas');
    c.width = c.height = SIDE;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, sx, sy, side, side, 0, 0, SIDE, SIDE);
    return c.toDataURL('image/jpeg', QUALITY);
  }

  function fromFile(file) {
    if (!/^image\//.test(file.type || '')) { notify('Это не картинка.'); return; }
    decode(file).then(function (src) {
      var data = toSquare(src);
      if (src.close) src.close();            // ImageBitmap держит память до закрытия
      state.sheet.portrait = data;
      if (!saveNow()) { state.sheet.portrait = null; return; }
      notify('Портрет вписан в дело.');
      renderSheet();
    }).catch(function () {
      notify('Не вышло прочитать картинку.');
    });
  }

  // Портрет заметно тяжелее прочего в досье, так что переполнение памяти тут
  // вероятнее всего — и молча съесть его нельзя.
  function saveNow() {
    var roster = loadRoster();
    var i = roster.findIndex(function (p) { return p.id === state.id; });
    if (i < 0) return true;                  // персонаж ещё не в архиве — сохранится при записи
    var snap = JSON.parse(JSON.stringify(state));
    snap._updated = Date.now();
    roster[i] = snap;
    return saveRoster(roster);
  }

  // ── что показывается на карточке ────────────────────────────────────────────
  window.portraitHtml = function () {
    var src = (state.sheet && state.sheet.portrait) || '';
    if (src) {
      return '<div class="sv4-portrait has-photo" data-portrait="menu" role="button"' +
             ' title="Сменить или убрать портрет">' +
             '<img src="' + escAttr(src) + '" alt="Портрет персонажа"></div>';
    }
    // Подпись в одну строку: в квадратной рамке две уже не помещаются
    return '<div class="sv4-portrait" data-portrait="pick" role="button" title="Добавить портрет">' +
           ICONS.user + '<span>портрет</span></div>';
  };

  window.portraitPick = function () { input().click(); };

  window.portraitRemove = function () {
    state.sheet.portrait = null;
    saveNow();
    notify('Портрет убран.');
    renderSheet();
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-portrait]');
    if (!el) return;
    if (el.dataset.portrait === 'pick') { portraitPick(); return; }
    ordoChoice({
      title: 'Портрет',
      options: [
        { label: 'Заменить', cb: function () { portraitPick(); } },
        { label: 'Убрать', danger: true, cb: function () { portraitRemove(); } }
      ]
    });
  });
})();
