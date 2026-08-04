package ru.yansampletext.ordo;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * Android 15 и новее рисует приложение «от края до края»: WebView занимает
     * весь экран, и шапка досье уезжает под часы, батарею и вырез камеры.
     * Отдаём системные отступы контейнеру как padding — приложение начинается
     * там, где заканчиваются системные панели, на любой версии Android.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        deliverShortcut(getIntent());
    }

    /** Приложение уже было запущено (launchMode singleTask) — ярлык приходит сюда. */
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        deliverShortcut(intent);
    }

    /**
     * Ярлык с иконки несёт строку ordo_go; страница разбирает её сама.
     *
     * Страница к этому моменту может ещё грузиться, поэтому зовём дважды с
     * запасом по времени. Повтор безвреден: приложение отрабатывает ярлык
     * один раз и второй вызов игнорирует. Если не долетит ни один — просто
     * откроется обычный экран, ничего не сломается.
     */
    private void deliverShortcut(Intent intent) {
        if (intent == null) return;
        final String go = intent.getStringExtra("ordo_go");
        if (go == null || !go.matches("[a-z]{1,16}")) return;

        final String js = "window.ordoShortcut && window.ordoShortcut('" + go + "')";
        post(js, 400);
        post(js, 1500);
    }

    private void post(final String js, long delayMs) {
        try {
            final WebView web = getBridge().getWebView();
            if (web == null) return;
            web.postDelayed(() -> {
                try { web.evaluateJavascript(js, null); } catch (Exception ignored) {}
            }, delayMs);
        } catch (Exception ignored) {
            // Ярлык — удобство, а не работа приложения: молча переживаем
        }
    }
}
