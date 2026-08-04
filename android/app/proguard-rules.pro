# Правила для R8 (minifyEnabled true).
#
# Без сжатия в APK ехал весь androidx целиком: classes.dex занимал 7,1 МБ
# из 8,5 МБ пакета. R8 выбрасывает то, до чего нельзя дойти по коду, — но
# до половины нужного здесь доходят не по коду, а по имени: WebView зовёт
# методы моста строкой из JavaScript, а Capacitor поднимает плагины через
# рефлексию по аннотации. Всё такое перечислено ниже поимённо.
#
# Часть правил приходит сама: capacitor-android объявляет
# consumerProguardFiles, поэтому его -keep для @CapacitorPlugin и наследников
# com.getcapacitor.Plugin применяются к сборке автоматически. Ниже — то,
# чего в них нет.

# ── мост между JavaScript и Java ────────────────────────────────────────────
# Методы с @JavascriptInterface вызываются из JS по имени. Такое же правило
# есть в proguard-android.txt от AGP; повторяем явно, чтобы оно не зависело
# от того, какой файл по умолчанию подключён.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Ядро Capacitor целиком: мост, конфигурация, обработчики плагинов.
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepattributes *Annotation*, JavascriptInterface, Signature, InnerClasses, EnclosingMethod

# ── наш код ─────────────────────────────────────────────────────────────────
# MainActivity поднимается системой по имени из манифеста.
-keep class ru.yansampletext.ordo.** { *; }

# ── плагины Capacitor ───────────────────────────────────────────────────────
# @capacitor/preferences — им хранятся копии досье в SharedPreferences.
-keep class com.capacitorjs.plugins.** { *; }

# Плагины Cordova (их нет, но модуль-обёртка в проекте есть).
-keep class org.apache.cordova.** { *; }

# ── прочее ──────────────────────────────────────────────────────────────────
# WebChromeClient дёргают по имени из движка WebView.
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, java.lang.String);
}

# Понятные стектрейсы, если приложение всё-таки упадёт.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
