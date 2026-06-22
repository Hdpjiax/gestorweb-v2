package local.gestorweb.android;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.ProxyConfig;
import androidx.webkit.ProxyController;
import androidx.webkit.WebViewFeature;
import java.net.Authenticator;
import java.net.InetSocketAddress;
import java.net.PasswordAuthentication;
import java.net.Proxy;
import java.util.concurrent.Executor;

/**
 * BrowserActivity v2
 * ─────────────────────────────────────────────────────────────────────────
 * Mejoras respecto a v1:
 *  1. Soporte SOCKS5 / SOCKS4 mediante java.net.Proxy (además de HTTP/HTTPS
 *     que ya usaba ProxyController de AndroidX).
 *  2. Autenticación de proxy (proxyUser / proxyPass) vía Authenticator global.
 *  3. Inyección de SpoofInjector al inicio de cada página (onPageStarted)
 *     usando evaluateJavascript — corre ANTES que cualquier script de la página.
 *  4. Usa profile.findById() del nuevo ProfileStore en lugar de iterar la lista.
 */
public final class BrowserActivity extends AppCompatActivity {

    private static final int BG      = Color.rgb(7, 10, 16);
    private static final int PANEL   = Color.rgb(15, 23, 36);
    private static final int PANEL_2 = Color.rgb(20, 31, 48);
    private static final int BORDER  = Color.rgb(42, 57, 83);
    private static final int TEXT    = Color.rgb(238, 244, 252);
    private static final int MUTED   = Color.rgb(143, 156, 178);
    private static final int ACCENT  = Color.rgb(124, 92, 252);

    private final Handler  handler = new Handler(Looper.getMainLooper());
    private final Executor direct  = Runnable::run;

    private WebView      webView;
    private EditText     address;
    private ProfileStore.Profile profile;
    private LicenseStore licenses;

    // Script de spoof cacheado para el perfil activo (null = no spoof)
    private String spoofScript;

    private final Runnable licenseCheck = new Runnable() {
        @Override public void run() {
            new Thread(() -> {
                LicenseClient.Result result = LicenseClient.verify(
                    BrowserActivity.this, licenses.license(), licenses.deviceId());
                runOnUiThread(() -> {
                    if (!result.active) {
                        licenses.clearLicense();
                        startActivity(new Intent(BrowserActivity.this, MainActivity.class)
                            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));
                        finish();
                    } else {
                        handler.postDelayed(this, 5_000);
                    }
                });
            }).start();
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        licenses = new LicenseStore(this);
        String profileId = getIntent().getStringExtra("profileId");
        profile = new ProfileStore(this).findById(profileId);
        if (profile == null || licenses.license().isEmpty()) { finish(); return; }

        // Preparar script de spoofing (una sola vez por sesión)
        SpoofInjector.Preset preset = profile.resolvePreset();
        spoofScript = preset != null ? SpoofInjector.buildScript(preset) : null;

        buildUI();
        applyProxyAndOpen();
        handler.postDelayed(licenseCheck, 5_000);
    }

    // ── UI ───────────────────────────────────────────────────────────────────

    private void buildUI() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setPadding(dp(8), dp(8), dp(8), dp(8));

        // Header: nombre del perfil + estado
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(dp(10), dp(8), dp(10), dp(8));
        header.setBackground(rounded(PANEL, dp(18), BORDER));
        TextView name = text(profile.name, 16, TEXT, true);
        String proxyLabel = profile.proxy.isEmpty()
            ? "directo"
            : profile.proxyType + " · " + profile.proxy
              + (profile.hasProxyAuth() ? " 🔐" : "");
        String spoofLabel = profile.spoofPreset.equals(ProfileStore.SPOOF_NONE)
            ? "" : " · spoof: " + profile.spoofPreset;
        TextView meta = text(
            "Modo " + profile.privacyMode + " · " + proxyLabel + spoofLabel,
            12, MUTED, false);
        header.addView(name);
        header.addView(meta);
        root.addView(header, new LinearLayout.LayoutParams(-1, -2));

        // Toolbar: ‹  ↻  [barra de dirección]
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setPadding(0, dp(8), 0, dp(8));

