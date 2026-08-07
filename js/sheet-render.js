// Отрисовка бланка и его вкладок
//
// Вырезано из app.js без изменения семантики: файл по-прежнему обычный
// <script>, все функции остаются глобальными, и разметка находит их так же,
// как находила. Самая большая часть: главная, народ, карьера, статы, судьба, здоровье, навыки, таланты, имущество, штрихи и печатный бланк.
//
// Подключается ПОСЛЕ app.js: тот держит state и расчёты, которыми здесь
// пользуются. Порядок задан в index.html и в списке ASSETS у sw.js.

// ===== RENDER =====
// ===================== SVG-ИКОНКИ ДЛЯ БЛАНКА V3 =====================
const ICONS = {
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="4.2"/><path d="M3.5 21c0-4.5 3.8-7.5 8.5-7.5s8.5 3 8.5 7.5"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 22V3"/><path d="M5 4h13l-2.5 4L18 12H5" fill="currentColor" fill-opacity="0.15"/><path d="M5 4h13l-2.5 4L18 12H5"/></svg>',
  scroll: '<svg viewBox="0 0 24 24"><path d="M7 4h12v13a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h10"/><path d="M7 4a2 2 0 0 0-2 2v10"/><line x1="9.5" y1="8" x2="16" y2="8"/><line x1="9.5" y1="11.5" x2="16" y2="11.5"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="16" cy="8" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="8" cy="16" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/></svg>',
  compass: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><polygon points="12,4 14,11 12,12 10,11" fill="currentColor" fill-opacity="0.5"/><polygon points="12,20 10,13 12,12 14,13" fill="currentColor" fill-opacity="0.2"/><path d="M12 2.2v2M12 19.8v2M2.2 12h2M19.8 12h2"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21.3C6 17 2.5 13.2 2.5 8.9 2.5 6 4.8 3.8 7.5 3.8c1.8 0 3.4 1 4.5 2.5 1.1-1.5 2.7-2.5 4.5-2.5 2.7 0 5 2.2 5 5.1 0 4.3-3.5 8.1-9.5 12.4z" fill="currentColor" fill-opacity="0.15"/><path d="M12 21.3C6 17 2.5 13.2 2.5 8.9 2.5 6 4.8 3.8 7.5 3.8c1.8 0 3.4 1 4.5 2.5 1.1-1.5 2.7-2.5 4.5-2.5 2.7 0 5 2.2 5 5.1 0 4.3-3.5 8.1-9.5 12.4z"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 0.5v4M12 19.5v4M0.5 12h4M19.5 12h4"/></svg>',
  pack: '<svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12.5H7L6 8z" fill="currentColor" fill-opacity="0.12"/><path d="M6 8h12l-1 12.5H7L6 8z"/><path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"/><line x1="6" y1="13" x2="18" y2="13"/></svg>',
  feather: '<svg viewBox="0 0 24 24"><path d="M20.5 3.5c0 7-4.5 12.5-11 14.5l-4 1 1-4C7.5 8.5 13 4 20.5 3.5z" fill="currentColor" fill-opacity="0.12"/><path d="M20.5 3.5c0 7-4.5 12.5-11 14.5l-4 1 1-4C7.5 8.5 13 4 20.5 3.5z"/><line x1="6" y1="19" x2="13.5" y2="11.5"/></svg>',
  sheet: '<svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="1.5" fill="currentColor" fill-opacity="0.08"/><rect x="5" y="2.5" width="14" height="19" rx="1.5"/><line x1="8.5" y1="7.5" x2="15.5" y2="7.5"/><line x1="8.5" y1="11.5" x2="15.5" y2="11.5"/><line x1="8.5" y1="15.5" x2="13" y2="15.5"/></svg>',
  shop: '<svg viewBox="0 0 24 24"><path d="M3.5 8.5L5 4.5h14l1.5 4"/><path d="M4 8.5v11.5h16V8.5" fill="currentColor" fill-opacity="0.08"/><path d="M4 8.5v11.5h16V8.5"/><path d="M9.5 20V13h5v7"/></svg>',
  boot: '<svg viewBox="0 0 24 24"><path d="M7 3h3v8h2.5c2 0 3 1.2 3.8 3l2.2 4.5c.3.6-.1 1.5-1 1.5H5.5c-.8 0-1.5-.7-1.5-1.5V11" fill="currentColor" fill-opacity="0.1"/><path d="M7 3h3v8h2.5c2 0 3 1.2 3.8 3l2.2 4.5c.3.6-.1 1.5-1 1.5H5.5c-.8 0-1.5-.7-1.5-1.5V11"/><line x1="4" y1="16" x2="14" y2="16"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M5 3.5h11l3 3V20a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" fill="currentColor" fill-opacity="0.08"/><path d="M5 3.5h11l3 3V20a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M8 3.5v5h7v-5"/><rect x="8" y="13" width="8" height="5.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 6.5h14"/><path d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6.5 6.5l1 13a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-13"/><line x1="10" y1="10" x2="10" y2="17"/><line x1="14" y1="10" x2="14" y2="17"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M7 8.5V3.5h10v5"/><path d="M5 8.5h14a2 2 0 0 1 2 2v6h-4"/><rect x="7" y="14.5" width="10" height="6" fill="currentColor" fill-opacity="0.08"/><rect x="7" y="14.5" width="10" height="6"/><circle cx="17.5" cy="11.5" r="0.9" fill="currentColor"/></svg>',
  coins: '<svg viewBox="0 0 24 24"><ellipse cx="9" cy="7" rx="5.5" ry="2.6" fill="currentColor" fill-opacity="0.1"/><ellipse cx="9" cy="7" rx="5.5" ry="2.6"/><path d="M3.5 7v4c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6V7"/><path d="M9.5 13.4c.7 1.1 2.7 1.9 4.9 1.9 3 0 5.6-1.2 5.6-2.6V8.5"/></svg>',
  coinout: '<svg viewBox="0 0 24 24"><ellipse cx="9" cy="8" rx="5.5" ry="2.6"/><path d="M3.5 8v4c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6V8"/><path d="M16 5l4-2-1 3 3 .5-3 2" stroke-opacity="0.8"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="1.5" fill="currentColor" fill-opacity="0.1"/><rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.3" fill="currentColor"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5H2.5L12 3.5z" fill="currentColor" fill-opacity="0.1"/><path d="M12 3.5l9.5 16.5H2.5L12 3.5z"/><line x1="12" y1="9.5" x2="12" y2="14.5"/><circle cx="12" cy="17.5" r="0.9" fill="currentColor"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor" fill-opacity="0.12"/><path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.2" y1="15.2" x2="20.5" y2="20.5"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3.5 11.5L12 4l8.5 7.5"/><path d="M5.5 10v9.5a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V10" fill="currentColor" fill-opacity="0.08"/><path d="M5.5 10v9.5a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V10"/><rect x="10" y="14" width="4" height="6"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
  sword: '<svg viewBox="0 0 24 24"><path d="M19.5 3.5l-9 9 1.5 1.5 9-9V3.5h-1.5z" fill="currentColor" fill-opacity="0.1"/><path d="M19.5 3.5l-9 9 1.5 1.5 9-9V3.5h-1.5z"/><path d="M10.5 12.5L4 19l1 1 6.5-6.5"/><line x1="6.5" y1="17.5" x2="9" y2="20"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M12 5.5C10.5 4.3 8.3 3.7 5.5 3.7V18c2.8 0 5 .6 6.5 1.8 1.5-1.2 3.7-1.8 6.5-1.8V3.7c-2.8 0-5 .6-6.5 1.8z" fill="currentColor" fill-opacity="0.08"/><path d="M12 5.5C10.5 4.3 8.3 3.7 5.5 3.7V18c2.8 0 5 .6 6.5 1.8 1.5-1.2 3.7-1.8 6.5-1.8V3.7c-2.8 0-5 .6-6.5 1.8z"/><line x1="12" y1="5.5" x2="12" y2="19.8"/></svg>',
  candle: '<svg viewBox="0 0 24 24"><path d="M12 2.5c1.5 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2.2 2-4z" fill="currentColor" fill-opacity="0.2"/><path d="M12 2.5c1.5 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2.2 2-4z"/><rect x="9" y="9" width="6" height="12" rx="1" fill="currentColor" fill-opacity="0.08"/><rect x="9" y="9" width="6" height="12" rx="1"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" fill="currentColor" fill-opacity="0.12"/><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 2.5l1.8 6.7L20.5 11l-6.7 1.8L12 19.5l-1.8-6.7L3.5 11l6.7-1.8z" fill="currentColor" fill-opacity="0.15"/><path d="M12 2.5l1.8 6.7L20.5 11l-6.7 1.8L12 19.5l-1.8-6.7L3.5 11l6.7-1.8z"/></svg>',
  hammer: '<svg viewBox="0 0 24 24"><path d="M13.5 6.5l4-4 4 4-4 4-2-2-7.5 7.5-2-2L11.5 8.5z" fill="currentColor" fill-opacity="0.1"/><path d="M13.5 6.5l4-4 4 4-4 4-2-2-7.5 7.5-2-2L11.5 8.5z"/><line x1="4" y1="20" x2="9" y2="15"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4.5"/><path d="M7.5 9L12 4.5 16.5 9"/><path d="M4.5 15v4a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4.5V16"/><path d="M7.5 11.5L12 16l4.5-4.5"/><path d="M4.5 15v4a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></svg>',
  cross: '<svg viewBox="0 0 24 24"><line x1="5.5" y1="5.5" x2="18.5" y2="18.5"/><line x1="18.5" y1="5.5" x2="5.5" y2="18.5"/></svg>',
  // Декоративные углы
  xp: '<svg viewBox="0 0 24 24"><polygon points="12,2.5 20.5,7.5 20.5,16.5 12,21.5 3.5,16.5 3.5,7.5" fill="currentColor" fill-opacity="0.12"/><polygon points="12,2.5 20.5,7.5 20.5,16.5 12,21.5 3.5,16.5 3.5,7.5"/><polyline points="3.5,7.5 12,12.5 20.5,7.5"/><line x1="12" y1="12.5" x2="12" y2="21.5"/></svg>',
  hand: '<svg viewBox="0 0 24 24"><path d="M8.5 11V5.5a1.6 1.6 0 0 1 3.2 0V11M11.7 11V4.2a1.6 1.6 0 0 1 3.2 0V11M14.9 11V5.8a1.6 1.6 0 0 1 3.2 0v8.4a7 7 0 0 1-14 0v-2.6l1.8-1.8 1.3 1.3V9.3a1.6 1.6 0 0 1 3.2 0" fill="currentColor" fill-opacity="0.1"/><path d="M8.5 11V5.5a1.6 1.6 0 0 1 3.2 0V11M11.7 11V4.2a1.6 1.6 0 0 1 3.2 0V11M14.9 11V5.8a1.6 1.6 0 0 1 3.2 0v8.4a7 7 0 0 1-14 0v-2.6l1.8-1.8 1.3 1.3V9.3a1.6 1.6 0 0 1 3.2 0"/></svg>',
  skull: '<svg viewBox="0 0 24 24"><path d="M12 2.2c-4.7 0-8.3 3.6-8.3 8.2 0 2.3.8 4 2.3 5.6V19c0 .8.6 1.4 1.4 1.4h1.1v1.2c0 .7.5 1.2 1.2 1.2h4.6c.7 0 1.2-.5 1.2-1.2v-1.2h1.1c.8 0 1.4-.6 1.4-1.4v-3c1.5-1.6 2.3-3.3 2.3-5.6 0-4.6-3.6-8.2-8.3-8.2z" fill="currentColor" fill-opacity="0.12"/><path d="M12 2.2c-4.7 0-8.3 3.6-8.3 8.2 0 2.3.8 4 2.3 5.6V19c0 .8.6 1.4 1.4 1.4h1.1v1.2c0 .7.5 1.2 1.2 1.2h4.6c.7 0 1.2-.5 1.2-1.2v-1.2h1.1c.8 0 1.4-.6 1.4-1.4v-3c1.5-1.6 2.3-3.3 2.3-5.6 0-4.6-3.6-8.2-8.3-8.2z"/><circle cx="8.8" cy="11" r="1.8" fill="currentColor"/><circle cx="15.2" cy="11" r="1.8" fill="currentColor"/><path d="M12 14.5l-1 2.5h2z" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24"><polygon points="12,2 14.6,8.6 21.5,9.2 16.2,13.8 17.9,20.5 12,16.8 6.1,20.5 7.8,13.8 2.5,9.2 9.4,8.6" fill="currentColor" fill-opacity="0.15"/><polygon points="12,2 14.6,8.6 21.5,9.2 16.2,13.8 17.9,20.5 12,16.8 6.1,20.5 7.8,13.8 2.5,9.2 9.4,8.6"/></svg>',
  emblem: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="none"/><circle cx="32" cy="32" r="24" fill="none" stroke-opacity="0.4"/><path d="M32 6v8M32 50v8M6 32h8M50 32h8" stroke-width="1.5"/><path d="M32 14c-7 0-12.5 5.5-12.5 12.5 0 3.5 1.3 6 3.6 8.4v4.5c0 1.1.9 2 2 2h1.6v1.8c0 1 .8 1.8 1.8 1.8h6.9c1 0 1.8-.8 1.8-1.8v-1.8h1.6c1.1 0 2-.9 2-2v-4.5c2.3-2.4 3.6-4.9 3.6-8.4C44.5 19.5 39 14 32 14z" fill="currentColor" fill-opacity="0.15"/><path d="M32 14c-7 0-12.5 5.5-12.5 12.5 0 3.5 1.3 6 3.6 8.4v4.5c0 1.1.9 2 2 2h1.6v1.8c0 1 .8 1.8 1.8 1.8h6.9c1 0 1.8-.8 1.8-1.8v-1.8h1.6c1.1 0 2-.9 2-2v-4.5c2.3-2.4 3.6-4.9 3.6-8.4C44.5 19.5 39 14 32 14z"/><circle cx="27" cy="27" r="2.6" fill="currentColor"/><circle cx="37" cy="27" r="2.6" fill="currentColor"/><path d="M32 32l-1.6 4h3.2z" fill="currentColor"/></svg>',
  // Декоративные углы
  corner: '<svg viewBox="0 0 40 40" preserveAspectRatio="none"><path d="M2 14 V4 H14" stroke-width="1.4" fill="none"/><path d="M6 18 V8 H18" stroke-width="0.8" stroke-opacity="0.5" fill="none"/><circle cx="4" cy="4" r="1.5" fill="currentColor"/></svg>',
  diamond: '<svg viewBox="0 0 24 12"><path d="M0 6 L9 6 M15 6 L24 6" stroke-width="1"/><path d="M12 1 L15 6 L12 11 L9 6 Z" fill="currentColor" fill-opacity="0.3"/><path d="M12 1 L15 6 L12 11 L9 6 Z"/></svg>',
};

// === Расовые эмблемы (геральдика) ===
const RACE_EMBLEMS = {
  human:  '<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.4"/><circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-width="0.8"/><path d="M40 16 L46 30 L60 32 L50 42 L53 56 L40 50 L27 56 L30 42 L20 32 L34 30 Z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.3"/><path d="M40 60 L40 68" stroke="currentColor" stroke-width="1.4"/><path d="M34 64 L46 64" stroke="currentColor" stroke-width="1"/></svg>',
  dwarf:  '<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.4"/><path d="M22 30 L40 18 L58 30 L58 52 L40 64 L22 52 Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M30 34 L40 28 L50 34 L50 48 L40 54 L30 48 Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1"/><path d="M40 22 L40 40 L36 46 M40 40 L44 46" stroke="currentColor" stroke-width="1.3"/><circle cx="40" cy="40" r="2.5" fill="currentColor"/></svg>',
  halfling:'<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.4"/><path d="M22 50 Q40 20 58 50 Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.3"/><path d="M28 50 L52 50" stroke="currentColor" stroke-width="1.2"/><path d="M40 20 L40 14" stroke="currentColor" stroke-width="1.5"/><circle cx="40" cy="12" r="2.5" fill="currentColor"/><path d="M30 56 Q40 64 50 56" stroke="currentColor" stroke-width="1" fill="none"/></svg>',
  helf:   '<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.4"/><path d="M40 14 L48 30 L66 32 L52 44 L57 62 L40 52 L23 62 L28 44 L14 32 L32 30 Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="40" cy="40" r="6" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1"/><circle cx="40" cy="40" r="1.5" fill="currentColor"/></svg>',
  welf:   '<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.4"/><path d="M40 14 Q30 28 30 40 Q30 52 40 64 Q50 52 50 40 Q50 28 40 14 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.3"/><path d="M40 14 L40 64" stroke="currentColor" stroke-width="1"/><path d="M34 28 L46 28 M32 40 L48 40 M34 52 L46 52" stroke="currentColor" stroke-width="0.8"/></svg>',
};

