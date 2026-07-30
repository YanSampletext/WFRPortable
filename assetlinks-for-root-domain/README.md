# Digital Asset Links — убрать адресную строку в APK

Android проверяет Digital Asset Links **только в корне домена**:

```
https://yansampletext.github.io/.well-known/assetlinks.json
```

Наше приложение живёт в подпапке (`/WFRPortable/`), поэтому положить файл
в этот репозиторий недостаточно — Android туда не заглянет. Файл должен
отдаваться с корня `yansampletext.github.io`, а этот адрес обслуживает
отдельный репозиторий — **`YanSampletext.github.io`** (user Pages site).

Пока файла нет, приложение работает, но Chrome показывает адресную строку
сверху вместо полноэкранного режима.

Содержимое этой папки — готовый корень будущего репозитория: копируются
`.nojekyll` и `.well-known/assetlinks.json`, сам README переносить не нужно.

## Что сделать

1. Создать на GitHub публичный репозиторий с именем ровно `YanSampletext.github.io`
2. Положить в него файл `.well-known/assetlinks.json` — готовая копия лежит рядом
   с этим README
3. Положить в корень того же репозитория пустой файл **`.nojekyll`**.
   Без него сборка Jekyll выкидывает папки, имя которых начинается с точки,
   и `.well-known/assetlinks.json` отдаваться не будет — Pages вернёт 404,
   а адресная строка останется на месте.
   (Альтернатива — `_config.yml` со строкой `include: [".well-known"]`.)
4. Включить Pages для этого репозитория (`Settings → Pages`, source: ветка `main`)
5. Проверить, что файл открывается **и отдаётся как JSON**:
   `https://yansampletext.github.io/.well-known/assetlinks.json`
   (должен быть код 200 и текст файла, а не страница 404)
6. Переустановить APK на телефоне — адресная строка исчезнет.
   Проверка асетлинков кешируется установкой, поэтому именно переустановка,
   а не перезапуск приложения.

Проверить связку можно через официальный валидатор Google:
`https://developers.google.com/digital-asset-links/tools/generator`

## Важно про ключ подписи

`assetlinks.json` привязан к отпечатку SHA-256 нашего keystore
(`twa-project/android.keystore`, alias `android`):

```
29:43:30:B7:CA:A0:25:96:EC:1D:C4:43:4B:56:84:B4:76:E2:BB:62:12:CD:C8:03:7F:22:99:68:3A:08:B7:39
```

Этот keystore — единственный способ выпускать обновления установленного
приложения. Если он потеряется, придётся менять `packageId` и переустанавливать
приложение с нуля. **Сделайте резервную копию** `twa-project/android.keystore`
(он намеренно не коммитится в git — внутри приватный ключ).

Если ключ всё же сменится, нужно заново сгенерировать assetlinks:

```powershell
cd twa-project
bubblewrap fingerprint add <новый SHA-256 с двоеточиями> --name=local-release
```
