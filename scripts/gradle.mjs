// Запускает gradle-обёртку Android-проекта одинаково на Windows и на *nix.
// Пример: node scripts/gradle.mjs assembleRelease
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(root, 'android');

if (!existsSync(android)) {
  console.error('Папки android/ нет. Создай проект: npx cap add android');
  process.exit(1);
}

const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const args = process.argv.slice(2);
if (!args.length) args.push('assembleRelease');

const res = spawnSync(wrapper, args, { cwd: android, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(res.status ?? 1);
