// Откуда брать Chromium для проверок.
//
// На машине разработчика Playwright может быть установлен глобально, в CI он
// ставится в node_modules. Прописывать один путь в каждом скрипте значило бы
// привязать проверки к одной конкретной машине — здесь и разрешается, что
// нашлось. Заодно поднимается локальный сервер: проверки открывают приложение
// по http, потому что file:// не даёт ни localStorage, ни service worker.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

// Проверяем не только «нашёлся ли модуль», но и «запустился ли браузер»:
// установленный Playwright без скачанной сборки Chromium импортируется
// прекрасно и падает лишь на launch, поэтому одного try вокруг import мало.
const CANDIDATES = ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs'];

export async function launchChromium(opts) {
  const trouble = [];
  for (const where of CANDIDATES) {
    let mod;
    try { mod = await import(where); }
    catch (e) { trouble.push(where + ': не установлен'); continue; }
    try { return await mod.chromium.launch(opts); }
    catch (e) { trouble.push(where + ': ' + String(e.message).split('\n')[0]); }
  }
  console.error('Не удалось запустить Chromium:\n  ' + trouble.join('\n  ') +
                '\nПоставь: npm ci && npx playwright install chromium');
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',   '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

// Простая раздача статики из корня проекта — внешний сервер поднимать незачем
export function serve(root, port) {
  const srv = createServer(async (req, res) => {
    const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, rel === '/' ? 'index.html' : rel);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch (e) {
      res.writeHead(404); res.end('нет такого файла');
    }
  });
  return new Promise(ok => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
