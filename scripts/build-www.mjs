// Собирает www/ — то, что зашивается внутрь APK.
// Веб-версия на GitHub Pages при этом не меняется: она отдаётся прямо из корня репозитория.
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');

// Всё, из чего состоит приложение. sw.js намеренно не берём:
// внутри APK файлы и так локальные, а его кеш пережил бы обновление
// приложения и продолжил отдавать старую вёрстку.
const ITEMS = ['index.html', 'manifest.json', 'css', 'js', 'fonts', 'icons'];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const item of ITEMS) {
  const from = join(root, item);
  if (!existsSync(from)) {
    console.error(`нет файла или папки: ${item}`);
    process.exit(1);
  }
  cpSync(from, join(www, item), { recursive: true });
}

// Внутри приложения service worker не нужен и только мешает обновлениям
const indexPath = join(www, 'index.html');
const html = readFileSync(indexPath, 'utf8');
writeFileSync(indexPath, html.replace(
  "if('serviceWorker' in navigator && location.protocol.startsWith('http')){",
  "if(false){ // в собранном приложении service worker отключён"
), 'utf8');

console.log(`www/ собрана: ${ITEMS.join(', ')}`);
