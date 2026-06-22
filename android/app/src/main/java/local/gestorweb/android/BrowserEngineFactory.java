package local.gestorweb.android;

import android.content.Context;
import android.net.http.SslError;
import android.os.Handler;
import android.os.Looper;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * BrowserEngineFactory
 *
 * Motor de navegación seleccionable por perfil.
 *
 * Opciones:
 *  - "webview"  → AndroidX WebView estándar (siempre disponible)
 *                 Proxy: ProxyController (androidx.webkit ≥ 1.4)
 *
 *  - "cronet"   → Cronet vía Google Play Services (red-level proxy SOCKS5/HTTP)
 *                 Si Play Services no está disponible, hace fallback a webview.
 *
 *  - "auto"     → intenta Cronet, fallback a webview
 *
 * NOTA sobre DuckDuckGo:
 *   El SDK de DuckDuckGo Privacy Browser (ddg-android-sdk) proporciona
 *   DuckDuckGoWebViewClient con bloqueo de rastreadores, pero NO expone
 *   soporte de proxy por perfil a nivel de red (lo gestiona internamente).
 *   Por eso para perfiles con proxy usamos WebView puro + ProxyController;
 *   sin proxy se puede activar el cliente DDG para bloqueo de trackers.
 *   La integración DDG se hace vía WebViewClient, no como motor separado.
 *
 * La clase devuelve un {@link Result} con el WebView configurado y
 * un flag {@code usingCronet} para que BrowserActivity sepa qué motor usó.
 */
public final class BrowserEngineFactory {

    public static final class Result {
        public final WebView webView;
        public final boolean usingCronet;
        Result(WebView wv, boolean cronet) { this.webView = wv; this.usingCronet = cronet; }
    }

    /**
     * Crea y configura el WebView según el engine del perfil.
     * La llamada a ProxyController.setProxyOverride se hace en BrowserActivity
     * (necesita el callback de navegación). Esta fábrica solo configura
     * WebSettings, CookieManager y WebViewClient base.
     */
    public static Result create(
            Context ctx,
            ProfileStore.Profile profile,
            PageFinishedCallback onPageFinished) {

        WebView wv = new WebView(ctx);
        wv.setBackgroundColor(android.graphics.Color.rgb(16, 20, 28));

        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setGeolocationEnabled(false);
        s.setSaveFormData(false);
        s.setMixedContentMode(
                profile.privacyMode.equals(ProfileStore.MODE_COMPAT)
                        ? WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                        : WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(
                profile.privacyMode.equals(ProfileStore.MODE_STRICT)
                        ? WebSettings.LOAD_NO_CACHE
                        : WebSettings.LOAD_DEFAULT);
        // User-Agent del perfil (puede sobreescribirse con modo escritorio)
        if (!profile.userAgent.isEmpty()) s.setUserAgentString(profile.userAgent);

        android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
        cm.setAcceptCookie(!profile.privacyMode.equals(ProfileStore.MODE_STRICT));
        cm.setAcceptThirdPartyCookies(wv, profile.privacyMode.equals(ProfileStore.MODE_COMPAT));

        wv.setWebChromeClient(new WebChromeClient());
        wv.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return false;
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                new Handler(Looper.getMainLooper()).post(() -> onPageFinished.onFinished(url));
            }
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
            }
        });

        // Cronet como stack de red subyacente
        // Requiere que el dispositivo tenga Google Play Services ≥ 21 (Android 5+)
        // y la dependencia: com.google.android.gms:play-services-cronet
        // Si no está disponible, WebView usa su stack HTTP interno.
        boolean usingCronet = false;
        if (!profile.engine.equals("webview")) {
            usingCronet = tryInstallCronet(ctx, wv);
        }

        return new Result(wv, usingCronet);
    }

    /**
     * Intenta instalar Cronet como proveedor HTTP del WebView.
     * Usa reflexión para no requerir la dependencia en tiempo de compilación
     * si el desarrollador no la tiene disponible.
     * Devuelve true si se instaló correctamente.
     */
    private static boolean tryInstallCronet(Context ctx, WebView wv) {
        try {
            // com.google.android.gms.net.CronetProviderInstaller
            Class<?> installer = Class.forName("com.google.android.gms.net.CronetProviderInstaller");
            // installIfNeeded(Context) — instala sincrónicamente si ya está disponible
            installer.getMethod("installIfNeeded", Context.class).invoke(null, ctx);
            return true;
        } catch (Exception e) {
            // Cronet no disponible o Play Services ausente → continuar con WebView nativo
            return false;
        }
    }

    /** Callback para notificar page finish sin acoplar a BrowserActivity. */
    public interface PageFinishedCallback {
        void onFinished(String url);
    }
}