        Button back = smallButton("‹");
        back.setOnClickListener(v -> { if (webView.canGoBack()) webView.goBack(); });
        toolbar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(48)));

        Button refresh = smallButton("↻");
        refresh.setOnClickListener(v -> webView.reload());
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(dp(48), dp(48));
        rp.setMargins(dp(6), 0, dp(6), 0);
        toolbar.addView(refresh, rp);

        address = new EditText(this);
        address.setSingleLine(true);
        address.setTextColor(TEXT);
        address.setHintTextColor(MUTED);
        address.setBackground(rounded(PANEL_2, dp(14), BORDER));
        address.setPadding(dp(12), 0, dp(12), 0);
        address.setOnEditorActionListener((v, actionId, event) -> {
            navigate(address.getText().toString()); return true;
        });
        toolbar.addView(address, new LinearLayout.LayoutParams(0, dp(48), 1));
        root.addView(toolbar, new LinearLayout.LayoutParams(-1, -2));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(16, 20, 28));
        configureWebView();
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
    }

    // ── WebView ──────────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setGeolocationEnabled(false);
        settings.setSaveFormData(false);
        settings.setMixedContentMode(
            profile.privacyMode.equals(ProfileStore.MODE_COMPAT)
                ? WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                : WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(
            profile.privacyMode.equals(ProfileStore.MODE_STRICT)
                ? WebSettings.LOAD_NO_CACHE
                : WebSettings.LOAD_DEFAULT);
        if (!profile.userAgent.isEmpty()) settings.setUserAgentString(profile.userAgent);

        CookieManager.getInstance().setAcceptCookie(
            !profile.privacyMode.equals(ProfileStore.MODE_STRICT));
        CookieManager.getInstance().setAcceptThirdPartyCookies(
            webView, profile.privacyMode.equals(ProfileStore.MODE_COMPAT));

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            /**
             * onPageStarted se dispara antes que cualquier script de la página.
             * Aquí inyectamos el spoofScript para garantizar que Object.defineProperty
             * se ejecute primero y no pueda ser sobreescrito.
             */
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (spoofScript != null && !spoofScript.isEmpty()) {
                    // evaluateJavascript en onPageStarted corre en el contexto
                    // del documento ANTES del DOMContentLoaded → indetectable.
                    view.evaluateJavascript(spoofScript, null);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                address.setText(url);
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler sslHandler, SslError error) {
                sslHandler.cancel();
            }
        });
    }

    // ── Proxy ────────────────────────────────────────────────────────────────

    /**
     * Aplica el proxy del perfil según su tipo:
     *  - HTTP / HTTPS  → ProxyController de AndroidX (WebView nativo).
     *  - SOCKS5/SOCKS4 → java.net.Proxy + Authenticator global.
     *    Nota: WebView no enruta tráfico SOCKS nativo; usamos el trick de
     *    pasar socks5:// a ProxyConfig (soportado desde AndroidX Webkit 1.7+).
     *    Para máxima compatibilidad también fijamos el proxy de sistema JVM.
     */
    private void applyProxyAndOpen() {
        if (profile.proxy.isEmpty()) {
            navigate(profile.url);
            return;
        }

        // Configurar autenticación de proxy si aplica
        if (profile.hasProxyAuth()) {
            Authenticator.setDefault(new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(
                        profile.proxyUser, profile.proxyPass.toCharArray());
                }
            });
        }

        boolean isSocks = profile.proxyType.equals(ProfileStore.PROXY_SOCKS5)
                       || profile.proxyType.equals(ProfileStore.PROXY_SOCKS4);

        if (isSocks) {
            applySocksProxy();
        } else {
            applyHttpProxy();
        }
    }

    /** HTTP / HTTPS via ProxyController (AndroidX Webkit). */
    private void applyHttpProxy() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) {
            navigate(profile.url);
            return;
        }
        String uri = profile.proxyUri();
        ProxyConfig config = new ProxyConfig.Builder()
            .addProxyRule(uri)
            .addDirect()
            .build();
        ProxyController.getInstance().setProxyOverride(config, direct,
            () -> navigate(profile.url));
    }

    /**
     * SOCKS5 / SOCKS4 — doble estrategia:
     * 1. ProxyConfig con URI socks5:// (AndroidX Webkit ≥ 1.7 / Android 13+).
     * 2. Propiedades de sistema JVM como fallback para HttpURLConnection.
     */
    private void applySocksProxy() {
        // Parsear host:puerto
        String hostPort = profile.proxy; // ya validado como host:port
        String host = hostPort;
        int    port  = 1080;
        int    colon = hostPort.lastIndexOf(':');
        if (colon > 0) {
            host = hostPort.substring(0, colon);
            try { port = Integer.parseInt(hostPort.substring(colon + 1)); }
            catch (NumberFormatException ignored) {}
        }

        // JVM system properties (fallback)
        String socksVersion = profile.proxyType.equals(ProfileStore.PROXY_SOCKS4)
            ? "4" : "5";
        System.setProperty("socksProxyHost",    host);
        System.setProperty("socksProxyPort",    String.valueOf(port));
        System.setProperty("socksProxyVersion", socksVersion);
        if (profile.hasProxyAuth()) {
            System.setProperty("java.net.socks.username", profile.proxyUser);
            System.setProperty("java.net.socks.password", profile.proxyPass);
        }

        // ProxyConfig con esquema socks5:// para AndroidX Webkit
        if (WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) {
            String uri = profile.proxyUri(); // socks5://[user:pass@]host:port
            ProxyConfig config = new ProxyConfig.Builder()
                .addProxyRule(uri)
                .addDirect()
                .build();
            ProxyController.getInstance().setProxyOverride(config, direct,
                () -> navigate(profile.url));
        } else {
            navigate(profile.url);
        }
    }

    // ── Navegación ───────────────────────────────────────────────────────────

    private void navigate(String raw) {
        String value = (raw == null || raw.trim().isEmpty()) ? "about:blank" : raw.trim();
        if (!value.equals("about:blank") && Uri.parse(value).getScheme() == null)
            value = "https://" + value;
        address.setText(value);
        webView.loadUrl(value);
    }

    // ── UI helpers ───────────────────────────────────────────────────────────

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        return view;
    }

    private Button smallButton(String label) {
        Button view = new Button(this);
        view.setText(label);
        view.setTextColor(Color.WHITE);
        view.setTextSize(20);
        view.setTypeface(Typeface.DEFAULT_BOLD);
        view.setBackground(rounded(ACCENT, dp(14), 0));
        return view;
    }

    private GradientDrawable rounded(int color, int radius, int strokeColor) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(color);
        shape.setCornerRadius(radius);
        if (strokeColor != 0) shape.setStroke(dp(1), strokeColor);
        return shape;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    @Override protected void onDestroy() {
        handler.removeCallbacks(licenseCheck);
        if (webView != null) { webView.stopLoading(); webView.destroy(); }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE))
            ProxyController.getInstance().clearProxyOverride(direct, () -> {});
        // Limpiar SOCKS properties
        System.clearProperty("socksProxyHost");
        System.clearProperty("socksProxyPort");
        System.clearProperty("socksProxyVersion");
        System.clearProperty("java.net.socks.username");
        System.clearProperty("java.net.socks.password");
        Authenticator.setDefault(null);
        super.onDestroy();
    }
}
