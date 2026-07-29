# Собирает подписанный APK/AAB из PWA через Bubblewrap (Trusted Web Activity).
#
# Требования (уже установлены на этой машине):
#   - Node.js 20         C:\Program Files\nodejs
#   - JDK 17 x64         C:\Users\Yann\.bubblewrap\jdk64
#   - Android SDK        C:\Users\Yann\.bubblewrap\android_sdk
#   - Bubblewrap CLI     npm i -g @bubblewrap/cli
#
# Результат: twa-project\app-release-signed.apk и app-release-bundle.aab

$ErrorActionPreference = "Stop"

$root       = $PSScriptRoot
$projectDir = Join-Path $root "twa-project"
$keystore   = Join-Path $projectDir "android.keystore"

# Пароль защищает только локальный файл keystore, который не коммитится в git.
# Можно переопределить, не редактируя скрипт: $env:WFRP_KEYSTORE_PASSWORD = "..."
$password = if ($env:WFRP_KEYSTORE_PASSWORD) { $env:WFRP_KEYSTORE_PASSWORD } else { "wfrp4-signing-pass" }

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User") + ";" +
            "C:\Users\Yann\AppData\Roaming\npm"

# Bubblewrap запускает gradlew.bat из рабочей папки, а cmd.exe отказывается искать
# в текущем каталоге, если выставлена эта переменная (её ставит Git Bash).
Remove-Item Env:\NoDefaultCurrentDirectoryInExePath -ErrorAction SilentlyContinue

# PKCS12 не поддерживает разные пароли для хранилища и ключа — они должны совпадать.
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = $password
$env:BUBBLEWRAP_KEY_PASSWORD      = $password

New-Item -ItemType Directory -Force $projectDir | Out-Null
Copy-Item (Join-Path $root "twa-manifest.json") (Join-Path $projectDir "twa-manifest.json") -Force

if (-not (Test-Path $keystore)) {
    Write-Host "Создаю новый keystore..." -ForegroundColor Yellow
    Write-Host "ВНИМАНИЕ: новый ключ = новый отпечаток. Обнови assetlinks.json и учти," -ForegroundColor Yellow
    Write-Host "что установленное приложение нельзя обновить APK с другим ключом." -ForegroundColor Yellow
    & "C:\Users\Yann\.bubblewrap\jdk64\bin\keytool.exe" -genkeypair -v `
        -keystore $keystore -alias android `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass $password -keypass $password `
        -dname "CN=WFRP4, OU=Dev, O=YanSampletext, L=Unknown, ST=Unknown, C=US"
}

Set-Location $projectDir

# --skipVersionUpgrade: иначе Bubblewrap интерактивно спросит versionName.
# Версия задаётся в twa-manifest.json (appVersion / appVersionCode).
Write-Host "`nГенерирую Android-проект..." -ForegroundColor Cyan
& bubblewrap update --skipVersionUpgrade
if ($LASTEXITCODE -ne 0) { throw "bubblewrap update завершился с кодом $LASTEXITCODE" }

Write-Host "`nСобираю APK..." -ForegroundColor Cyan
& bubblewrap build --skipPwaValidation
if ($LASTEXITCODE -ne 0) { throw "bubblewrap build завершился с кодом $LASTEXITCODE" }

Write-Host "`nГотово:" -ForegroundColor Green
Get-ChildItem (Join-Path $projectDir "app-release-signed.apk"),
              (Join-Path $projectDir "app-release-bundle.aab") -ErrorAction SilentlyContinue |
    Select-Object Name, @{N = "MB"; E = { [math]::Round($_.Length / 1MB, 2) } }, LastWriteTime
