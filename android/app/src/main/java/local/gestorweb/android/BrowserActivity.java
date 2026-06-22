package local.gestorweb.android;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.HttpAuthHandler;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.ProxyConfig;
import androidx.webkit.ProxyController;
import androidx.webkit.Profile;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.io.ByteArrayInputStream;
import java.net.Authenticator;
import java.net.PasswordAuthentication;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executor;

public final class BrowserActivity extends AppCompatActivity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Executor direct = Runnable::run;
    private WebView webView;
    private EditText address;
    private ProgressBar progress;
    private ProfileStore.Profile profile;
    private LicenseStore licenses;
    private HistoryStore history;
    private boolean proxyApplied;
    private Profile webProfile;

    private final Runnable licenseCheck = new Runnable() {
        @Override public void run() {
            new Thread(() -> {
                LicenseClient.Result result = LicenseClient.verify(BrowserActivity.this, licenses.license(), licenses.deviceId());
                runOnUiThread(() -> {
                    if (!result.active) { licenses.clearLicense(); startActivity(new Intent(BrowserActivity.this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)); finish(); }
                    else handler.postDelayed(this, 60_000);
                });
            }).start();
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_browser);
        licenses = new LicenseStore(this); history = new HistoryStore(this);
        profile = new ProfileStore(this).findById(getIntent().getStringExtra("profileId"));
        if (profile == null || licenses.license().isEmpty()) { finish(); return; }
        address = findViewById(R.id.browserAddress); progress = findViewById(R.id.browserProgress); webView = findViewById(R.id.browserWebView);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
            WebViewCompat.setProfile(webView, "gw_" + profile.id.replaceAll("[^a-zA-Z0-9_]", "_"));
            webProfile = WebViewCompat.getProfile(webView);
        }
        ((TextView)findViewById(R.id.browserProfileName)).setText(profile.name);
        ((TextView)findViewById(R.id.browserRoute)).setText(profile.torMode ? "TOR · ORBOT" : profile.hasProxy() ? profile.proxyType + " · PROXY" : "DIRECTO");
        findViewById(R.id.browserBack).setOnClickListener(v -> { if (webView.canGoBack()) webView.goBack(); });
        findViewById(R.id.browserForward).setOnClickListener(v -> { if (webView.canGoForward()) webView.goForward(); });
        findViewById(R.id.browserReload).setOnClickListener(v -> webView.reload());
        address.setOnEditorActionListener((v, action, event) -> { navigate(address.getText().toString()); return true; });
        configureWebView(); applyProxyAndOpen(); handler.postDelayed(licenseCheck, 60_000);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(!profile.inMemory); settings.setDatabaseEnabled(!profile.inMemory);
        settings.setGeolocationEnabled(false); settings.setSaveFormData(false); settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(profile.forceHttps || !profile.compatMode ? WebSettings.MIXED_CONTENT_NEVER_ALLOW : WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setCacheMode(profile.inMemory ? WebSettings.LOAD_NO_CACHE : WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(profile.effectiveUserAgent());
        CookieManager cookies = webProfile != null ? webProfile.getCookieManager() : CookieManager.getInstance(); cookies.setAcceptCookie(!profile.inMemory); cookies.setAcceptThirdPartyCookies(webView, profile.compatMode && !profile.antiLeak);

        String documentStart = SpoofInjector.buildScript(profile);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, documentStart, Collections.singleton("*"));
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); progress.setVisibility(value >= 100 ? View.GONE : View.VISIBLE); }
            @Override public void onPermissionRequest(PermissionRequest request) { if (profile.antiLeak || profile.webrtcBlock) request.deny(); else request.grant(request.getResources()); }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                address.setText(url); progress.setVisibility(View.VISIBLE);
                history.add(profile, "GET", url, "navigation");
                if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) view.evaluateJavascript(documentStart, null);
            }
            @Override public void onPageFinished(WebView view, String url) { address.setText(url); progress.setVisibility(View.GONE); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String original = request.getUrl().toString(); String safe = normalizeUrl(original);
                if (!safe.equals(original)) { loadWithProfileHeaders(safe); return true; }
                return false;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (profile.harEnabled) history.add(profile, request.getMethod(), url, request.isForMainFrame() ? "document" : "resource");
                if (profile.blockTrackers && TrackerBlocker.blocked(url)) return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                return null;
            }
            @Override public void onReceivedHttpAuthRequest(WebView view, HttpAuthHandler auth, String host, String realm) {
                if (profile.hasProxyAuth()) auth.proceed(profile.proxyUser, profile.proxyPass); else super.onReceivedHttpAuthRequest(view, auth, host, realm);
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler ssl, SslError error) {
                if (profile.hasProxy() || profile.torMode) ssl.proceed(); else ssl.cancel();
            }
        });
    }

    private void applyProxyAndOpen() {
        String route = profile.torMode ? "socks://127.0.0.1:9050" : profile.proxyUri();
        if (route.isEmpty()) { navigate(profile.url); return; }
        if (profile.hasProxyAuth()) Authenticator.setDefault(new Authenticator() {
            @Override protected PasswordAuthentication getPasswordAuthentication() { return new PasswordAuthentication(profile.proxyUser, profile.proxyPass.toCharArray()); }
        });
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) { Toast.makeText(this, "Este WebView no soporta proxy override", Toast.LENGTH_LONG).show(); navigate(profile.url); return; }
        try {
            ProxyConfig config = new ProxyConfig.Builder().addProxyRule(route).build();
            ProxyController.getInstance().setProxyOverride(config, direct, () -> { proxyApplied = true; navigate(profile.url); });
        } catch (Exception error) { Toast.makeText(this, "Proxy no compatible: " + error.getMessage(), Toast.LENGTH_LONG).show(); navigate("about:blank"); }
    }

    private void navigate(String raw) { loadWithProfileHeaders(normalizeUrl(raw == null || raw.trim().isEmpty() ? "about:blank" : raw.trim())); }
    private String normalizeUrl(String raw) {
        String value = raw;
        if (!value.equals("about:blank") && Uri.parse(value).getScheme() == null) value = "https://" + value;
        if (profile.stripTrackingParams) value = TrackerBlocker.stripTracking(value);
        if (profile.forceHttps && value.startsWith("http://")) value = "https://" + value.substring(7);
        return value;
    }
    private void loadWithProfileHeaders(String url) {
        address.setText(url); Map<String,String> headers = new HashMap<>(); headers.put("DNT", "1"); headers.put("Sec-GPC", "1");
        if (profile.strictReferer) headers.put("Referer", "");
        webView.loadUrl(url, headers);
    }

    @Override public void finish() { super.finish(); overridePendingTransition(android.R.anim.fade_in, R.anim.slide_out_left); }
    @Override protected void onDestroy() {
        handler.removeCallbacks(licenseCheck);
        if (webView != null) {
            webView.stopLoading();
            if (profile != null && (profile.inMemory || profile.autoWipeClose)) {
                webView.clearHistory(); webView.clearCache(true); webView.clearFormData();
                CookieManager cookies = webProfile != null ? webProfile.getCookieManager() : CookieManager.getInstance(); cookies.removeAllCookies(null); cookies.flush();
                if (webProfile != null) webProfile.getWebStorage().deleteAllData(); else WebStorage.getInstance().deleteAllData();
            }
            webView.destroy();
        }
        if (proxyApplied && WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) ProxyController.getInstance().clearProxyOverride(direct, () -> {});
        Authenticator.setDefault(null); super.onDestroy();
    }
}
