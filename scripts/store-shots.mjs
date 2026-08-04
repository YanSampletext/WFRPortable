// Скриншоты для карточки магазина: 1080×2400, как у обычного телефона.
// Запуск: подними локальный сервер (npx http-server . -p 8099) и выполни
//   node scripts/store-shots.mjs
// Готовые файлы появятся в store/screenshots/.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const out = '/home/user/WFRPortable/store/screenshots';
mkdirSync(out, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 3 });

async function boot() {
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.waitForTimeout(700);
  // персонажа целиком собирает сам генератор приложения — так все поля на месте
  await p.evaluate(() => {
    const make = (name, tier, xp) => {
      _rollFullRandomCharacterDo();
      state.name = name;
      state.xpGained = xp;
      state.sheet.tier = tier;
      state.id = null;
      saveCharacterToRoster();
    };
    make('Гюнтер Швальб', 2, 340);
    make('Ирма фон Тассель', 1, 180);
    make('Хайнрих Кёниг', 3, 620);
    // генератор попутно кладёт в архив свои черновики — оставляем только наших
    const keep = ['Гюнтер Швальб', 'Ирма фон Тассель', 'Хайнрих Кёниг'];
    const seen = {};
    saveRoster(loadRoster().filter(p => {
      if (keep.indexOf(p.name) < 0 || seen[p.name]) return false;
      seen[p.name] = 1; return true;
    }));
  });
  await p.reload();
  await p.waitForTimeout(900);
}

async function shot(name) {
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${name}.png` });
  console.log('снято', name);
}

await boot();
await shot('1-landing');

await p.evaluate(() => {
  document.getElementById('view-landing').style.display = 'none';
  document.getElementById('view-app').style.display = 'block';
  appMode = 'landing'; goStep(0);
});
await shot('2-archive');

await p.evaluate(() => { openCharacter(loadRoster()[0].id); });
await shot('3-sheet');

await p.evaluate(() => sv4NavGo('health'));
await shot('4-health');

await p.evaluate(() => sv4NavGo('more'));
await shot('5-more');

await p.evaluate(() => { sv4NavGo('persona'); drawerOpen(); });
await shot('6-menu');

await b.close();
