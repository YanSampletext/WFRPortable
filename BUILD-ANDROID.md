# Сборка приложения для Android

Приложение собирается **Capacitor**: весь сайт зашивается внутрь APK и
открывается из локального origin `https://localhost`. Ни адресной строки,
ни зависимости от GitHub Pages, ни интернета для работы не нужно —
шрифты тоже лежат внутри (`fonts/`, подключены через `css/fonts.css`).

Прежняя TWA-сборка (`build-apk.ps1`, Bubblewrap) остаётся рабочей: она
делает оболочку **над сайтом** на Pages. Отличия — в конце файла.

Минимальная версия системы — **Android 11 (API 30)**, задана в
`android/variables.gradle`.

## Что нужно на машине

- Node.js 20+ и выполненный `npm install`: gradle-проект ссылается на
  плагины прямо в `node_modules`, без них сборка не стартует
- JDK 17 (например `C:\Users\Yann\.bubblewrap\jdk64` от прежней сборки)
- Android SDK, platform 34+ и build-tools (Android Studio ставит сам)
- Переменная `ANDROID_HOME` (или файл `android/local.properties`
  со строкой `sdk.dir=C\:\\Users\\Yann\\AppData\\Local\\Android\\Sdk`)

## Ключ подписи

Подписывать нужно **тем же** keystore, что и прежний APK
(`twa-project/android.keystore`, alias `android`) — тогда приложение
встанет обновлением поверх установленного. Другой ключ = Android
потребует сначала удалить старое приложение.

```powershell
copy android\keystore.properties.example android\keystore.properties
```

и подставить свои значения. Файл с паролями в git не попадает.
Без него соберётся неподписанный APK — только для проверки.

## Сборка

```powershell
npm install          # один раз
npm run apk          # www/ → android → gradle assembleRelease
```

Готовый файл: `android/app/build/outputs/apk/release/app-release.apk`.
Для Play Store нужен `.aab`: `npm run aab` →
`android/app/build/outputs/bundle/release/app-release.aab`.

Промежуточные команды, если нужно по шагам:

| Команда | Что делает |
|---|---|
| `npm run build` | собирает `www/` из корня репозитория |
| `npm run sync` | то же + копирует `www/` в Android-проект |
| `npx cap open android` | открывает проект в Android Studio |

## Сборка на GitHub Actions

`.github/workflows/android.yml` собирает APK и прикладывает его к релизу
при пуше тега `v*`. Один раз нужно завести секреты репозитория
(Settings → Secrets and variables → Actions):

| Секрет | Значение |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `twa-project/android.keystore` в base64 |
| `ANDROID_KEYSTORE_PASSWORD` | пароль хранилища |
| `ANDROID_KEY_ALIAS` | `android` |
| `ANDROID_KEY_PASSWORD` | пароль ключа |

base64 из PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("twa-project\android.keystore")) | Set-Clipboard
```

Дальше `git push origin v1.1.0` — и APK появится в релизе. Проверить
сборку до тега можно вручную: вкладка Actions → Android APK → Run
workflow (тогда APK останется артефактом запуска, релиз не создаётся).

Без секретов workflow тоже отработает, но APK будет неподписанным —
такой не поставить поверх установленного приложения.

## Как это устроено

- `scripts/build-www.mjs` копирует в `www/` то, из чего состоит
  приложение: `index.html`, `css`, `js`, `fonts`, `icons`,
  `manifest.json`. **`sw.js` намеренно не копируется** — внутри APK
  файлы и так локальные, а кеш service worker'а пережил бы обновление
  приложения и продолжил отдавать старую вёрстку. Регистрация SW в
  собранной копии `index.html` отключается автоматически.
- `capacitor.config.json` — appId, имя, цвет фона, схема `https`.
- `android/` — обычный Android-проект, он в репозитории. Если gradle
  начнёт ругаться на версии после обновления SDK, папку можно снести и
  пересоздать: `npx cap add android` (после этого заново поставить
  иконки и подпись — см. ниже).
- Иконки сгенерированы из `assets/icon.png`:
  `npx @capacitor/assets generate --android --iconBackgroundColor '#160D05'`
- Версия приложения — в `android/app/build.gradle`
  (`versionCode`, `versionName`). `versionCode` должен расти с каждым
  выпуском, иначе Android откажется ставить обновление.

## Где лежат персонажи

Внутри приложения, в его собственных данных — наружу ничего не уходит.
Основное хранилище то же, что и в вебе (`localStorage` внутри WebView), но
у WebView его может вычистить система при нехватке места, а «Очистить
данные» стирает гарантированно. Поэтому `js/storage-native.js` держит
вторую копию в нативном хранилище Android (`SharedPreferences` через
`@capacitor/preferences`): каждая запись ростера, текущего персонажа и
темы дублируется туда.

Если при запуске окажется, что `localStorage` пуст, а нативная копия
цела, данные вернутся из неё — приложение один раз перезагрузит страницу
и продолжит работу. Нативное хранилище попадает в системный бэкап
(`android:allowBackup="true"`), так что переживает и переустановку с
восстановлением.

В браузере плагина нет: там тот же скрипт просто запрашивает постоянное
хранилище, чтобы данные не выбросили при нехватке места.

## Важно: данные не переезжают сами

Персонажи лежат в `localStorage`, а он привязан к адресу сайта. У версии
на Pages это `https://yansampletext.github.io`, у собранного приложения —
`https://localhost`. Для браузера это разные сайты, и данные не
подхватятся.

Порядок переезда: в старом приложении **«Ещё → Экспорт»** (JSON падает в
«Загрузки»), поставить новое, затем **«Ещё → Импорт»**. Сделать это нужно
до удаления старого приложения — иначе придётся открывать сайт в Chrome и
экспортировать оттуда.

## Чем отличается от TWA-сборки

| | Capacitor (`npm run apk`) | TWA (`build-apk.ps1`) |
|---|---|---|
| Где живут файлы | внутри APK | на GitHub Pages |
| Адресная строка | нет никогда | нет только после assetlinks |
| Работа без сети | полная | только то, что успел закешировать SW |
| Обновление вёрстки | новым APK | само, с Pages |
| Нужен `.well-known/assetlinks.json` | нет | да |