// === Эмблемы классов карьер (по социальному классу) ===
const CLASS_EMBLEMS = {
  // Воины — скрещённые мечи
  'Воины': '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><path d="M20 18 L44 46 M44 18 L20 46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 16 L24 22 M46 16 L40 22 M18 48 L24 42 M46 48 L40 42" stroke="currentColor" stroke-width="1.6"/></svg>',
  // Книгочеи — раскрытая книга
  'Книгочеи': '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><path d="M32 22 C26 18 20 18 16 20 L16 44 C20 42 26 42 32 46 C38 42 44 42 48 44 L48 20 C44 18 38 18 32 22 Z" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.3"/><path d="M32 22 L32 46" stroke="currentColor" stroke-width="1.2"/></svg>',
  // Шельмы — кинжал
  'Шельмы': '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><path d="M32 14 L35 40 L32 46 L29 40 Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.3"/><path d="M24 40 L40 40 M32 46 L32 52" stroke="currentColor" stroke-width="1.6"/></svg>',
  // Крестьяне — сноп/серп
  'Крестьяне': '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><path d="M32 16 L32 48 M32 22 Q26 24 24 30 M32 22 Q38 24 40 30 M32 30 Q26 32 24 38 M32 30 Q38 32 40 38" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  // Бюргеры — монета/весы
  'Бюргеры': '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><path d="M32 16 L32 44 M20 22 L44 22" stroke="currentColor" stroke-width="1.4"/><path d="M20 22 L15 32 L25 32 Z M44 22 L39 32 L49 32 Z" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.2"/><path d="M26 46 L38 46" stroke="currentColor" stroke-width="1.4"/></svg>',
  // Придворные — корона
  'Придворные': '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><path d="M18 40 L18 26 L26 34 L32 22 L38 34 L46 26 L46 40 Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.3"/><path d="M18 44 L46 44" stroke="currentColor" stroke-width="1.6"/></svg>',
  // Речники — якорь
  'Речники': '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><circle cx="32" cy="20" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M32 23 L32 46 M24 32 L40 32" stroke="currentColor" stroke-width="1.5"/><path d="M20 38 Q22 48 32 48 Q42 48 44 38" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  // Странники — компас/дорога
  'Странники': '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M32 22 L36 32 L32 42 L28 32 Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.2"/><path d="M32 16 L32 19 M32 45 L32 48 M16 32 L19 32 M45 32 L48 32" stroke="currentColor" stroke-width="1.4"/></svg>',
  default: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2"/><path d="M22 22 L32 14 L42 22 L42 42 L32 50 L22 42 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M32 22 L32 42 M24 32 L40 32" stroke="currentColor" stroke-width="1"/></svg>',
};

// Вкладки бланка персонажа — это страницы, а не аккордеоны.
const SHEET_TABS = [
  { id: 'persona', label: 'Персонаж', icon: 'user' },
  { id: 'race',    label: 'Народ',    icon: 'flag' },
  { id: 'career',  label: 'Карьера',  icon: 'scroll' },
  { id: 'stats',   label: 'Статы',    icon: 'dice' },
  { id: 'fate',    label: 'Судьба',   icon: 'compass' },
  { id: 'health',  label: 'Здоровье', icon: 'heart' },
  { id: 'crit',    label: 'Схватка и раны', icon: 'heart' },
  { id: 'skills',  label: 'Навыки',   icon: 'target' },
  { id: 'magic',   label: 'Магия / Вера', icon: 'scroll' },
  { id: 'downtime', label: 'Между приключениями', icon: 'compass' },
  { id: 'gear',    label: 'Имущество', icon: 'pack' },
  { id: 'notes',   label: 'Штрихи',   icon: 'feather' },
  { id: 'rolllog', label: 'Журнал бросков', icon: 'dice' },
  { id: 'print',   label: 'Бланк',    icon: 'sheet' },
  { id: 'more',    label: 'Ещё',      icon: 'pack' },
];

// Состояния WFRP4
const WFRP_CONDITIONS = [
  'Горящий','Кровоточащий','Ослепший','Сломленный',
  'Оглохший','Опутанный','Уставший','Отравленный',
  'Лежащий','Оглушённый','Ошеломлённый','Бессознательный'
];

// Краткие пояснения для новичков: что делает состояние и как снимается.
// Своими словами по WFRP4 (гл. V). stack=true — можно накопить несколько.
function _qualBaseKey(token){
  // 'перезарядка (1)' → 'перезарядка'; убираем число и скобки, нижний регистр
  return token.replace(/\(.*?\)/g,'').replace(/[0-9]+/g,'').trim().toLowerCase();
}
function toggleQualInfo(i){
  const box = document.getElementById('qual-info-box');
  if(!box) return;
  const w = state.sheet.weapons[i];
  if(!w){ box.style.display='none'; return; }
  const tokens = (w.qualities||'').split(/[,;]/).map(s=>s.trim()).filter(Boolean);
  if(!tokens.length){ box.style.display='none'; return; }
  let html = `<div style="color:var(--gold2);font-weight:600;font-size:13px;margin-bottom:4px;">${escHtml(w.name||'Оружие')} — качества</div>`;
  tokens.forEach(tok => {
    const key = _qualBaseKey(tok);
    const desc = QUALITY_INFO[key];
    html += `<div style="font-size:12px;margin-top:3px;"><b>${escHtml(tok)}</b>${desc?' — '+escHtml(desc):' <span class="muted">(нет описания)</span>'}</div>`;
  });
  box.innerHTML = html;
  box.style.display = 'block';
  box.scrollIntoView({behavior:'smooth', block:'nearest'});
}

// Текущая открытая вкладка бланка
let _sheetTab = 'persona';

// Точечное обновление HP (без полной перерисовки)
function sv2HpDelta(delta, max){
  if(!state.sheet) return;
  state.sheet.currentHP = Math.max(0, Math.min(max, (state.sheet.currentHP||0) + delta));
  if(navigator.vibrate) navigator.vibrate(delta<0 ? 25 : 12);
  // Обновим только нужные DOM-элементы
  document.querySelectorAll('[data-hp-val]').forEach(el => { el.textContent = state.sheet.currentHP; });
  // обновим прогресс-бар
  document.querySelectorAll('[data-hp-bar]').forEach(el => {
    el.style.width = (max>0 ? (state.sheet.currentHP/max*100).toFixed(1) : 0) + '%';
  });
  // обновим input
  const inp = document.getElementById('hp-input');
  if(inp) inp.value = state.sheet.currentHP;
  updateBloodVignette(max);
  autosave();
}
function sv2HpFull(max){
  state.sheet.currentHP = max;
  document.querySelectorAll('[data-hp-val]').forEach(el => { el.textContent = max; });
  document.querySelectorAll('[data-hp-bar]').forEach(el => { el.style.width = '100%'; });
  const inp = document.getElementById('hp-input'); if(inp) inp.value = max;
  updateBloodVignette(max);
  autosave();
}

// Пересчитать уровень кровавой виньетки по краям экрана
function updateBloodVignette(max){
  const pct = max>0 ? (state.sheet.currentHP/max) : 1;
  let lvl = 0;
  if(pct <= 0.66) lvl = 1;
  if(pct <= 0.33) lvl = 2;
  if(pct <= 0.15) lvl = 3;
  const v = document.querySelector('.sv4-blood-vignette');
  if(v) v.setAttribute('data-blood', lvl);
  const root = document.querySelector('.sheet-v4');
  if(root) root.setAttribute('data-blood', lvl);
  // Цвет числа HP на главной
  const hpv = document.getElementById('main-hp-v');
  if(hpv){
    hpv.style.color = pct>0.66 ? 'var(--green2)' : pct>0.33 ? 'var(--gold2)' : 'var(--blood2)';
  }
}

// Изменить полученный опыт (с защитой от ухода ниже потраченного)
// Свободный ввод: мастер выдаёт сколько угодно, а не только круглые числа
function addXPFree(sign){
  const el = document.getElementById('xp-free');
  const n = Math.abs(parseInt(el && el.value, 10) || 0);
  if(!n){ notify('Впиши, сколько опыта начислить.'); if(el) el.focus(); return; }
  addXP(sign === -1 ? -n : n);
}

function addXP(delta){
  const spent = state.sheet.spentXP || 0;
  let next = (state.xpGained || 0) + delta;
  if(next < spent) next = spent; // нельзя иметь меньше, чем уже потрачено
  if(next < 0) next = 0;
  state.xpGained = next;
  autosave();
  renderSheet();
}

// === d100 проверка по навыку/характеристике ===
// Названия, к которым по книге применяется преимущество: бой и оружейные навыки
function advantageApplies(name){
  const n = String(name || '').toLowerCase();
  return n === 'бб' || n === 'дб' ||
         n.startsWith('рукопашный бой') || n.startsWith('стрельба');
}

function rollCheck(name, target){
  target = parseInt(target)||0;
  // Преимущество: +10 за пункт к боевым проверкам — как и написано на бланке
  const adv = (state.sheet && state.sheet.advantage) || 0;
  const advBonus = (adv > 0 && advantageApplies(name)) ? adv * 10 : 0;
  target += advBonus;
  const d = Math.floor(Math.random()*100) + 1; // 1..100
  let outcome, cls, slvl = 0;
  // Уровни успеха/провала: разница десятков
  const diff = target - d;
  slvl = Math.trunc(target/10) - Math.trunc(d/10);
  const crit = (d % 11 === 0) || d === 1 || d === 100; // дубли = критич.
  if(d === 1){ outcome = 'Критический успех!'; cls='crit-success'; }
  else if(d === 100){ outcome = 'Критический провал!'; cls='crit-fail'; }
  else if(d <= target){
    outcome = crit ? 'Критический успех!' : 'Успех';
    cls = crit ? 'crit-success' : 'success';
  } else {
    outcome = crit ? 'Критический провал!' : 'Провал';
    cls = crit ? 'crit-fail' : 'fail';
  }
  const slText = (d<=target ? '+' : '') + slvl + ' ст.усп.';
  if(navigator.vibrate) navigator.vibrate(d<=target?[20]:[40,30,40]);
  showRollResult(advBonus ? name + ' (+' + advBonus + ' за преимущество)' : name,
                 target, d, outcome, cls, slText);
}
function rollLogRows(){
  const log = (state.sheet && state.sheet.rollLog) || [];
  if(!log.length) return '<p class="muted" style="padding:6px 2px;">Бросков пока нет. Тапни характеристику или навык, чтобы бросить d100.</p>';
  return log.map(r => {
    const ok = r.d <= r.target;
    const col = /Крит.*успех/.test(r.outcome) ? 'var(--green2)' : /Крит.*провал/.test(r.outcome) ? 'var(--blood2)' : (ok?'var(--gold2)':'var(--text3)');
    const tm = new Date(r.t||Date.now());
    const hh = String(tm.getHours()).padStart(2,'0')+':'+String(tm.getMinutes()).padStart(2,'0');
    return `<div class="sv4-rolllog-row">
      <div class="sv4-rolllog-main"><b>${escHtml(r.name||'')}</b> <span class="muted">≤${r.target}</span></div>
      <div class="sv4-rolllog-die" style="color:${col}">${r.d}</div>
      <div class="sv4-rolllog-out" style="color:${col}">${escHtml(r.outcome||'')} <span class="muted">${escHtml(r.sl||'')}</span></div>
      <div class="sv4-rolllog-tm muted">${hh}</div>
    </div>`;
  }).join('');
}
function rollLogCopy(){
  const log = (state.sheet && state.sheet.rollLog) || [];
  if(!log.length){ notify('Журнал пуст.'); return; }
  const txt = log.map(r => `${escHtml(r.name)}: d100=${r.d} (≤${r.target}) → ${r.outcome} ${r.sl||''}`).join('\n');
  if(navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>notify('Журнал скопирован'),()=>notify('Не удалось скопировать'));
  else notify('Копирование недоступно');
}
function rollLogClear(){
  if(state.sheet) state.sheet.rollLog = [];
  if(typeof autosave==='function') autosave();
  renderSheet();
}
function renderTabRollLog(){
  const tray = (typeof diceTrayHtml === 'function') ? diceTrayHtml() : '';
  return tray + `<div class="sv4-block">
    <div class="sv4-block-title">🎲 Журнал бросков</div>
    <p class="muted" style="font-size:11px;">Последние 30 проверок d100. Сбрасывается кнопкой ниже.</p>
    <div class="sv4-row" style="gap:8px;margin:8px 0;flex-wrap:wrap;">
      <button class="btn btn-sm btn-gold" onclick="rollLogCopy()">⧉ Копировать для ГМ</button>
      <button class="btn btn-sm" onclick="rollLogClear()">Очистить</button>
    </div>
    <div id="rolllog-body" class="sv4-rolllog">${rollLogRows()}</div>
  </div>`;
}
function showRollResult(name, target, d, outcome, cls, slText){
  try{
    if(state && state.sheet){
      if(!Array.isArray(state.sheet.rollLog)) state.sheet.rollLog = [];
      state.sheet.rollLog.unshift({ name, target, d, outcome, sl: slText, t: Date.now() });
      if(state.sheet.rollLog.length > 30) state.sheet.rollLog.length = 30;
      if(typeof autosave==='function') autosave();
      const lb = document.getElementById('rolllog-body');
      if(lb) lb.innerHTML = rollLogRows();
    }
  }catch(e){}
  let modal = document.getElementById('roll-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'roll-modal';
    modal.className = 'sv4-roll-modal';
    modal.onclick = () => modal.classList.remove('show');
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="sv4-roll-card ${cls}" onclick="event.stopPropagation()">
    <div class="sv4-roll-skill">${escHtml(name)}</div>
    <div class="sv4-roll-target">цель ≤ ${target}</div>
    <div class="sv4-roll-die">${d}</div>
    <div class="sv4-roll-outcome">${outcome}</div>
    <div class="sv4-roll-sl">${slText}</div>
    <div class="sv4-roll-btns">
      <button class="sv4-roll-close" onclick="document.getElementById('roll-modal').classList.remove('show')">Закрыть</button>
      <button class="sv4-roll-again" data-call="roll" data-v="${escAttr(name)}" data-n="${target}"><span class="ic">${ICONS.dice}</span> Ещё раз</button>
    </div>
  </div>`;
  modal.classList.add('show');
}

// Точечное обновление денег (без перерисовки страницы)
function sv2MoneyDelta(field, delta){
  if(!state.sheet.money) state.sheet.money = {gc:0,ss:0,bp:0};
  state.sheet.money[field] = Math.max(0, (state.sheet.money[field]||0) + delta);
  sv2UpdateMoneyUI();
  autosave();
}
function sv2MoneySet(field, val){
  if(!state.sheet.money) state.sheet.money = {gc:0,ss:0,bp:0};
  state.sheet.money[field] = Math.max(0, parseInt(val)||0);
  sv2UpdateMoneyUI();
  autosave();
}
function sv2UpdateMoneyUI(){
  const m = state.sheet.money || {gc:0,ss:0,bp:0};
  ['gc','ss','bp'].forEach(f => {
    const inp = document.getElementById('money-'+f);
    if(inp) inp.value = m[f]||0;
  });
  const tot = document.getElementById('money-total');
  if(tot) tot.textContent = moneyToBP(m);
}
// Разменять в обе стороны.
// dir = 'down' (крупная → мелкие), 'up' (мелкие → крупная)
function sv2MoneyExchange(from, dir){
  if(!state.sheet.money) state.sheet.money = {gc:0,ss:0,bp:0};
  const m = state.sheet.money;
  if(dir === 'down'){
    if(from==='gc' && (m.gc||0)>0){ m.gc--; m.ss=(m.ss||0)+20; }
    else if(from==='ss' && (m.ss||0)>0){ m.ss--; m.bp=(m.bp||0)+12; }
    else { notify('Нет монет для размена.'); return; }
  } else {
    if(from==='ss' && (m.ss||0)>=20){ m.ss-=20; m.gc=(m.gc||0)+1; }
    else if(from==='bp' && (m.bp||0)>=12){ m.bp-=12; m.ss=(m.ss||0)+1; }
    else { notify('Не хватает мелких монет для размена.'); return; }
  }
  sv2UpdateMoneyUI();
  autosave();
}

// Состояния — точечно
function toggleCondInfo(name){
  const box = document.getElementById('cond-info-box');
  if(!box) return;
  const info = CONDITION_INFO[name] || {};
  const html = `<div style="color:var(--gold2);font-weight:600;font-size:13px;">${name}${info.stack===false?' <span class="muted" style="font-weight:400;font-size:11px;">(не накапливается)</span>':''}</div>
    <div style="font-size:12px;margin-top:3px;">${escHtml(info.what||'')}</div>
    <div style="font-size:11px;margin-top:3px;color:var(--parch2);"><b>Снятие:</b> ${escHtml(info.clear||'')}</div>`;
  // повторный клик по тому же состоянию — скрыть
  if(box.style.display!=='none' && box.dataset.cond===name){ box.style.display='none'; box.dataset.cond=''; return; }
  box.innerHTML = html;
  box.dataset.cond = name;
  box.style.display = 'block';
}

function sv2CondDelta(name, delta){
  if(!state.sheet.conditions) state.sheet.conditions = {};
  state.sheet.conditions[name] = Math.max(0, (state.sheet.conditions[name]||0)+delta);
  const el = document.querySelector(`[data-cond="${name}"] .sv4-cond-val`);
  if(el) el.textContent = state.sheet.conditions[name];
  const row = document.querySelector(`[data-cond="${name}"]`);
  if(row) row.classList.toggle('active', state.sheet.conditions[name]>0);
  autosave();
}

// Преимущество (боевой счётчик) — лёгкое обновление без полной перерисовки
function sv2AdvDelta(delta){
  state.sheet.advantage = Math.max(0, (state.sheet.advantage||0)+delta);
  sv2AdvSync();
  autosave();
}
function sv2AdvReset(){
  state.sheet.advantage = 0;
  sv2AdvSync();
  autosave();
}
// Счётчик виден и на бланке, и на вкладке здоровья — обновляем оба места
function sv2AdvSync(){
  const v = state.sheet.advantage || 0;
  document.querySelectorAll('[data-adv-val], #sv4-adv-val').forEach(el => { el.textContent = v; });
}

// Увечия / болезни / мутации (теперь без полной перерисовки)
// renderTabHealth перерисовывает только вкладку и НЕ сохраняет — в отличие от
// renderSheet, который зовёт autosave сам. Пока этого здесь не было, увечье,
// вписанное на уже открытой вкладке «Здоровье», оставалось только в памяти:
// закрыть приложение в этот момент — и записи нет.
function sv2AddInjury(){
  const inp = document.getElementById('inj-input');
  const v = (inp.value||'').trim();
  if(!v) return;
  if(!state.sheet.injuries) state.sheet.injuries = [];
  state.sheet.injuries.push(v);
  inp.value = '';
  autosave();
  renderTabHealth(); // только текущая вкладка
}
function sv2RemInjury(i){
  state.sheet.injuries.splice(i,1);
  autosave();
  renderTabHealth();
}
function sv2AddDisease(){
  const inp = document.getElementById('dis-input');
  const v = (inp.value||'').trim();
  if(!v) return;
  if(!state.sheet.diseases) state.sheet.diseases = [];
  state.sheet.diseases.push(v);
  inp.value = '';
  autosave();
  renderTabHealth();
}
function sv2RemDisease(i){
  state.sheet.diseases.splice(i,1);
  autosave();
  renderTabHealth();
}

// Бейдж бонусов таланта
function talentBadgeFor(talentName, level){
  const eff = TALENT_EFFECTS && TALENT_EFFECTS[(talentName||'').toLowerCase()];
  if(!eff) return '';
  const parts = [];
  if(eff.stat && eff.amount) parts.push(`+${eff.amount} ${eff.stat}`);
  if(eff.move) parts.push(`+${eff.move} скор.`);
  if(eff.hpPerRV){
    const rv = Math.floor(((state.stats['В']||0)+((state.sheet.statAdvBought&&state.sheet.statAdvBought['В'])||0))/10);
    parts.push(`+${level*rv} HP`);
  }
  if(eff.encumbrance) parts.push(`+${level*eff.encumbrance} вес`);
  if(eff.resolveMax) parts.push(`+${level} реш.`);
  if(eff.corruptionThreshold) parts.push(`+${level} порог`);
  return parts.join(' · ');
}

// === Главная функция отрисовки бланка ===
function dossierSerial(){
  // Детерминированный номер досье из id персонажа (формат 882-99/X)
  const src = String(state.id || state.name || 'NOVUS');
  let h = 0;
  for(let i=0;i<src.length;i++){ h = (h*31 + src.charCodeAt(i)) >>> 0; }
  const a = (h % 900 + 100);          // 100..999
  const b = (Math.floor(h/900) % 90 + 10); // 10..99
  const letters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ';
  const L = letters[Math.floor(h/81000) % letters.length];
  return `${a}-${b}/${L}`;
}

function renderSheet(){
  const el = document.getElementById('sheet-area');
  if(!state.race || !state.career){
    el.innerHTML = '<p class="muted">Нужно завершить шаги 1–7, чтобы открыть лист персонажа.</p>';
    return;
  }
  // init
  if(!state.sheet.conditions) state.sheet.conditions = {};
  if(!state.sheet.injuries) state.sheet.injuries = [];
  if(!state.sheet.diseases) state.sheet.diseases = [];
  if(!state.sheet.money) state.sheet.money = {gc:0,ss:0,bp:0};
  if(!state.sheet.weapons) state.sheet.weapons = [];
  if(!state.sheet.armor) state.sheet.armor = [];
  if(!state.sheet.trappings) state.sheet.trappings = [];

  const r = DATA.races[state.race];
  const c = DATA.careers[state.career];
  const calc = sheetCalc();
  const maxHP = calc.maxHP || 0;
  if(state.sheet.currentHP === null || state.sheet.currentHP === undefined) state.sheet.currentHP = maxHP;
  if(state.sheet.currentHP > maxHP) state.sheet.currentHP = maxHP;

  const xpAvail = (state.xpGained||0) - (state.sheet.spentXP||0);
  const inRoster = !!(state.id && loadRoster().find(p => p.id === state.id));

  const currentTab = SHEET_TABS.find(t => t.id === _sheetTab) || SHEET_TABS[0];
  const isMain = _sheetTab === 'persona';

  // Уровень "крови" по краям: 0 при полном HP, растёт при ранении
  const hpPct = maxHP>0 ? (state.sheet.currentHP/maxHP) : 1;
  let bloodLevel = 0;
  if(hpPct <= 0.66) bloodLevel = 1;
  if(hpPct <= 0.33) bloodLevel = 2;
  if(hpPct <= 0.15) bloodLevel = 3;

  let html = `<div class="sheet-v4" data-blood="${bloodLevel}">`;
  html += `<div class="sv4-blood-vignette" data-blood="${bloodLevel}"></div>`;

  // === ШАПКА-КОРЕШОК ДЕЛА (одна строка) ===
  html += `<div class="ordo-bar">
    <button class="ordo-seal" onclick="drawerOpen()" title="Меню">☰</button>
    <div class="ordo-meta">
      <div class="ordo-no">Дело · ${escHtml(r.name)} · ${escHtml(state.career||'—')}</div>
      <div class="ordo-name">${escHtml(state.name||'Без имени')}</div>
    </div>
    <button class="ordo-die" onclick="diceOpen()" title="Бросить кубы" aria-label="Бросить кубы">⚄</button>
    <button class="ordo-xp" onclick="goStep(9)" title="Магазин обучения (трата XP)">
      <b>${xpAvail}</b><span>XP · лавка</span>
    </button>
  </div>`;

  if(!isMain){
    html += `<button class="sv4-back" onclick="sv4NavGo('persona')">← Вернуться на бланк</button>`;
  }

  // === КОНТЕНТ СТРАНИЦЫ ===
  html += '<div class="sv4-page" id="sv4-page">';
  html += renderTabContent(_sheetTab);
  // === ПАНЕЛЬ ТАЛАНТОВ ВНИЗУ (только на главной) — внутри page ===
  if(isMain){
    html += renderQuickTalents();
  }
  html += '</div>';

  // === Плавающая кнопка урона по HP (быстрый доступ в бою) ===
  const hpNow = state.sheet.currentHP||0;
  html += `<div class="sv4-fab-hp" title="Быстрый урон/лечение">
    <button class="sv4-fab-btn heal" onclick="sv2HpDelta(1,${maxHP})">＋</button>
    <div class="sv4-fab-val" data-hp-val>${hpNow}</div>
    <button class="sv4-fab-btn dmg" onclick="sv2HpDelta(-1,${maxHP})">－</button>
  </div>`;

  // === Нижняя панель быстрого доступа ===
  const navItem = (tab, icon, label) =>
    `<button class="sv4-bottom-item ${_sheetTab===tab?'active':''}" onclick="sv4NavGo('${tab}')">
      ${ICONS[icon]||''}<span>${label}</span>
    </button>`;
  const moreActive = !['persona','skills','health','crit'].includes(_sheetTab);
  html += `<div class="sv4-bottom-nav">
    ${navItem('persona','user','Дело')}
    ${navItem('skills','target','Навыки')}
    ${navItem('health','heart','Здоровье')}
    ${navItem('crit','dice','Бой')}
    <button class="sv4-bottom-item ${moreActive?'active':''}" onclick="sv4NavGo('more')">${ICONS.pack}<span>Ещё</span></button>
  </div>`;

  html += '</div>'; // .sheet-v4
  el.innerHTML = html;
  syncOrdoBars();
  updateBloodVignette(maxHP);
  autosave();
}

// === Боковая навигация: открыть/закрыть/перейти ===
// Безопасный доступ к DOM-элементу (защита от null-падений)
function byId(id){ return document.getElementById(id); }


// === Вкладка «Ещё»: сетка разделов дела + системные действия ===

// === «Лист дела»: фактура бумаги, кляксы порчи, прожог при смерти ===

function renderTabMore(){
  // data-tile вместо кода в атрибуте: разбирает его один обработчик ниже
  const tile = (fn, icon, label, sub) =>
    `<button class="ordo-tile" data-tile="${escAttr(fn)}">
      <span class="ordo-tile-ic">${icon}</span>
      <span class="ordo-tile-l">${label}</span>
      ${sub?`<span class="ordo-tile-s">${sub}</span>`:''}
    </button>`;
  // Плитки разделены по тому, как часто за ними лезут: за игрой — каждую
  // сессию, в досье — один раз при создании и потом изредка. В одной сетке
  // «Имущество» стояло рядом с «Народом», и нужное уходило за прокрутку.
  let h = `<div class="sv4-block"><div class="sv4-block-title">За игрой</div>
    <div class="ordo-grid">
      ${tile("sv4NavGo('gear')",ICONS.pack,'Имущество','оружие · броня · кошель')}
      ${tile("sv4NavGo('magic')",ICONS.sparkle,'Магия / Вера','заклинания · молитвы')}
      ${tile("sv4NavGo('rolllog')",ICONS.book,'Кубы и журнал','броски')}
      ${tile("sv4NavGo('downtime')",ICONS.moon,'Отдых','между приключениями')}
      ${tile("goStep(9)",ICONS.shop,'Магазин XP','трата опыта')}
      ${tile("typeof gmOpen==='function'&&gmOpen()",ICONS.emblem,'Печати ГМ','отметки на деле')}
    </div></div>`;
  h += `<div class="sv4-block"><div class="sv4-block-title">Досье</div>
    <div class="ordo-grid ref">
      ${tile("sv4NavGo('stats')",ICONS.dice,'Статы','характеристики')}
      ${tile("sv4NavGo('fate')",ICONS.compass,'Судьба','удача · решимость')}
      ${tile("sv4NavGo('race')",ICONS.flag,'Народ','')}
      ${tile("sv4NavGo('career')",ICONS.scroll,'Карьера','ступени · смена')}
      ${tile("sv4NavGo('notes')",ICONS.feather,'Штрихи','имя · внешность')}
      ${tile("sv4NavGo('print')",ICONS.sheet,'Бланк','печатный вид')}
    </div></div>`;
  h += `<div class="sv4-block"><div class="sv4-block-title">Архив и файлы</div>
    <div class="ordo-grid sys">
      ${tile("toggleTheme()",ICONS.candle,'Тема','светлая / тёмная')}
      ${tile("sv4DoAction('save')",ICONS.save,'Сохранить','в архив')}
      ${tile("sv4DoAction('export')",ICONS.download,'Экспорт','JSON-файл')}
      ${tile("sv4DoAction('import')",ICONS.upload,'Импорт','из JSON')}
      ${tile("sv4DoAction('print')",ICONS.print,'Печать','PDF из браузера')}
      ${tile("sv4DoAction('gallery')",ICONS.home,'В архив','на главную')}
      ${tile("openSupport()",ICONS.coins,'Поддержать','автору на кости')}
    </div>
    <input type="file" id="import-file" accept=".json" style="display:none" onchange="importSheet(this)" />
    <button class="btn btn-sm" style="margin-top:14px;border-color:var(--blood2);color:var(--blood2);" onclick="sv4DoAction('delete')">✕ Удалить персонажа из архива</button>
  </div>`;
  return h;
}

function sv4NavClose(){
  const n = byId('sv4-nav'), b = byId('sv4-nav-bd');
  if(n) n.classList.remove('open');
  if(b) b.classList.remove('open');
}
function sv4NavGo(tabId){
  _sheetTab = tabId;
  sv4NavClose();
  renderSheet();
  if(typeof navEnter === 'function') navEnter('tab', tabId);
  if(typeof navGoingBack === 'function' && navGoingBack()) return;
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 10);
}
function sv4DoAction(action){
  sv4NavClose();
  switch(action){
    case 'shop': goStep(9); break;
    case 'save':
      saveCharacterToRoster();
      _sheetTab = 'persona';
      goStep(8);
      break;
    case 'export': exportSheet(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'print':
      _sheetTab = 'print';
      renderSheet();
      setTimeout(() => window.print(), 200);
      break;
    case 'gallery': goStep(0); break;
    case 'delete':
      if(state.id){
        ordoConfirm({
          title: 'Изъять дело из архива?',
          text: 'Персонаж будет удалён безвозвратно.',
          yes: 'Удалить', no: 'Оставить', danger: true,
          onYes: () => deleteCharacter(state.id, { stopPropagation: ()=>{} }, true)
        });
      }
      break;
  }
}

// === Быстрая панель талантов внизу главной (краткая справка) ===
function renderQuickTalents(){
  const talents = compileTalents();
  if(!talents.length) return '';
  let h = `<div class="sv4-quick-talents">
    <div class="sv4-qt-head">
      <div class="sv4-qt-title">${ICONS.star}<span>Таланты <small>(${talents.length})</small></span></div>
      <button class="sv4-btn-link" onclick="sv4NavGo('talents')">Все подробно →</button>
    </div>
    <div class="sv4-qt-list">`;
  talents.forEach(t => {
    const badge = talentBadgeFor(t.name, t.level);
    let tip = t.hint || '—';
    if(t.name && t.name.includes('Роковое')){
      const proph = (state.sheet.doomedProphecy || '').trim();
      tip = proph ? '«'+proph+'»' : 'Пророчество ещё не задано — впиши на шаге «Штрихи»';
    }
    h += `<div class="sv4-qt-chip" title="${escAttr(tip)}">
      <span class="sv4-qt-name">${escHtml(t.name)}</span>
      ${badge?`<span class="sv4-qt-badge">${escHtml(badge)}</span>`:''}
      <span class="sv4-qt-lvl">${t.level}⭐</span>
    </div>`;
  });
  h += `</div></div>`;
  return h;
}

// === Контент по вкладке ===
function renderTabContent(tab){
  switch(tab){
    case 'persona':  return renderTabPersona();
    case 'race':     return renderTabRace();
    case 'career':   return renderTabCareer();
    case 'stats':    return renderTabStats();
    case 'fate':     return renderTabFate();
    case 'health':   return renderTabHealthInner();
    case 'crit':     return (typeof encounterHtml === 'function' ? encounterHtml() : '') + renderTabCrit();
    case 'more':     return renderTabMore();
    case 'skills':   return renderTabSkills();
    case 'magic':    return renderTabArcane();
    case 'downtime': return renderTabDowntime();
    case 'talents':  return renderTabTalents();
    case 'gear':     return renderTabGear();
    case 'rolllog':  return renderTabRollLog();
    case 'notes':    return renderTabNotes();
    case 'print':    return renderTabPrint();
    default:         return renderTabPersona();
  }
}

// ============== ГЛАВНАЯ: БОЕВОЙ ЛИСТ ==============
function renderTabPersona(){
  const r = DATA.races[state.race];
  const c = DATA.careers[state.career];
  const calc = sheetCalc();
  const maxHP = calc.maxHP || 0;
  const tier = c.tiers[(state.sheet.tier||1)-1];
  const totals = calc.totals;
  const skills = compileSkills();
  const learned = skills.filter(s => s.adv>0);
  const corr = state.sheet.corruption||0;
  const corrThr = calc.corruptionThreshold;

  // Сводка брони по зонам — разделяем руки и ноги на левую/правую
  const apByZone = { 'голова':0, 'тело':0, 'праваярука':0, 'леваярука':0, 'праваянога':0, 'леваянога':0 };
  (state.sheet.armor||[]).forEach(a => {
    const ap = parseInt(a.ap)||0;
    const z = (a.zones||'').toLowerCase();
    if(z.includes('голов')) apByZone['голова'] += ap;
    if(z.includes('тел') || z.includes('торс') || z.includes('груд')) apByZone['тело'] += ap;
    // руки
    const hasLeftArm = z.includes('лев') && z.includes('рук');
    const hasRightArm = z.includes('прав') && z.includes('рук');
    if(hasLeftArm) apByZone['леваярука'] += ap;
    if(hasRightArm) apByZone['праваярука'] += ap;
    if(z.includes('рук') && !hasLeftArm && !hasRightArm){ apByZone['леваярука'] += ap; apByZone['праваярука'] += ap; }
    // ноги
    const hasLeftLeg = z.includes('лев') && z.includes('ног');
    const hasRightLeg = z.includes('прав') && z.includes('ног');
    if(hasLeftLeg) apByZone['леваянога'] += ap;
    if(hasRightLeg) apByZone['праваянога'] += ap;
    if(z.includes('ног') && !hasLeftLeg && !hasRightLeg){ apByZone['леваянога'] += ap; apByZone['праваянога'] += ap; }
  });

  let h = '';
  // Hero card
  h += `<div class="sv4-hero">
    ${typeof portraitHtml === 'function' ? portraitHtml() : ''}
    <div class="sv4-hero-info">
      <input class="sv4-hero-name" value="${escAttr(state.name||'')}" placeholder="Имя персонажа" onchange="state.name=this.value;autosave();" />
      <div class="sv4-hero-sub">${escHtml(r.name)} <span class="dot">●</span> ${escHtml(state.career)}</div>
      <div class="sv4-hero-fields">
        <label class="sv4-hf"><span>Возраст:</span><input value="${escAttr(state.age||'')}" onchange="state.age=this.value;autosave();" /></label>
        <label class="sv4-hf"><span>Рост:</span><input value="${escAttr(state.height||'')}" onchange="state.height=this.value;autosave();" /></label>
        <label class="sv4-hf"><span>Вес:</span><input value="${escAttr(state.weight||'')}" placeholder="—" onchange="state.weight=this.value;autosave();" /></label>
        <label class="sv4-hf"><span>Глаза:</span><input value="${escAttr(state.eyes||'')}" onchange="state.eyes=this.value;autosave();" /></label>
        <label class="sv4-hf"><span>Волосы:</span><input value="${escAttr(state.hair||'')}" onchange="state.hair=this.value;autosave();" /></label>
      </div>
      <div class="arch-serial" style="margin-top:6px;">ДОСЬЕ № ${dossierSerial()} · АРХИВ РЕЙКЛАНДА</div>
    </div>
    <div class="sv4-hero-emblem">${ICONS.emblem}</div>
  </div>`;

  // Текущая ступень
  h += `<div class="sv4-tier-badge">
    <span class="sv4-tier-ico">${ICONS.skull}</span>
    <div class="sv4-tier-info">
      <div class="sv4-tier-l">ТЕКУЩАЯ СТУПЕНЬ</div>
      <div class="sv4-tier-name"><b>${state.sheet.tier}</b> · ${escHtml(tier.name)}</div>
    </div>
  </div>`;

  // Боевая сводка — крупно сверху
  h += `<div class="sv4-section-title"><span class="ic">${ICONS.sword}</span> Боевая сводка</div>`;
  h += `<div class="sv4-combat-row">
    <div class="sv4-combat-card hp" onclick="sv4NavGo('health')">
      <div class="sv4-c-l">ЗДОРОВЬЕ</div>
      <div class="sv4-c-icon">${ICONS.heart}</div>
      <div class="sv4-c-v" id="main-hp-v"><span data-hp-val>${state.sheet.currentHP}</span><span class="max"> / ${maxHP}</span></div>
      <div class="sv4-c-bar"><div class="sv4-c-bar-fill" data-hp-bar style="width:${maxHP>0?(state.sheet.currentHP/maxHP*100).toFixed(1):0}%;"></div></div>
      <div class="sv4-c-sub">тап → к редактированию</div>
    </div>
    <div class="sv4-combat-card">
      <div class="sv4-c-l">СКОРОСТЬ</div>
      <div class="sv4-c-icon">${ICONS.boot}</div>
      <div class="sv4-c-v">${calc.move}</div>
      <div class="sv4-c-sub">шаг ${calc.move*2} · бег ${calc.move*4}</div>
    </div>
    <div class="sv4-combat-card adv">
      <div class="sv4-c-l">ПРЕИМУЩЕСТВО</div>
      <div class="sv4-adv-row">
        <button class="sv4-adv-btn" onclick="event.stopPropagation();sv2AdvDelta(-1)" aria-label="Убрать пункт">−</button>
        <b class="sv4-c-v" data-adv-val>${state.sheet.advantage||0}</b>
        <button class="sv4-adv-btn" onclick="event.stopPropagation();sv2AdvDelta(1)" aria-label="Добавить пункт">+</button>
      </div>
      <div class="sv4-c-sub">+10 к бою за пункт · <button class="sv4-adv-reset" onclick="event.stopPropagation();sv2AdvReset()">сброс</button></div>
    </div>
  </div>`;

  // Класс брони по зонам
  h += `<div class="sv4-armor-zones">
    <div class="sv4-az-l">КЛАСС БРОНИ</div>
    <div class="sv4-az-row sv4-az-row-6">
      <div class="sv4-az"><div>Голова</div><b>${apByZone['голова']}</b><span class="sv4-az-hit">01–09</span></div>
      <div class="sv4-az"><div>Тело</div><b>${apByZone['тело']}</b><span class="sv4-az-hit">45–79</span></div>
      <div class="sv4-az"><div>Пр. рука</div><b>${apByZone['праваярука']}</b><span class="sv4-az-hit">25–44</span></div>
      <div class="sv4-az"><div>Лев. рука</div><b>${apByZone['леваярука']}</b><span class="sv4-az-hit">10–24</span></div>
      <div class="sv4-az"><div>Пр. нога</div><b>${apByZone['праваянога']}</b><span class="sv4-az-hit">90–00</span></div>
      <div class="sv4-az"><div>Лев. нога</div><b>${apByZone['леваянога']}</b><span class="sv4-az-hit">80–89</span></div>
    </div>
  </div>`;

  // Оружие — основное в руке
  if((state.sheet.weapons||[]).length){
    h += `<div class="sv4-section-title"><span class="ic">${ICONS.sword}</span> Оружие в руке</div>`;
    h += `<div class="sv4-weapons">`;
    state.sheet.weapons.forEach((w, wi) => {
      const dmgFormula = w.damage || '—';
      const rs = Math.floor((totals['С']||0)/10);
      let dmgComputed = dmgFormula;
      if(typeof calcWeaponDamage === 'function' && dmgFormula.includes('РС')){
        dmgComputed = calcWeaponDamage(dmgFormula, rs);
      }
      h += `<div class="sv4-weapon">
        <div class="sv4-w-name">${escHtml(w.name||'—')}</div>
        <div class="sv4-w-stats">
          <span><b>Урон:</b> <span class="gold">${escHtml(dmgFormula)}</span>${dmgComputed!==dmgFormula?` = <span class="gold-big">${dmgComputed}</span>`:''}</span>
          ${w.range?`<span><b>Дист:</b> ${escHtml(w.range)}</span>`:''}
          ${w.qualities?`<span><b>Кач:</b> ${escHtml(w.qualities)}</span>`:''}
        </div>
        <button class="sv4-btn-mini btn-gold sv4-w-atk" data-atk="${wi}">Атаковать</button>
      </div>`;
    });
    h += `</div>`;
  }

  // Stats grid
  h += `<div class="sv4-section-title">${ICONS.dice} Характеристики</div>`;
  h += '<div class="sv4-stats">';
  STAT_NAMES.forEach(s => {
    const total = totals[s] || 0;
    const bonus = Math.floor(total/10);
    h += `<div class="sv4-stat rollable" onclick="rollCheck('${s}',${total})" title="Бросок проверки d100">
      <div class="sv4-stat-l">${s}</div>
      <div class="sv4-stat-v">${total}</div>
      <div class="sv4-stat-b">+${bonus} <span class="sv4-roll-hint"><span class="ic">${ICONS.dice}</span></span></div>
    </div>`;
  });
  h += '</div>';
  h += `<p class="sv4-roll-tip muted">Нажми на характеристику или навык, чтобы бросить проверку d100.</p>`;

  // Виталки: Судьба / Удача / Упорство / Решимость / Скверна
  h += `<div class="sv4-section-title">${ICONS.compass} Судьба и стойкость</div>`;
  h += `<div class="sv4-vitals">
    <div class="sv4-vit" onclick="sv4NavGo('fate')">
      <div class="sv4-v-l">Судьба</div>
      <div class="sv4-v-ico">${ICONS.compass}</div>
      <div class="sv4-v-v">${calc.fate}</div>
    </div>
    <div class="sv4-vit" onclick="sv4NavGo('fate')">
      <div class="sv4-v-l">Удача</div>
      <div class="sv4-v-ico">${ICONS.hand}</div>
      <div class="sv4-v-v">${state.sheet.currentLuck||0}<span class="max">/${calc.fate}</span></div>
    </div>
    <div class="sv4-vit" onclick="sv4NavGo('fate')">
      <div class="sv4-v-l">Упорство</div>
      <div class="sv4-v-ico">${ICONS.star}</div>
      <div class="sv4-v-v">${state.sheet.resolveCurrent||0}<span class="max">/${calc.upor}</span></div>
    </div>
    <div class="sv4-vit ${corr>=corrThr?'danger':''}" onclick="sv4NavGo('health')">
      <div class="sv4-v-l">Скверна</div>
      <div class="sv4-v-ico">${ICONS.skull}</div>
      <div class="sv4-v-v">${corr}<span class="max">/${corrThr}</span></div>
    </div>
  </div>`;

  // Опыт — просто «доступно» (работает как кошелёк) + быстрые кнопки
  const xpAv = (state.xpGained||0) - (state.sheet.spentXP||0);
  h += `<div class="sv4-section-title">${ICONS.xp} Опыт</div>`;
  h += `<div class="sv4-xp-card">
    <div class="sv4-xp-main">
      <div class="sv4-xp-big">${xpAv}<span class="sv4-xp-cap"> доступно</span></div>
    </div>
    <div class="sv4-xp-btns">
      <button class="sv4-btn-mini btn-gold" onclick="addXP(5)">+5</button>
      <button class="sv4-btn-mini btn-gold" onclick="addXP(10)">+10</button>
      <button class="sv4-btn-mini btn-gold" onclick="addXP(25)">+25</button>
      <button class="sv4-btn-mini btn-gold" onclick="addXP(50)">+50</button>
    </div>
    <!-- мастер может дать любое число, поэтому рядом свободный ввод -->
    <div class="sv4-xp-free">
      <input type="number" id="xp-free" class="sv4-mini" inputmode="numeric" step="1"
             placeholder="сколько" aria-label="Начислить опыт" onkeydown="if(event.key==='Enter')addXPFree()" />
      <button class="sv4-btn-mini btn-gold" onclick="addXPFree()">Начислить</button>
      <button class="sv4-btn-mini" onclick="addXPFree(-1)" title="Списать столько же">Списать</button>
    </div>
    <button class="sv4-btn-wide" style="margin-top:8px;" onclick="goStep(9)"><span class="ic">${ICONS.shop}</span> Потратить опыт →</button>
  </div>`;

  // Изученные навыки
  const profLearned = learned.filter(s => !s.isCommon);
  h += `<div class="sv4-section-title">${ICONS.target} Профессиональные навыки <small style="font-weight:normal;color:var(--text3);">(${profLearned.length})</small></div>`;
  if(!profLearned.length){
    h += `<p class="muted" style="text-align:center;padding:14px;">— нет профессиональных навыков —</p>`;
  } else {
    h += `<div class="sv4-skills">`;
    profLearned.forEach(sk => {
      h += `<div class="sv4-skill rollable" data-call="roll" data-v="${escAttr(sk.name)}" data-n="${sk.value}" title="Бросок проверки d100">
        <span class="sv4-sk-name">${escHtml(sk.name)}</span>
        <span class="sv4-sk-stat">${sk.stat}</span>
        <span class="sv4-sk-adv">+${sk.adv}</span>
        <span class="sv4-sk-total">${sk.value} <span class="sv4-roll-hint"><span class="ic">${ICONS.dice}</span></span></span>
      </div>`;
    });
    h += `</div>`;
  }
  h += `<button class="sv4-btn-wide" onclick="sv4NavGo('skills')">Все навыки (общие + проф.) →</button>`;

  return h;
}

// ============== ВКЛАДКА: НАРОД ==============
function renderTabRace(){
  const r = DATA.races[state.race];
  let h = '';
  if(r.desc) h += `<p class="sv4-lore">${escHtml(r.desc)}</p>`;
  h += `<div class="sv4-info-grid">
    <div class="sv4-info"><div class="sv4-i-l">Базовая Судьба</div><div class="sv4-i-v">${r.fate}</div></div>
    <div class="sv4-info"><div class="sv4-i-l">Базовое Упорство</div><div class="sv4-i-v">${r.resilience}</div></div>
    <div class="sv4-info"><div class="sv4-i-l">Доп. очки</div><div class="sv4-i-v">${r.extra}</div></div>
    <div class="sv4-info"><div class="sv4-i-l">Скорость</div><div class="sv4-i-v">${r.move}</div></div>
  </div>`;
  h += `<div class="sv4-info" style="margin-top:10px;">
    <div class="sv4-i-l">Формула здоровья</div>
    <div style="font-family:'Cinzel',serif;color:var(--gold2);font-size:14px;margin-top:4px;">${r.hp_formula}</div>
  </div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Народные навыки</div>
    <p class="muted" style="font-size:12px;margin-bottom:6px;">3 навыка по +5, 3 навыка по +3 (выбраны при создании).</p>
    <div class="sv4-chips">`;
  state.raceSkillsBig.forEach(s => h += `<span class="sv4-chip gold">+5 ${escHtml(s)}</span>`);
  state.raceSkillsSm.forEach(s => h += `<span class="sv4-chip">+3 ${escHtml(s)}</span>`);
  h += `</div>
    <details style="margin-top:10px;">
      <summary class="muted" style="cursor:pointer;font-size:11px;">Полный перечень доступных народных навыков</summary>
      <div class="sv4-chips" style="margin-top:6px;">${r.race_skills.map(s => `<span class="sv4-chip dim">${escHtml(s)}</span>`).join('')}</div>
    </details>
  </div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Народные таланты</div>
    <div class="sv4-chips">${r.race_talents.map(t => `<span class="sv4-chip">${escHtml(t)}</span>`).join('')}</div>
  </div>`;
  if(state.sheet.doomedProphecy){
    h += `<div class="sv4-block gold-bordered">
      <div class="sv4-block-title gold">⚜ Роковое пророчество</div>
      <p style="font-style:italic;color:var(--parch);line-height:1.6;">${escHtml(state.sheet.doomedProphecy)}</p>
    </div>`;
  }
  return h;
}

// ============== ВКЛАДКА: КАРЬЕРА ==============
function renderTabCareer(){
  const c = DATA.careers[state.career];
  const tier = c.tiers[(state.sheet.tier||1)-1];
  let h = `<div class="sv4-info-grid">
    <div class="sv4-info"><div class="sv4-i-l">Класс</div><div class="sv4-i-v" style="font-size:16px;">${escHtml(c.class)}</div></div>
    <div class="sv4-info"><div class="sv4-i-l">Народы</div><div style="font-size:12px;margin-top:4px;">${escHtml(c.peoples)}</div></div>
  </div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Текущая ступень</div>
    <select class="sv4-select" onchange="trySetTierFromSheet(this.value, ${state.sheet.tier})">
      ${c.tiers.map((t,i) => `<option value="${i+1}" ${(i+1)===state.sheet.tier?'selected':''}>${i+1}. ${escHtml(t.name)} (${escHtml(t.status)})</option>`).join('')}
    </select>
  </div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Карьерная лестница</div>`;
  c.tiers.forEach((t,i) => {
    const isActive = (i+1)===state.sheet.tier;
    h += `<div class="sv4-tier ${isActive?'active':''}">
      <div class="sv4-tier-head">
        <div class="sv4-tier-name">${i+1}. ${escHtml(t.name)} ${isActive?'<span class="sv4-tier-star">★</span>':''}</div>
        <div class="sv4-tier-status">${escHtml(t.status)}</div>
      </div>
      <div class="sv4-tier-row"><b>Навыки:</b> ${escHtml(t.skills||'—')}</div>
      <div class="sv4-tier-row"><b>Таланты:</b> ${escHtml(t.talents||'—')}</div>
      <div class="sv4-tier-row"><b>Имущество:</b> ${escHtml(t.trappings||'—')}</div>
    </div>`;
  });
  h += `</div>`;
  return h;
}

// ============== ВКЛАДКА: СТАТЫ ==============
function renderTabStats(){
  const calc = sheetCalc();
  const totals = calc.totals;
  let h = '<div class="sv4-stats">';
  STAT_NAMES.forEach(s => {
    const base = state.stats[s]||0;
    const bought = (state.sheet.statAdvBought&&state.sheet.statAdvBought[s])||0;
    const startAdv = (state.careerStatAdv&&state.careerStatAdv[s])||0;
    const ta = talentStatBonus(s);
    const total = totals[s]||0;
    const parts = [];
    if(base) parts.push(`база ${base}`);
    if(startAdv) parts.push(`старт +${startAdv}`);
    if(bought) parts.push(`развитие +${bought}`);
    if(ta) parts.push(`таланты +${ta}`);
    h += `<div class="sv4-stat" title="${escAttr(parts.join(', '))}">
      <div class="sv4-stat-l">${s}</div>
      <div class="sv4-stat-v">${total}</div>
      <div class="sv4-stat-b">+${Math.floor(total/10)}</div>
    </div>`;
  });
  h += '</div>';
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Подробная разбивка</div>
    <div class="sv4-table-wrap">
    <table class="sv4-tbl">
      <thead><tr><th></th>${STAT_NAMES.map(s=>`<th>${s}</th>`).join('')}</tr></thead>
      <tbody>
        <tr><td>Базовое</td>${STAT_NAMES.map(s=>`<td><input type="number" min="0" max="99" value="${state.stats[s]||''}" class="sv4-mini gold" onchange="state.stats['${s}']=Math.max(0,parseInt(this.value)||0);renderSheet();" /></td>`).join('')}</tr>
        <tr><td>Развитие (за опыт)</td>${STAT_NAMES.map(s=>`<td><input type="number" min="0" max="99" value="${(state.sheet.statAdvBought&&state.sheet.statAdvBought[s])||0}" class="sv4-mini gold" onchange="if(!state.sheet.statAdvBought)state.sheet.statAdvBought={};state.sheet.statAdvBought['${s}']=Math.max(0,parseInt(this.value)||0);renderSheet();" /></td>`).join('')}</tr>
        <tr><td>Таланты</td>${STAT_NAMES.map(s=>`<td class="num-gold">+${talentStatBonus(s)||0}</td>`).join('')}</tr>
        <tr><td><b>Итог</b></td>${STAT_NAMES.map(s=>`<td class="num-gold"><b>${totals[s]||0}</b></td>`).join('')}</tr>
      </tbody>
    </table>
    </div>
  </div>`;
  return h;
}

// ============== ВКЛАДКА: СУДЬБА ==============
function renderTabFate(){
  const r = DATA.races[state.race];
  const calc = sheetCalc();
  const resBase = (r.resilience||0) + (state.extraRes||0);
  let h = `<div class="sv4-vitals">
    <div class="sv4-vit">
      <div class="sv4-v-l">СУДЬБА</div>
      <div class="sv4-v-ico">${ICONS.compass}</div>
      <div class="sv4-v-v">${calc.fate}</div>
      <div class="sv4-v-sub">очков судьбы</div>
    </div>
    <div class="sv4-vit">
      <div class="sv4-v-l">УДАЧА</div>
      <div class="sv4-v-ico">${ICONS.hand}</div>
      <div class="sv4-v-v"><input type="number" min="0" value="${state.sheet.currentLuck||0}" class="sv4-inline" onchange="state.sheet.currentLuck=Math.max(0,parseInt(this.value)||0);autosave();" /><span class="max">/${calc.fate}</span></div>
      <button class="sv4-btn-mini" onclick="state.sheet.currentLuck=${calc.fate};renderSheet();">↑ Восполнить</button>
    </div>
    <div class="sv4-vit">
      <div class="sv4-v-l">СТОЙКОСТЬ</div>
      <div class="sv4-v-ico">${ICONS.skull}</div>
      <div class="sv4-v-v">${resBase}</div>
      <div class="sv4-v-sub">очков стойкости</div>
    </div>
    <div class="sv4-vit">
      <div class="sv4-v-l">УПОРСТВО</div>
      <div class="sv4-v-ico">${ICONS.star}</div>
      <div class="sv4-v-v"><input type="number" min="0" value="${state.sheet.resolveCurrent||0}" class="sv4-inline" onchange="state.sheet.resolveCurrent=Math.max(0,parseInt(this.value)||0);autosave();" /><span class="max">/${calc.upor}</span></div>
      <button class="sv4-btn-mini" onclick="state.sheet.resolveCurrent=${calc.upor};renderSheet();">↑ Восполнить</button>
    </div>
  </div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Мотивация</div>
    <input type="text" class="sv4-text" value="${escAttr(state.motivation||'')}" placeholder="То, что движет персонажем..." onchange="state.motivation=this.value;autosave();" />
  </div>`;
  return h;
}

// ============== ВКЛАДКА: ЗДОРОВЬЕ ==============
function renderTabHealth(){
  const el = document.getElementById('sv4-page');
  if(el) el.innerHTML = renderTabHealthInner();
}
function renderTabHealthInner(){
  const calc = sheetCalc();
  const maxHP = calc.maxHP;
  const corr = state.sheet.corruption||0;
  const corrThr = calc.corruptionThreshold;
  let h = `<div class="sv4-hp-card">
    <div class="sv4-hp-l">ОЧКИ ЗДОРОВЬЯ</div>
    <div class="sv4-hp-row">
      <div class="sv4-hp-ico">${ICONS.heart}</div>
      <div class="sv4-hp-numbers">
        <input type="number" id="hp-input" min="0" max="${maxHP}" value="${state.sheet.currentHP||0}" class="sv4-hp-input" onchange="state.sheet.currentHP=Math.max(0,Math.min(${maxHP},Math.max(0,parseInt(this.value)||0)));sv2HpDelta(0,${maxHP});" />
        <span class="sv4-hp-max">/${maxHP}</span>
      </div>
    </div>
    <div class="sv4-hp-bar"><div class="sv4-hp-bar-fill" data-hp-bar style="width:${maxHP>0?(state.sheet.currentHP/maxHP*100).toFixed(1):0}%;"></div></div>
    <div class="sv4-hp-actions">
      <button class="sv4-btn-dmg" onclick="sv2HpDelta(-5,${maxHP})">−5</button>
      <button class="sv4-btn-dmg" onclick="sv2HpDelta(-1,${maxHP})">−1</button>
      <button class="sv4-btn-heal" onclick="sv2HpDelta(1,${maxHP})">+1</button>
      <button class="sv4-btn-heal" onclick="sv2HpDelta(5,${maxHP})">+5</button>
      <button class="sv4-btn-heal full" onclick="sv2HpFull(${maxHP})">↑ Полное</button>
    </div>
    <div class="sv4-hp-formula muted">${state.race==='halfling'?`<span title="Талант «Небольшой»: полурослик не прибавляет бонус силы к ранам">🌿 Небольшой · (2 × РВ ${calc.RVb}) + РСВ ${calc.RSVb}</span>`:`РС ${calc.RSb} + (2 × РВ ${calc.RVb}) + РСВ ${calc.RSVb}`}${talentLevel('здоровяк')>0?` + Здоровяк ${calc.RVb*talentLevel('здоровяк')}`:''} = <b style="color:var(--gold2)">${maxHP}</b></div>
  </div>`;
  // 🧠 Психология (страх / ужас / бешенство)
  {
    const p = state.sheet.psych || {};
    h += `<details class="sv4-block sv4-fold"${(p.fearActive||p.frenzy)?' open':''}>
      <summary class="sv4-block-title">🧠 Психология${p.fearActive?' · страх активен':''}${p.frenzy?' · БЕШЕНСТВО':''}</summary>
      <p class="muted" style="font-size:11px;">Хладнокровие: <b>${psyCoolTarget()}</b>. Страх — длительная проверка (копи SL до ранга). Ужас — разовая: провал = [ранг + провальные SL] «Сломленный», затем страх. Бешенство: +1 БС, иммунитет к психологии, после — «Уставший».</p>
      <div class="sv4-row" style="gap:8px;flex-wrap:wrap;margin-top:8px;">
        ${p.fearActive
          ? `<button class="btn btn-sm btn-gold" onclick="psyFearRoll()">🎲 Страх: бросок (${p.fearSL||0} / ${p.fearRank})</button>
             <button class="btn btn-sm" onclick="state.sheet.psych.fearActive=false;autosave();renderTabHealth();">✕ Сбежал / источник исчез</button>`
          : `<button class="btn btn-sm" onclick="psyFearStart()">😱 Страх (ранг)…</button>`}
        <button class="btn btn-sm" onclick="psyTerror()">🌑 Ужас (ранг)…</button>
        <button class="btn btn-sm ${p.frenzy?'btn-gold':''}" onclick="psyFrenzy()">${p.frenzy?'🔥 БЕШЕНСТВО — закончить (+Уставший)':'🔥 Впасть в бешенство (СВ)'}</button>
      </div>
      ${p.fearActive?`<p style="font-size:11px;color:var(--blood2);margin-top:6px;">Подвержен страху: −1 SL на проверки против источника; приближение — серьёзная (+0) проверка хладнокровия, иначе «Сломленный».</p>`:''}
      ${p.frenzy?`<p style="font-size:11px;color:var(--gold2);margin-top:6px;">В бешенстве: +1 к бонусу силы, только сближение и атака, не отступает. Заканчивается при «Оглушённый»/«Бессознательный» или умиротворении врагов.</p>`:''}
    </details>`;
  }

  // 🦠 Болезни и инфекции (структурно)
  {
    const ds = state.sheet.diseases || [];
    h += `<details class="sv4-block sv4-fold"${ds.length?' open':''}>
      <summary class="sv4-block-title">🦠 Болезни и инфекции${ds.length?` · ${ds.length}`:''}</summary>
      <div class="sv4-row" style="gap:8px;flex-wrap:wrap;align-items:center;">
        <select id="disease-pick" class="sv4-text" style="max-width:200px;">${Object.keys(DISEASES).map(n=>`<option>${n}</option>`).join('')}</select>
        <button class="btn btn-sm btn-gold" onclick="diseaseAdd(document.getElementById('disease-pick').value)">+ Заразить</button>
        <button class="btn btn-sm" onclick="sv2InfectionCheck()" title="Очень лёгкая (+60) проверка В после боя с критом">🎲 Проверка малой инфекции</button>
      </div>`;
    if(!ds.length){
      h += `<p class="muted" style="font-size:12px;margin-top:8px;">Пока здоров — Нургл ждёт.</p>`;
    } else {
      ds.forEach((d,i)=>{
        const dd = DISEASES[d.name]||{};
        h += `<div class="sv4-disease ${d.phase==='излечена'?'cured':''}">
          <div class="sv4-disease-head"><b>${escHtml(d.name)}</b>
            <span class="sv4-disease-phase">${escHtml(d.phase)}</span>
            <button class="btn btn-sm" onclick="diseasePhase(${i})" title="инкубация → болезнь → излечена">→</button>
            <button class="btn btn-sm" onclick="diseaseDel(${i})">×</button></div>
          <div class="muted" style="font-size:11px;">инкубация ${escHtml(d.inc)} · длительность ${escHtml(d.dur)}${dd.note?` · ${escHtml(dd.note)}`:''}</div>
          <div style="font-size:12px;margin:3px 0;">Симптомы: ${escHtml(d.sym)}</div>
          <div class="sv4-row" style="gap:6px;align-items:center;">
            <span class="muted" style="font-size:11px;">день:</span>
            <button class="btn btn-sm" onclick="diseaseDay(${i},-1)">−</button><b>${d.day||0}</b><button class="btn btn-sm" onclick="diseaseDay(${i},1)">+</button>
          </div>
        </div>`;
      });
    }
    h += `</details>`;
  }

  // 🛌 Восстановление (гл. V «Исцеление»)
  h += `<details class="sv4-block sv4-fold"${((parseInt(state.sheet.currentHP)||0) < (calc.maxHP||1))?' open':''}>
    <summary class="sv4-block-title">🛌 Восстановление</summary>
    <p class="muted" style="font-size:11px;">По книге: после сна — проверка выносливости (+20), лечит [SL + БВ] ран, раз в день. День полного отдыха — ещё +БВ. Целебное зелье — +БВ ран мгновенно, 1 раз за сцену, только при ранах &gt; 0.</p>
    <div class="sv4-row" style="gap:8px;flex-wrap:wrap;margin-top:8px;">
      <button class="btn btn-sm btn-gold" onclick="sv2RestSleep()">🌙 Сон (проверка В +20)</button>
      <button class="btn btn-sm" onclick="sv2RestDay()">☀ День отдыха (+БВ)</button>
      <button class="btn btn-sm ${state.sheet.potionUsedScene?'':'btn-gold'}" onclick="sv2DrinkPotion()">🧪 Целебное зелье${state.sheet.potionUsedScene?' <span class="muted">(уже в этой сцене)</span>':''}</button>
      ${state.sheet.potionUsedScene?`<button class="btn btn-sm" onclick="state.sheet.potionUsedScene=false;autosave();renderTabHealth();" title="Началась новая сцена">⟳ Новая сцена</button>`:''}
    </div>
    <div id="rest-verdict"></div>
  </details>`;

  // ☠ Проверка смерти (гл. V «Травмы»)
  const tbNow = calc.RVb;
  const critN = (state.sheet.critWounds!=null) ? state.sheet.critWounds : (state.sheet.injuries||[]).length;
  h += `<details class="sv4-block sv4-fold" id="death-check-block"${((parseInt(state.sheet.currentHP)||0)<=0)?' open':''}>
    <summary class="sv4-block-title">☠ Проверка смерти</summary>
    <p class="muted" style="font-size:11px;">При <b>0 ран</b> и «Бессознательном»: если критических ран <b>больше бонуса выносливости (${tbNow})</b> — смерть в конце раунда, если не исцелить критическую рану. Спасение — навсегда потратить очко Судьбы.</p>
    <div class="sv4-row" style="gap:10px;align-items:center;flex-wrap:wrap;">
      <label style="font-size:12px;">критических ран: <input type="number" min="0" class="sv4-mini gold" style="width:54px;" value="${critN}" onchange="state.sheet.critWounds=Math.max(0,parseInt(this.value)||0);autosave();" /></label>
      <button class="btn btn-sm" onclick="sv2DeathCheck()">⚖ Проверить</button>
    </div>
    <div id="death-verdict"></div>
  </details>`;
  // Преимущество (боевой счётчик)
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Преимущество</div>
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <button class="sv4-cond-btn" style="font-size:20px;" onclick="sv2AdvDelta(-1)">−</button>
      <b id="sv4-adv-val" data-adv-val style="font-family:'Cinzel',serif;font-size:30px;color:var(--gold2);min-width:32px;text-align:center;">${state.sheet.advantage||0}</b>
      <button class="sv4-cond-btn" style="font-size:20px;" onclick="sv2AdvDelta(1)">+</button>
      <button class="sv4-btn-mini" style="margin-left:auto;" onclick="sv2AdvReset()" title="Сбросить (конец боя, провал и т.п.)">Сброс</button>
    </div>
    <p class="muted" style="font-size:11px;margin-top:6px;">+1 за каждый успех в бою. Даёт <b>+10 за пункт</b> к броскам ближнего/дальнего боя. Сбрасывается в 0 при провале атаки, потере цели или окончании боя.</p>
  </div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Состояния (бой)</div>
    <div class="sv4-cond-grid">`;
  WFRP_CONDITIONS.forEach(cn => {
    const v = state.sheet.conditions[cn]||0;
    h += `<div class="sv4-cond ${v>0?'active':''}" data-cond="${cn}">
      <span class="sv4-cond-name">${cn} <span class="sv4-cond-help" role="button" title="что делает состояние" onclick="event.stopPropagation();toggleCondInfo('${cn}')">?</span></span>
      <div class="sv4-cond-c">
        <button class="sv4-cond-btn" onclick="sv2CondDelta('${cn}',-1)">−</button>
        <span class="sv4-cond-val">${v}</span>
        <button class="sv4-cond-btn" onclick="sv2CondDelta('${cn}',1)">+</button>
      </div>
    </div>`;
  });
  h += `</div>`;
  // одиночная подсказка по выбранному состоянию (раскрывается по «?»)
  h += `<div id="cond-info-box" style="display:none;margin-top:8px;padding:10px 12px;border:1px solid var(--gold);border-radius:6px;background:rgba(0,0,0,0.25);"></div>`;
  // полная легенда для новичков
  h += `<details style="margin-top:8px;"><summary class="muted" style="cursor:pointer;font-size:12px;"><span class="ic">${ICONS.book}</span> Что означают состояния? (для новичков)</summary>
    <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">` +
    WFRP_CONDITIONS.map(cn => {
      const info = CONDITION_INFO[cn] || {};
      return `<div style="border-bottom:1px solid var(--border);padding-bottom:6px;">
        <div style="color:var(--gold2);font-weight:600;font-size:13px;">${cn}${info.stack===false?' <span class="muted" style="font-weight:400;font-size:11px;">(не накапливается)</span>':''}</div>
        <div style="font-size:12px;margin-top:2px;">${escHtml(info.what||'')}</div>
        <div style="font-size:11px;margin-top:2px;color:var(--parch2);"><b>Снятие:</b> ${escHtml(info.clear||'')}</div>
      </div>`;
    }).join('') +
    `</div></details>`;
  h += `</div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Увечия</div>`;
  state.sheet.injuries.forEach((inj,i) => {
    h += `<div class="sv4-row">
      <input class="sv4-text" value="${escAttr(inj)}" onchange="state.sheet.injuries[${i}]=this.value;autosave();" />
      <button class="sv4-cond-btn" onclick="sv2RemInjury(${i})">×</button>
    </div>`;
  });
  h += `<div class="sv4-row">
    <input id="inj-input" class="sv4-text" placeholder="новое увечие (Enter)" onkeydown="if(event.key==='Enter'){sv2AddInjury();}" />
    <button class="sv4-btn-mini" onclick="sv2AddInjury()">+</button>
  </div></div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Болезни</div>`;
  state.sheet.diseases.forEach((d,i) => {
    h += `<div class="sv4-row">
      <input class="sv4-text" value="${escAttr(d)}" onchange="state.sheet.diseases[${i}]=this.value;autosave();" />
      <button class="sv4-cond-btn" onclick="sv2RemDisease(${i})">×</button>
    </div>`;
  });
  h += `<div class="sv4-row">
    <input id="dis-input" class="sv4-text" placeholder="болезнь / симптомы / длительность (Enter)" onkeydown="if(event.key==='Enter'){sv2AddDisease();}" />
    <button class="sv4-btn-mini" onclick="sv2AddDisease()">+</button>
  </div></div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Скверна и мутации</div>
    <div class="sv4-row" style="align-items:center;">
      <span>Пункты скверны:</span>
      <input type="number" min="0" value="${corr}" class="sv4-mini ${corr>=corrThr?'danger':'gold'}" style="width:60px;" onchange="state.sheet.corruption=Math.max(0,parseInt(this.value)||0);autosave();renderTabHealth();" />
      <span class="muted">/ порог</span>
      <b style="color:var(--gold2);">${corrThr}</b>
    </div>
    ${corr>=corrThr && corrThr>0 ? `<div class="sv4-row" style="margin-top:6px;align-items:center;flex-wrap:wrap;gap:6px;">
      <span class="danger" style="font-size:12px;"><span class="ic">${ICONS.warn}</span> Скверна достигла порога — испытание скверны (мутация):</span>
      <button class="btn btn-sm btn-gold" onclick="rollMutation('phys')"><span class="ic">${ICONS.dice}</span> Физическая</button>
      <button class="btn btn-sm btn-gold" onclick="rollMutation('ment')"><span class="ic">${ICONS.dice}</span> Ментальная</button>
      <span class="muted" style="font-size:11px;">бросок вычитает порог (${corrThr}) из скверны</span>
    </div>` : `<p class="muted" style="font-size:11px;margin-top:4px;">При скверне ≥ порога делается испытание скверны: проверка стойкости, провал = мутация и сброс скверны.</p>`}
    <textarea class="sv4-text" rows="3" placeholder="Мутации, проявления Хаоса..." onchange="state.sheet.mutations=this.value;autosave();">${escHtml(state.sheet.mutations||'')}</textarea>
  </div>`;
  return h;
}

// ============== ВКЛАДКА: НАВЫКИ ==============
function renderTabSkills(){
  const skills = compileSkills();
  const common = skills.filter(s => s.isCommon);
  const prof = skills.filter(s => !s.isCommon && (s.adv>0 || (s.sources && s.sources.length)));
  const srcLabel = (sk) => sk.sources.includes('народ')||sk.sources.includes('народ-перечень') ? 'Народ'
                : sk.sources.includes('карьера') ? 'Карьера'
                : sk.sources.includes('ручн.') ? 'Ручн.'
                : sk.sources.includes('лист') ? 'Лист'
                : sk.sources.includes('XP-магазин') ? 'Магазин'
                : '—';
  let h = '';
  h += `<input class="sv4-text" style="width:100%;margin-bottom:8px;" placeholder="⌕ Фильтр навыков — начни вводить…" oninput="skillFilterApply(this.value)">`;
  // Общие навыки — всегда все 25
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Общие навыки <span style="color:var(--text3);font-weight:normal;font-family:'EB Garamond',serif;text-transform:none;letter-spacing:0;">(есть у всех)</span></div>
    <div class="sv4-table-wrap">
    <table class="sv4-tbl">
      <thead><tr><th>Навык</th><th>Хар.</th><th>Шаги</th><th>Итог</th><th>Источник</th></tr></thead>
      <tbody>`;
  common.forEach(sk => {
    h += `<tr>
      <td>${escHtml(sk.name)}</td>
      <td><span class="muted">${sk.stat}</span></td>
      <td><span class="sv4-stepper"><button class="stp" onclick="stpAdj(this,-1)" tabindex="-1">−</button><input type="number" min="0" value="${sk.adv||0}" class="sv4-mini gold" data-sk="${escAttr(sk.name)}" onchange="updateSkillAdv(this)" /><button class="stp gold" onclick="stpAdj(this,1)" tabindex="-1">+</button></span></td>
      <td class="num-gold"><span class="sv4-roll-cell" data-call="roll" data-v="${escAttr(sk.name)}" data-n="${sk.value}" title="Бросок d100">${sk.value} <span class="ic">${ICONS.dice}</span></span></td>
      <td><span class="muted">${sk.sources.length?srcLabel(sk):'—'}</span></td>
    </tr>`;
  });
  h += `</tbody></table></div></div>`;

  // Профессиональные навыки — только освоенные / доступные
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Профессиональные навыки <span style="color:var(--text3);font-weight:normal;font-family:'EB Garamond',serif;text-transform:none;letter-spacing:0;">(нужно обучение)</span></div>
    <div class="sv4-table-wrap">
    <table class="sv4-tbl">
      <thead><tr><th>Навык</th><th>Хар.</th><th>Шаги</th><th>Итог</th><th>Источник</th><th></th></tr></thead>
      <tbody>`;
  if(!prof.length){
    h += `<tr><td colspan="6" class="muted" style="text-align:center;padding:14px;">— нет профессиональных навыков —</td></tr>`;
  } else {
    prof.forEach(sk => {
      const isExtra = sk.sources.includes('ручн.');
      h += `<tr>
        <td>${escHtml(sk.name)}</td>
        <td><span class="muted">${sk.stat}</span></td>
        <td><span class="sv4-stepper"><button class="stp" onclick="stpAdj(this,-1)" tabindex="-1">−</button><input type="number" min="0" value="${sk.adv||0}" class="sv4-mini gold" data-sk="${escAttr(sk.name)}" onchange="updateSkillAdv(this)" /><button class="stp gold" onclick="stpAdj(this,1)" tabindex="-1">+</button></span></td>
        <td class="num-gold"><span class="sv4-roll-cell" data-call="roll" data-v="${escAttr(sk.name)}" data-n="${sk.value}" title="Бросок d100">${sk.value} <span class="ic">${ICONS.dice}</span></span></td>
        <td><span class="muted">${srcLabel(sk)}</span></td>
        <td>${isExtra?`<button class="sv4-cond-btn" data-call="skill-remove" data-v="${escAttr(sk.name)}">×</button>`:''}</td>
      </tr>`;
    });
  }
  h += `</tbody></table></div>
    <div class="sv4-row" style="margin-top:10px;">
      <input type="text" id="new-skill-name" list="prof-skills-list" class="sv4-text" placeholder="новый проф. навык (напр. язык (бретонский))" />
      <input type="number" id="new-skill-adv" value="1" min="1" class="sv4-mini gold" style="width:50px;" />
      <button class="sv4-btn-mini" onclick="addExtraSkill()">+ Добавить</button>
    </div>
    <datalist id="prof-skills-list">${DATA.prof_skills.map(p=>`<option value="${escAttr(p.name)}">`).join('')}</datalist>
  </div>`;
  return h;
}

// ============== ВКЛАДКА: ТАЛАНТЫ (полное описание) ==============
function renderTabTalents(){
  const talents = compileTalents();
  const search = state.sheet._talSearch || '';
  const filter = state.sheet._talFilter || 'all';
  let filtered = talents.slice();
  if(search){
    const q = search.toLowerCase();
    filtered = filtered.filter(t => t.name.toLowerCase().includes(q) || (t.hint||'').toLowerCase().includes(q));
  }
  if(filter !== 'all') filtered = filtered.filter(t => t.src === filter);

  let h = `<div class="sv4-search-bar">
    <div class="sv4-search">
      <span class="sv4-search-ico"><span class="ic">${ICONS.search}</span></span>
      <input type="text" placeholder="Поиск таланта..." value="${escAttr(search)}" onchange="state.sheet._talSearch=this.value;renderSheet();" />
    </div>
    <select class="sv4-select" onchange="state.sheet._talFilter=this.value;renderSheet();">
      <option value="all" ${filter==='all'?'selected':''}>Все источники</option>
      <option value="народ" ${filter==='народ'?'selected':''}>Народ</option>
      <option value="карьера" ${filter==='карьера'?'selected':''}>Карьера</option>
      <option value="родной" ${filter==='родной'?'selected':''}>Родной</option>
      <option value="ручн." ${filter==='ручн.'?'selected':''}>Ручные</option>
    </select>
  </div>`;
  h += `<div class="sv4-talents-list">`;
  if(!filtered.length){
    h += `<p class="muted" style="text-align:center;padding:14px;">— ничего не найдено —</p>`;
  } else {
    filtered.forEach(t => {
      const isExtra = (t.src === 'ручн.');
      const badge = talentBadgeFor(t.name, t.level);
      const isProphecy = t.name && t.name.includes('Роковое');
      let bodyHtml;
      if(isProphecy){
        const proph = (state.sheet.doomedProphecy || '').trim();
        if(proph){
          bodyHtml = `<p style="font-style:italic;color:var(--blood2);line-height:1.6;border-left:2px solid var(--blood);padding-left:10px;margin:2px 0;">«${escHtml(proph)}»</p>
            <p class="muted" style="font-size:11px;margin-top:4px;">Роковое предсказание твоего персонажа. <a href="#" onclick="sv4NavGo('notes');return false;" style="color:var(--gold2);">изменить →</a></p>`;
        } else {
          bodyHtml = `<p class="muted">Пророчество ещё не задано. <a href="#" onclick="sv4NavGo('notes');return false;" style="color:var(--gold2);">вписать на шаге «Штрихи» →</a></p>`;
        }
      } else {
        bodyHtml = `${t.hint ? `<p>${escHtml(t.hint)}</p>` : '<p class="muted">— описание не подгружено.</p>'}
          ${t.checks ? `<p><b>Проверки:</b> ${escHtml(t.checks)}</p>` : ''}
          ${t.max ? `<p><b>Макс. уровень:</b> ${escHtml(String(t.max))}</p>` : ''}`;
      }
      h += `<div class="sv4-tal-full">
        <div class="sv4-tal-head">
          <div class="sv4-tal-name">${escHtml(t.name)}</div>
          <div class="sv4-tal-meta">
            ${badge?`<span class="sv4-tal-badge">${escHtml(badge)}</span>`:''}
            <span class="sv4-tal-lvl">ур. ${t.level}</span>
            <span class="sv4-tal-src">${t.src}</span>
          </div>
        </div>
        <div class="sv4-tal-body">
          ${bodyHtml}
          ${isExtra ? `<p style="margin-top:6px;"><button class="sv4-btn-mini btn-red" data-call="talent-remove" data-v="${escAttr(t.name)}">× Убрать</button></p>` : ''}
        </div>
      </div>`;
    });
  }
  h += `</div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Добавить талант</div>
    <div class="sv4-row">
      <input type="text" id="new-talent-name" list="talents-list" class="sv4-text" placeholder="название таланта..." />
      <input type="number" id="new-talent-lvl" value="1" min="1" class="sv4-mini gold" style="width:50px;" />
      <button class="sv4-btn-mini" onclick="addExtraTalent()">+ Добавить</button>
    </div>
    <datalist id="talents-list">${(DATA.all_talents||[]).map(t=>`<option value="${escAttr(t.name)}">`).join('')}</datalist>
  </div>`;
  return h;
}

// ============== ВКЛАДКА: ИМУЩЕСТВО ==============
function renderTabGear(){
  const m = state.sheet.money;
  let h = `<div class="sv4-block">
    <div class="sv4-block-title">Кошелёк</div>
    <div class="sv4-money-row">
      <div class="sv4-money-cell gold">
        <div class="sv4-m-l">КРОНЫ</div>
        <input type="number" id="money-gc" min="0" value="${m.gc||0}" class="sv4-m-input" onchange="sv2MoneySet('gc',this.value)" />
        <div class="sv4-m-actions">
          <button class="sv4-cond-btn" onclick="sv2MoneyDelta('gc',-1)">−</button>
          <button class="sv4-cond-btn" onclick="sv2MoneyDelta('gc',1)">+</button>
          <button class="sv4-cond-btn" title="1 КР → 20 ШИЛ" onclick="sv2MoneyExchange('gc','down')">↓</button>
        </div>
      </div>
      <div class="sv4-money-cell">
        <div class="sv4-m-l">ШИЛЛИНГИ</div>
        <input type="number" id="money-ss" min="0" value="${m.ss||0}" class="sv4-m-input" onchange="sv2MoneySet('ss',this.value)" />
        <div class="sv4-m-actions">
          <button class="sv4-cond-btn" onclick="sv2MoneyDelta('ss',-1)">−</button>
          <button class="sv4-cond-btn" onclick="sv2MoneyDelta('ss',1)">+</button>
          <button class="sv4-cond-btn" title="20 ШИЛ → 1 КР" onclick="sv2MoneyExchange('ss','up')">↑</button>
          <button class="sv4-cond-btn" title="1 ШИЛ → 12 БП" onclick="sv2MoneyExchange('ss','down')">↓</button>
        </div>
      </div>
      <div class="sv4-money-cell">
        <div class="sv4-m-l">ПЕННИ</div>
        <input type="number" id="money-bp" min="0" value="${m.bp||0}" class="sv4-m-input" onchange="sv2MoneySet('bp',this.value)" />
        <div class="sv4-m-actions">
          <button class="sv4-cond-btn" onclick="sv2MoneyDelta('bp',-1)">−</button>
          <button class="sv4-cond-btn" onclick="sv2MoneyDelta('bp',1)">+</button>
          <button class="sv4-cond-btn" title="12 БП → 1 ШИЛ" onclick="sv2MoneyExchange('bp','up')">↑</button>
        </div>
      </div>
    </div>
    <div style="margin-top:8px;font-size:11px;color:var(--text3);text-align:right;">Всего: <b style="color:var(--gold2);" id="money-total">${moneyToBP(m)}</b> бп · 1 КР = 20 шил. = 240 бп</div>
    <div class="sv4-row" style="margin-top:10px;">
      <input type="number" id="pay-amount" min="0" placeholder="сколько" class="sv4-mini" style="width:80px;" />
      <select id="pay-currency" class="sv4-select" style="width:80px;flex:0 0 auto;">
        <option value="bp">бп</option><option value="ss">шил.</option><option value="gc">КР</option>
      </select>
      <button class="sv4-btn-mini btn-red" onclick="quickPayUI(-1)">− Купить</button>
      <button class="sv4-btn-mini btn-gold" onclick="quickPayUI(1)">+ Получить</button>
    </div>
  </div>`;
  // Оружие
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Оружие</div>`;
  if(!state.sheet.weapons.length){
    h += `<p class="muted" style="font-size:12px;">— арсенал пуст · Империя не вооружает безоружных —</p>`;
  } else {
    const calcG = sheetCalc();
    const rsBonus = Math.floor((calcG.totals['С']||0)/10);
    h += `<div class="sv4-table-wrap"><table class="sv4-tbl">
      <thead><tr><th>Название</th><th>Группа</th><th>Дист.</th><th>Урон</th><th>Итог</th><th>Кач-ва</th><th>Вес</th><th></th></tr></thead><tbody>`;
    state.sheet.weapons.forEach((w,i) => {
      const dmgComputed = (typeof calcWeaponDamage==='function') ? calcWeaponDamage(w.damage||'', rsBonus) : null;
      h += `<tr>
        <td><input class="sv4-mini" style="width:100px;" value="${escAttr(w.name||'')}" onchange="state.sheet.weapons[${i}].name=this.value;autosave();" /></td>
        <td><input class="sv4-mini" style="width:80px;" value="${escAttr(w.group||'')}" onchange="state.sheet.weapons[${i}].group=this.value;autosave();" /></td>
        <td><input class="sv4-mini" style="width:60px;" value="${escAttr(w.range||'')}" onchange="state.sheet.weapons[${i}].range=this.value;autosave();" /></td>
        <td><input class="sv4-mini gold" style="width:70px;" value="${escAttr(w.damage||'')}" onchange="state.sheet.weapons[${i}].damage=this.value;renderSheet();" /></td>
        <td class="num-gold">${dmgComputed!=null?dmgComputed:'—'}</td>
        <td><div style="display:flex;align-items:center;gap:2px;"><input class="sv4-mini" style="width:90px;" value="${escAttr(w.qualities||'')}" onchange="state.sheet.weapons[${i}].qualities=this.value;autosave();" />${(w.qualities||'').trim()?`<span class="sv4-cond-help" role="button" title="что означают качества" onclick="toggleQualInfo(${i})">?</span>`:''}</div></td>
        <td><input type="number" class="sv4-mini" style="width:40px;" value="${w.enc||0}" onchange="state.sheet.weapons[${i}].enc=Math.max(0,parseInt(this.value)||0);autosave();" /></td>
        <td><button class="sv4-cond-btn" onclick="state.sheet.weapons.splice(${i},1);renderSheet();">×</button></td>
      </tr>`;
      // Дальнобойное оружие → ряд счётчика боеприпасов
      const grp = (w.group||'').toLowerCase();
      const qual = (w.qualities||'').toLowerCase();
      const isRanged = /арбалет|лук|пращ|метатель|порохов|инженерн|ловчее/.test(grp)
        || /перезарядка|порохов|многозарядн/.test(qual);
      if(isRanged){
        const ammo = w.ammo||0;
        h += `<tr class="sv4-ammo-row"><td colspan="8" style="padding:4px 8px;background:rgba(0,0,0,0.15);">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="muted" style="font-size:11px;">↳ боеприпасы:</span>
            <button class="sv4-cond-btn" onclick="sv2AmmoDelta(${i},-1)">−</button>
            <b class="gold" style="min-width:28px;text-align:center;" id="sv4-ammo-${i}">${ammo}</b>
            <button class="sv4-cond-btn" onclick="sv2AmmoDelta(${i},1)">+</button>
            <button class="sv4-btn-mini" onclick="sv2AmmoSet(${i},10)" title="зарядить до 10">+10</button>
          </div>
        </td></tr>`;
      }
    });
    h += `</tbody></table></div>
    <div id="qual-info-box" style="display:none;margin-top:8px;padding:10px 12px;border:1px solid var(--gold);border-radius:6px;background:rgba(0,0,0,0.25);"></div>
    <p class="muted" style="font-size:10px;margin-top:4px;">Урон: формула из книги. Итог = формула с подставленным рейтингом силы (РС ${rsBonus}). «+РС+4» = ${rsBonus+4}. Тапни «?» у качеств, чтобы увидеть, что они делают.</p>`;
  }
  h += `<div class="sv4-row" style="margin-top:8px;">
    <input id="new-weapon-name" list="weapons-list" class="sv4-text" placeholder="название оружия (Enter)..." onkeydown="if(event.key==='Enter')sv2AddWeapon();" />
    <button class="sv4-btn-mini" onclick="sv2AddWeapon()">+ Добавить</button>
  </div>
  <datalist id="weapons-list">${(typeof WEAPONS_CATALOG!=='undefined' ? WEAPONS_CATALOG.map(w=>`<option value="${escAttr(w.name)}">`).join('') : '')}</datalist>
  </div>`;
  // Броня
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Броня</div>`;
  if(!state.sheet.armor.length){
    h += `<p class="muted" style="font-size:12px;">— брони нет · да хранит тебя Сигмар —</p>`;
  } else {
    state.sheet.armor.forEach((a,i) => {
      const z = (a.zones||'').toLowerCase();
      const has = (key) => {
        if(key==='голова') return z.includes('голов');
        if(key==='тело') return z.includes('тел')||z.includes('торс')||z.includes('груд');
        if(key==='праваярука') return (z.includes('прав')&&z.includes('рук')) || (z.includes('рук')&&!z.includes('лев')&&!z.includes('прав'));
        if(key==='леваярука') return (z.includes('лев')&&z.includes('рук')) || (z.includes('рук')&&!z.includes('лев')&&!z.includes('прав'));
        if(key==='праваянога') return (z.includes('прав')&&z.includes('ног')) || (z.includes('ног')&&!z.includes('лев')&&!z.includes('прав'));
        if(key==='леваянога') return (z.includes('лев')&&z.includes('ног')) || (z.includes('ног')&&!z.includes('лев')&&!z.includes('прав'));
        return false;
      };
      const zoneChk = (key, label) =>
        `<label class="sv4-zone-chk ${has(key)?'on':''}"><input type="checkbox" ${has(key)?'checked':''} onchange="sv2ArmorZoneToggle(${i},'${key}',this.checked)" />${label}</label>`;
      h += `<div class="sv4-armor-item">
        <div class="sv4-row" style="margin-bottom:6px;">
          <input class="sv4-text" value="${escAttr(a.name||'')}" placeholder="название брони" onchange="state.sheet.armor[${i}].name=this.value;autosave();" />
          <span class="muted" style="font-size:11px;">КБ</span>
          <input type="number" class="sv4-mini gold" style="width:44px;" value="${a.ap||0}" title="класс брони" onchange="state.sheet.armor[${i}].ap=Math.max(0,parseInt(this.value)||0);autosave();" />
          <span class="muted" style="font-size:11px;">вес</span>
          <input type="number" class="sv4-mini" style="width:44px;" value="${a.enc||0}" title="вес" onchange="state.sheet.armor[${i}].enc=Math.max(0,parseInt(this.value)||0);autosave();" />
          <button class="sv4-cond-btn" onclick="state.sheet.armor.splice(${i},1);renderSheet();">×</button>
        </div>
        <div class="sv4-zone-row">
          <span class="sv4-zone-label">Защищает:</span>
          ${zoneChk('голова','Голова')}
          ${zoneChk('тело','Тело')}
          ${zoneChk('праваярука','Пр.рука')}
          ${zoneChk('леваярука','Лев.рука')}
          ${zoneChk('праваянога','Пр.нога')}
          ${zoneChk('леваянога','Лев.нога')}
        </div>
        <input class="sv4-text" style="margin-top:6px;font-size:12px;" value="${escAttr(a.qualities||'')}" placeholder="качества (гибкая, неполная...)" onchange="state.sheet.armor[${i}].qualities=this.value;autosave();" />
      </div>`;
    });
  }
  h += `<div class="sv4-row" style="margin-top:8px;">
    <input id="new-armor-name" list="armor-list" class="sv4-text" placeholder="название брони (Enter)..." onkeydown="if(event.key==='Enter')sv2AddArmor();" />
    <button class="sv4-btn-mini" onclick="sv2AddArmor()">+ Добавить</button>
  </div>
  <datalist id="armor-list">${(typeof ARMOR_CATALOG!=='undefined' ? ARMOR_CATALOG.map(a=>`<option value="${escAttr(a.name)}">`).join('') : '')}</datalist>
  </div>`;
  // Прочее
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Прочее имущество</div>`;
  state.sheet.trappings.forEach((t,i) => {
    h += `<div class="sv4-trap-item">
      <div class="sv4-row" style="margin-bottom:4px;">
        <input class="sv4-text" value="${escAttr(t.name||'')}" placeholder="название" onchange="state.sheet.trappings[${i}].name=this.value;autosave();" />
        <span class="muted" style="font-size:11px;">вес</span>
        <input type="number" class="sv4-mini" style="width:44px;" value="${t.enc||0}" title="вес" onchange="state.sheet.trappings[${i}].enc=Math.max(0,parseInt(this.value)||0);autosave();" />
        <button class="sv4-cond-btn" onclick="state.sheet.trappings.splice(${i},1);renderSheet();">×</button>
      </div>
      <textarea class="sv4-text" rows="1" style="font-size:12px;" placeholder="описание предмета (необязательно)" onchange="state.sheet.trappings[${i}].desc=this.value;autosave();">${escHtml(t.desc||'')}</textarea>
    </div>`;
  });
  h += `<div class="sv4-row" style="margin-top:6px;">
    <input id="new-trap-name" class="sv4-text" placeholder="новый предмет (Enter)..." onkeydown="if(event.key==='Enter')sv2AddTrapping();" />
    <input type="number" id="new-trap-enc" value="0" class="sv4-mini" style="width:50px;" title="вес" />
    <button class="sv4-btn-mini" onclick="sv2AddTrapping()">+ Добавить</button>
  </div>`;
  const starterDone = !!state.sheet.starterImported;
  const atTier1 = (state.sheet.tier||1) === 1;
  if(atTier1 && !starterDone){
    h += `<button class="sv4-btn-wide" style="margin-top:10px;" onclick="sv2AddStarterGear()"><span class="ic">${ICONS.pack}</span> Выдать стартовое имущество (класс + 1-я ступень)</button>`;
  } else if(starterDone){
    h += `<button class="sv4-btn-wide" style="margin-top:10px;opacity:.5;cursor:default;" disabled title="По правилам имущество выдаётся один раз при создании.">✓ Стартовое имущество уже выдано</button>`;
  } else {
    h += `<button class="sv4-btn-wide" style="margin-top:10px;opacity:.5;cursor:default;" disabled title="Стартовое имущество положено только на 1-й ступени."><span class="ic">${ICONS.pack}</span> Стартовое имущество — только на 1-й ступени</button>`;
  }
  h += `</div>`;
  // ===== ОБЩИЙ ВЕС / ПЕРЕГРУЗ =====
  {
    const calcW = sheetCalc();
    let carried = 0;
    (state.sheet.weapons||[]).forEach(w => carried += (parseInt(w.enc)||0));
    (state.sheet.armor||[]).forEach(a => carried += (parseInt(a.enc)||0));
    (state.sheet.trappings||[]).forEach(t => carried += (parseInt(t.enc)||0));
    const eMax = calcW.encMax||0;
    const baseMove = calcW.move||0;
    const over = carried - eMax;
    const pct = eMax>0 ? Math.min(100, Math.round(carried/eMax*100)) : (carried>0?100:0);
    let barColor = 'var(--green,#3a8a55)';
    if(over > 0) barColor = 'var(--red,#c0392b)';
    else if(eMax>0 && carried >= eMax*0.8) barColor = 'var(--gold2)';
    let statusLine;
    if(over <= 0){
      statusLine = `<span style="color:var(--text3);">запас ${eMax-carried}</span>`;
    } else if(carried < eMax*2){
      statusLine = `<span style="color:var(--red,#c0392b);font-weight:600;">Перегруз +${over} · Движение −${over} (${Math.max(0,baseMove-over)})</span>`;
    } else {
      statusLine = `<span style="color:var(--red,#c0392b);font-weight:700;">Критический перегруз — обездвижен</span>`;
    }
    const hasBugai = calcW.encMax > (calcW.RSb||0)+(calcW.RVb||0);
    h += `<div class="sv4-block">
      <div class="sv4-block-title">Общий вес</div>
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
        <b style="font-family:'Cinzel',serif;font-size:22px;color:${barColor};">${carried}</b>
        <span class="muted">/ предел ${eMax}</span>
        <span style="margin-left:auto;font-size:12px;">${statusLine}</span>
      </div>
      <div style="height:8px;border-radius:4px;background:rgba(255,255,255,.08);margin-top:8px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${barColor};transition:width .2s;"></div>
      </div>
      <p class="muted" style="font-size:10px;margin-top:6px;">Предел = РС + РВ${hasBugai?` + Бугай (+${calcW.encMax-((calcW.RSb||0)+(calcW.RVb||0))})`:''}. Сверх предела: −1 к Движению за каждый пункт; при удвоенном пределе — обездвижен.</p>
    </div>`;
  }
  return h;
}

// ============== ВКЛАДКА: ШТРИХИ ==============
function renderTabNotes(){
  const xpAvail = (state.xpGained||0) - (state.sheet.spentXP||0);
  let h = `<div class="sv4-block">
    <div class="sv4-block-title">Психология</div>
    <textarea class="sv4-text" rows="3" placeholder="страхи, фобии, особенности..." onchange="state.sheet.psychology=this.value;autosave();">${escHtml(state.sheet.psychology||'')}</textarea>
  </div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Биография</div>
    <textarea class="sv4-text" rows="6" placeholder="история, важные события..." onchange="state.sheet.notes=this.value;autosave();">${escHtml(state.sheet.notes||'')}</textarea>
  </div>`;
  h += `<div class="sv4-block">
    <div class="sv4-block-title">Опыт</div>
    <div class="sv4-row" style="align-items:center;flex-wrap:wrap;">
      <span>Всего:</span>
      <input type="number" min="0" value="${state.xpGained||0}" class="sv4-mini gold" style="width:80px;" onchange="state.xpGained=Math.max(0,parseInt(this.value)||0);renderSheet();" />
      <span>−</span>
      <span>Потрачено:</span>
      <input type="number" min="0" value="${state.sheet.spentXP||0}" class="sv4-mini" style="width:80px;" onchange="state.sheet.spentXP=Math.max(0,parseInt(this.value)||0);renderSheet();" />
      <span>=</span>
      <b style="color:var(--gold2);font-family:'Cinzel',serif;font-size:18px;">${xpAvail}</b>
    </div>
    <div class="sv4-row" style="margin-top:6px;">
      <button class="sv4-btn-mini" onclick="addXP(50)">+50</button>
      <button class="sv4-btn-mini" onclick="addXP(100)">+100</button>
      <button class="sv4-btn-mini" onclick="addXP(250)">+250</button>
    </div>
  </div>`;
  return h;
}

// ============== ВКЛАДКА: ПЕЧАТНЫЙ БЛАНК ==============
function renderTabPrint(){
  const r = DATA.races[state.race];
  const c = DATA.careers[state.career];
  const calc = sheetCalc();
  const totals = calc.totals;
  const tier = c.tiers[(state.sheet.tier||1)-1];
  const skills = compileSkills().filter(s => s.adv>0 || s.sources.length);
  const talents = compileTalents();
  let h = `<div class="sv4-print-controls">
    <button class="sv4-btn-mini" onclick="window.print()"><span class="ic">${ICONS.print}</span> Напечатать</button>
    <span class="muted" style="font-size:11px;margin-left:auto;">Стр. 1 — характеристики и навыки. Стр. 2 — снаряжение и заметки.</span>
  </div>`;
  h += `<div class="sv4-print-page">
    <div class="sv4-print-head">
      <div>
        <div class="sv4-print-name">${escHtml(state.name||'—')}</div>
        <div class="sv4-print-sub">${escHtml(r.name)} · ${escHtml(c.class)} · ${escHtml(c.name)} · ${state.sheet.tier}. ${escHtml(tier.name)} (${escHtml(tier.status)})</div>
      </div>
      <div class="sv4-print-meta">
        <div>Возраст: <b>${escHtml(state.age||'—')}</b></div>
        <div>Рост: <b>${escHtml(state.height||'—')}</b></div>
        <div>Глаза: <b>${escHtml(state.eyes||'—')}</b></div>
        <div>Волосы: <b>${escHtml(state.hair||'—')}</b></div>
      </div>
    </div>
    <h3 class="sv4-print-h3">Характеристики</h3>
    <table class="sv4-print-tbl"><thead><tr>${STAT_NAMES.map(s=>`<th>${s}</th>`).join('')}</tr></thead>
      <tbody><tr>${STAT_NAMES.map(s=>`<td class="big">${totals[s]||0}</td>`).join('')}</tr>
      <tr>${STAT_NAMES.map(s=>`<td class="small">+${Math.floor((totals[s]||0)/10)}</td>`).join('')}</tr></tbody>
    </table>
    <h3 class="sv4-print-h3">Виталки</h3>
    <div class="sv4-print-vitals">
      <div>Здоровье: <b>${state.sheet.currentHP}/${calc.maxHP}</b></div>
      <div>Скорость: <b>${calc.move}</b> (шаг ${calc.move*2}, бег ${calc.move*4})</div>
      <div>Судьба: <b>${calc.fate}</b> · Удача: <b>${state.sheet.currentLuck||0}/${calc.fate}</b></div>
      <div>Упорство: <b>${state.sheet.resolveCurrent||0}/${calc.upor}</b> · Скверна: <b>${state.sheet.corruption||0}/${calc.corruptionThreshold}</b></div>
    </div>
    <h3 class="sv4-print-h3">Навыки (${skills.length})</h3>
    <table class="sv4-print-tbl small-tbl"><thead><tr><th>Навык</th><th>Хар.</th><th>Шаги</th><th>Итог</th></tr></thead>
      <tbody>${skills.map(s=>`<tr><td>${escHtml(s.name)}</td><td>${s.stat}</td><td>${s.adv}</td><td><b>${s.value}</b></td></tr>`).join('')}</tbody>
    </table>
  </div>`;
  h += `<div class="sv4-print-page" style="margin-top:14px;page-break-before:always;">
    <h3 class="sv4-print-h3">Таланты (${talents.length})</h3>
    <ul class="sv4-print-list">${talents.map(t=>`<li><b>${escHtml(t.name)}</b> (ур. ${t.level}, ${t.src})${t.hint?` — <span class="muted">${escHtml(t.hint)}</span>`:''}</li>`).join('')}</ul>
    <h3 class="sv4-print-h3">Оружие</h3>
    <table class="sv4-print-tbl small-tbl"><thead><tr><th>Название</th><th>Группа</th><th>Урон</th><th>Кач-ва</th></tr></thead>
      <tbody>${(state.sheet.weapons||[]).map(w=>`<tr><td>${escHtml(w.name||'')}</td><td>${escHtml(w.group||'')}</td><td><b>${escHtml(w.damage||'')}</b></td><td>${escHtml(w.qualities||'')}</td></tr>`).join('')}</tbody>
    </table>
    <h3 class="sv4-print-h3">Броня</h3>
    <table class="sv4-print-tbl small-tbl"><thead><tr><th>Название</th><th>Зоны</th><th>КБ</th></tr></thead>
      <tbody>${(state.sheet.armor||[]).map(a=>`<tr><td>${escHtml(a.name||'')}</td><td>${escHtml(a.zones||'')}</td><td><b>${a.ap||0}</b></td></tr>`).join('')}</tbody>
    </table>
    <h3 class="sv4-print-h3">Имущество</h3>
    <ul class="sv4-print-list">${(state.sheet.trappings||[]).map(t=>`<li>${escHtml(t.name||'')} ${t.enc?`(вес ${t.enc})`:''}</li>`).join('')}</ul>
    <h3 class="sv4-print-h3">Деньги</h3>
    <div>${state.sheet.money?.gc||0} КР · ${state.sheet.money?.ss||0} шил. · ${state.sheet.money?.bp||0} бп</div>
    ${state.motivation?`<h3 class="sv4-print-h3">Мотивация</h3><p>${escHtml(state.motivation)}</p>`:''}
    ${state.sheet.psychology?`<h3 class="sv4-print-h3">Психология</h3><p>${escHtml(state.sheet.psychology)}</p>`:''}
    ${state.sheet.notes?`<h3 class="sv4-print-h3">Биография</h3><p>${escHtml(state.sheet.notes)}</p>`:''}
  </div>`;
  return h;
}

// Хелпер для quickPay
function quickPayUI(sign){
  const amt = parseInt(document.getElementById('pay-amount').value,10)||0;
  const cur = document.getElementById('pay-currency').value||'bp';
  if(amt<=0){ notify('Введи сумму.'); return; }
  let bp = amt;
  if(cur==='ss') bp=amt*12;
  else if(cur==='gc') bp=amt*240;
  if(sign<0){
    if(!payMoneyBP(bp)){ notify('Не хватает денег! Нужно '+bp+' бп.'); return; }
    notify(`Списано ${amt} ${cur==='gc'?'КР':cur==='ss'?'шил.':'бп'}.`);
  } else {
    addMoneyBP(bp);
    notify(`Получено ${amt} ${cur==='gc'?'КР':cur==='ss'?'шил.':'бп'}.`);
  }
  sv2UpdateMoneyUI();
  document.getElementById('pay-amount').value = '';
}

// Добавление оружия/брони/предметов через каталог
function sv2AddWeapon(){
  const name = (document.getElementById('new-weapon-name').value||'').trim();
  if(!name) return;
  let w = { name, group:'', range:'', damage:'', qualities:'', enc:1 };
  if(typeof WEAPONS_CATALOG !== 'undefined'){
    const found = findInCatalog(WEAPONS_CATALOG, name);
    if(found){
      w = {
        name: found.name,
        group: found.group||'',
        range: found.reach||'',
        damage: found.damage||'',
        qualities: typeof found.qualities==='string' ? found.qualities : (found.qualities||[]).join(', '),
        enc: (found.weight_num!=null ? found.weight_num : 1)
      };
    }
  }
  state.sheet.weapons.push(w);
  document.getElementById('new-weapon-name').value = '';
  renderSheet();
}
// Боеприпасы дальнобойного оружия (лёгкое обновление без полной перерисовки)
function sv2AmmoDelta(i, delta){
  const w = state.sheet.weapons[i];
  if(!w) return;
  w.ammo = Math.max(0, (w.ammo||0)+delta);
  const el = document.getElementById('sv4-ammo-'+i);
  if(el) el.textContent = w.ammo;
  autosave();
}
function sv2AmmoSet(i, val){
  const w = state.sheet.weapons[i];
  if(!w) return;
  w.ammo = Math.max(0, val);
  const el = document.getElementById('sv4-ammo-'+i);
  if(el) el.textContent = w.ammo;
  autosave();
}
function sv2AddArmor(){
  const name = (document.getElementById('new-armor-name').value||'').trim();
  if(!name) return;
  let a = { name, zones:'', ap:0, qualities:'', enc:1 };
  if(typeof ARMOR_CATALOG !== 'undefined'){
    const found = findInCatalog(ARMOR_CATALOG, name);
    if(found){
      a = {
        name: found.name,
        zones: typeof found.zones==='string' ? found.zones : (found.zones||[]).join(', '),
        ap: found.ap||0,
        qualities: typeof found.qualities==='string' ? found.qualities : (found.qualities||[]).join(', '),
        enc: (found.weight_num!=null ? found.weight_num : 1)
      };
    }
  }
  state.sheet.armor.push(a);
  document.getElementById('new-armor-name').value = '';
  renderSheet();
}
function sv2AddTrapping(){
  const name = (document.getElementById('new-trap-name').value||'').trim();
  if(!name) return;
  const enc = parseInt(document.getElementById('new-trap-enc').value)||0;
  state.sheet.trappings.push({ name, enc, desc:'' });
  document.getElementById('new-trap-name').value = '';
  document.getElementById('new-trap-enc').value = '0';
  renderSheet();
}

// Переключение зоны защиты брони через чекбоксы
const ZONE_NAMES = { 'голова':'голова', 'тело':'тело', 'праваярука':'правая рука', 'леваярука':'левая рука', 'праваянога':'правая нога', 'леваянога':'левая нога' };
function sv2ArmorZoneToggle(i, key, on){
  const a = state.sheet.armor[i];
  if(!a) return;
  // Текущий набор зон → нормализуем в множество ключей
  let set = new Set();
  const z = (a.zones||'').toLowerCase();
  if(z.includes('голов')) set.add('голова');
  if(z.includes('тел')||z.includes('торс')||z.includes('груд')) set.add('тело');
  if(z.includes('прав')&&z.includes('рук')) set.add('праваярука');
  if(z.includes('лев')&&z.includes('рук')) set.add('леваярука');
  if(z.includes('рук')&&!z.includes('лев')&&!z.includes('прав')){ set.add('праваярука'); set.add('леваярука'); }
  if(z.includes('прав')&&z.includes('ног')) set.add('праваянога');
  if(z.includes('лев')&&z.includes('ног')) set.add('леваянога');
  if(z.includes('ног')&&!z.includes('лев')&&!z.includes('прав')){ set.add('праваянога'); set.add('леваянога'); }
  // Меняем
  if(on) set.add(key); else set.delete(key);
  // Собираем строку обратно
  const parts = [];
  if(set.has('голова')) parts.push('голова');
  if(set.has('тело')) parts.push('тело');
  if(set.has('праваярука') && set.has('леваярука')) parts.push('руки');
  else { if(set.has('праваярука')) parts.push('правая рука'); if(set.has('леваярука')) parts.push('левая рука'); }
  if(set.has('праваянога') && set.has('леваянога')) parts.push('ноги');
  else { if(set.has('праваянога')) parts.push('правая нога'); if(set.has('леваянога')) parts.push('левая нога'); }
  a.zones = parts.join(', ');
  autosave();
  renderSheet();
}

// Добавить СТАРТОВОЕ снаряжение (только при создании персонажа, один раз).
// По правилам WFRP4 имущество выдаётся за класс + 1-ю ступень первой карьеры
// и больше не начисляется при переходах. Поэтому: только на 1-й ступени и
// только один раз — флаг starterImported защищает от повторной выдачи.
function sv2AddStarterGear(){
  const c = state.career ? DATA.careers[state.career] : null;
  if(!c){ notify('Нет карьеры.'); return; }
  if((state.sheet.tier||1) !== 1){
    notify('Стартовое имущество положено только на 1-й ступени. Новое снаряжение добывают по ходу игры.');
    return;
  }
  if(state.sheet.starterImported){
    notify('Стартовое имущество уже выдано — повторно не начисляется.');
    return;
  }
  const tier = c.tiers[0];
  const cls = DATA.classes[c.class];
  let str = '';
  if(cls && cls.trappings) str += cls.trappings + ', ';
  str += (tier.trappings || '');
  if(!str.trim()){ notify('У ступени нет снаряжения.'); return; }

  const parts = str.split(/,(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
  let nw=0, na=0, ni=0;
  parts.forEach(part => {
    // Оружие
    const w = (typeof findInCatalog==='function') ? findInCatalog(WEAPONS_CATALOG, part) : null;
    if(w){
      state.sheet.weapons.push({
        name: w.name, group: w.group||'', range: w.reach||'',
        damage: w.damage||'',
        qualities: typeof w.qualities==='string'?w.qualities:(w.qualities||[]).join(', '),
        enc: (w.weight_num!=null?w.weight_num:1)
      });
      nw++; return;
    }
    // Броня
    const a = (typeof findInCatalog==='function') ? findInCatalog(ARMOR_CATALOG, part) : null;
    if(a){
      state.sheet.armor.push({
        name: a.name,
        zones: typeof a.zones==='string'?a.zones:(a.zones||[]).join(', '),
        ap: a.ap||0,
        qualities: typeof a.qualities==='string'?a.qualities:(a.qualities||[]).join(', '),
        enc: (a.weight_num!=null?a.weight_num:1)
      });
      na++; return;
    }
    // Прочее (с разбором количества)
    let qty=1, name=part;
    const m = part.match(/^(\d+(?:d\d+)?)\s+(.+)$/);
    if(m){ name = m[2]; if(/^\d+$/.test(m[1])) qty = parseInt(m[1],10)||1; else name = part; }
    state.sheet.trappings.push({ name: name, enc: 0, desc: '' });
    ni++;
  });
  notify(`Добавлено: ${nw} оружия, ${na} брони, ${ni} предметов.`);
  state.sheet.starterImported = true;
  renderSheet();
}





function trySetTierFromSheet(newTier, oldTier){
  const nt = parseInt(newTier) || 1;
  const ot = parseInt(oldTier) || 1;
  if(nt === ot) return;
  // Спросим пользователя: использовать магазин XP (правильно по книге) или просто сменить (читерски).
  ordoChoice({
    title: `Сменить ступень на ${nt}?`,
    text: 'По правилам книги переход между ступенями стоит XP (100 или 200) и оформляется через Магазин обучения.',
    options: [
      { label: '◈ Через магазин XP (по правилам)', cb: () => _tierGoShop(nt, ot) },
      { label: 'Просто переключить (без XP)', cb: () => _tierJustSwitch(nt, ot) }
    ],
    cancel: 'Отмена'
  });
  return;
}
function _tierGoShop(nt, ot){
  // Правильный путь: откатываем выбор и уводим в магазин обучения
  renderSheet();
  goStep(9);
}
function _tierJustSwitch(nt, ot){
  // Просмотровый режим: меняем ступень без списания XP
  state.sheet.tier = nt;
  if(typeof autosave === 'function') autosave();
  renderSheet();
}

// Экранирование. escAttr — для значения атрибута, escHtml — для текста между
// тегами. Кавычки экранируют оба: escHtml задуман для текста, но если его
// однажды по ошибке поставят в атрибут, дыры из этого не выйдет. Пусть
// правильность держится на самой функции, а не на внимательности.
function escAttr(s){ return String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escHtml(s){ return String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ===================== АККОРДЕОН =====================
function accordion(titleHtml, metaText, bodyHtml, openByDefault){
  const cls = openByDefault ? 'accordion open' : 'accordion';
  return `<div class="${cls}">
    <div class="accordion-head" onclick="this.parentNode.classList.toggle('open')">
      <span class="acc-title">${titleHtml}</span>
      ${metaText?`<span class="acc-meta">${escHtml(metaText)}</span>`:''}
      <span class="acc-arrow">▶</span>
    </div>
    <div class="accordion-body">${bodyHtml}</div>
  </div>`;
}

// ===================== ДЕНЬГИ =====================
// 1 КР = 20 шиллингов = 240 пенни ; 1 шиллинг = 12 пенни.
function moneyToBP(m){
  if(!m) return 0;
  return (m.gc||0)*240 + (m.ss||0)*12 + (m.bp||0);
}
function bpToMoney(totalBP){
  totalBP = Math.max(0, Math.floor(totalBP||0));
  const gc = Math.floor(totalBP / 240); totalBP -= gc*240;
  const ss = Math.floor(totalBP / 12);  totalBP -= ss*12;
  return { gc, ss, bp: totalBP };
}
// Списать сумму (в пенни) с кошелька. Возвращает true, если хватило.
function payMoneyBP(amountBP){
  if(!state.sheet.money) state.sheet.money = {gc:0, ss:0, bp:0};
  const have = moneyToBP(state.sheet.money);
  if(have < amountBP) return false;
  state.sheet.money = bpToMoney(have - amountBP);
  return true;
}
// Зачислить деньги (без проверок).
function addMoneyBP(amountBP){
  if(!state.sheet.money) state.sheet.money = {gc:0, ss:0, bp:0};
  const have = moneyToBP(state.sheet.money);
  state.sheet.money = bpToMoney(have + Math.floor(amountBP||0));
}
// Быстрая оплата / получение из UI кошелька. sign = +1 (зачислить) или -1 (списать).
function quickPay(sign){
  const amt = parseInt(document.getElementById('pay-amount').value, 10) || 0;
  const cur = document.getElementById('pay-currency').value || 'bp';
  if(amt <= 0){ notify('Введи сумму.'); return; }
  let bp = amt;
  if(cur==='ss') bp = amt*12;
  else if(cur==='gc') bp = amt*240;
  if(sign < 0){
    if(!payMoneyBP(bp)){ notify('Не хватает денег! Нужно ' + bp + ' бп.'); return; }
    notify(`Списано ${amt} ${cur==='gc'?'КР':cur==='ss'?'шил.':'бп'}.`);
  } else {
    addMoneyBP(bp);
    notify(`Получено ${amt} ${cur==='gc'?'КР':cur==='ss'?'шил.':'бп'}.`);
  }
  renderSheet();
}
