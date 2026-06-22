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
import java.util.List;
import java.util.concurrent.Executor;

public final class BrowserActivity extends AppCompatActivity {
    private static final int BG = Color.rgb(7, 10, 16);
    private static final int PANEL = Color.rgb(15, 23, 36);
    private static final int PANEL_2 = Color.rgb(20, 31, 48);
    private static final int BORDER = Color.rgb(42, 57, 83);
    private static final int TEXT = Color.rgb(238, 244, 252);
    private static final int MUTED = Color.rgb(143, 156, 178);
    private static final int ACCENT = Color.rgb(124, 92, 252);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Executor direct = Runnable::run;
    private WebView webView;
    private EditText address;
    private ProfileStore.Profile profile;
    private LicenseStore licenses;
    private final Runnable licenseCheck = new Runnable() {
        @Override public void run() {
            new Thread(() -> {
                LicenseClient.Result result = LicenseClient.verify(BrowserActivity.this, licenses.license(), licenses.deviceId());
                runOnUiThread(() -> {
                    if (!result.active) {
                        licenses.clearLicense();
                        startActivity(new Intent(BrowserActivity.this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));
                        finish();
                    } else handler.postDelayed(this, 60_000);
                });
            }).start();
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        licenses = new LicenseStore(this);
        String profileId = getIntent().getStringExtra("profileId");
        List<ProfileStore.Profile> profiles = new ProfileStore(this).list();
        for (ProfileStore.Profile item : profiles) if (item.id.equals(profileId)) profile = item;
        if (profile == null || licenses.license().isEmpty()) { finish(); return; }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setPadding(dp(8), dp(8), dp(8), dp(8));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(dp(10), dp(8), dp(10), dp(8));
        header.setBackground(rounded(PANEL, dp(18), BORDER));
        TextView name = text(profile.name, 16, TEXT, true);
        TextView meta = text("Modo " + profile.privacyMode + (profile.proxy.isEmpty() ? " · directo" : " · proxy activo"), 12, MUTED, false);
        header.addView(name);
        header.addView(meta);
        root.addView(header, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setPadding(0, dp(8), 0, dp(8));
        Button back = smallButton("‹");
        back.setOnClickListener(v -> { if (webView.canGoBack()) webView.goBack(); });
        toolbar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(48)));
        Button refresh = smallButton("↻");
        refresh.setOnClickListener(v -> webView.reload());
        LinearLayout.LayoutParams rParams = new LinearLayout.LayoutParams(dp(48), dp(48));
        rParams.setMargins(dp(6), 0, dp(6), 0);
        toolbar.addView(refresh, rParams);
        address = new EditText(this);
        address.setSingleLine(true);
        address.setTextColor(TEXT);
        address.setHintTextColor(MUTED);
        address.setBackground(rounded(PANEL_2, dp(14), BORDER));
        address.setPadding(dp(12), 0, dp(12), 0);
        address.setOnEditorActionListener((v, actionId, event) -> { navigate(address.getText().toString()); return true; });
        toolbar.addView(address, new LinearLayout.LayoutParams(0, dp(48), 1));
        root.addView(toolbar, new LinearLayout.LayoutParams(-1, -2));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(16, 20, 28));
        configureWebView();
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        applyProxyAndOpen();
        handler.postDelayed(licenseCheck, 60_000);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setGeolocationEnabled(false);
        settings.setSaveFormData(false);
        settings.setMixedContentMode(profile.privacyMode.equals(ProfileStore.MODE_COMPAT) ? WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE : WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(profile.privacyMode.equals(ProfileStore.MODE_STRICT) ? WebSettings.LOAD_NO_CACHE : WebSettings.LOAD_DEFAULT);
        if (!profile.userAgent.isEmpty()) settings.setUserAgentString(profile.userAgent);
        CookieManager.getInstance().setAcceptCookie(!profile.privacyMode.equals(ProfileStore.MODE_STRICT));
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, profile.privacyMode.equals(ProfileStore.MODE_COMPAT));
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return false; }
            @Override public void onPageFinished(WebView view, String url) { address.setText(url); }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler sslHandler, SslError error) { sslHandler.cancel(); }
        });
    }

    private void applyProxyAndOpen() {
        if (profile.proxy.isEmpty() || !WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) { navigate(profile.url); return; }
        String proxy = profile.proxy.contains("://") ? profile.proxy : "http://" + profile.proxy;
        ProxyConfig config = new ProxyConfig.Builder().addProxyRule(proxy).addDirect().build();
        ProxyController.getInstance().setProxyOverride(config, direct, () -> navigate(profile.url));
    }

    private void navigate(String raw) {
        String value = raw == null || raw.trim().isEmpty() ? "about:blank" : raw.trim();
        if (!value.equals("about:blank") && Uri.parse(value).getScheme() == null) value = "https://" + value;
        address.setText(value); webView.loadUrl(value);
    }

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

    @Override protected void onDestroy() {
        handler.removeCallbacks(licenseCheck);
        if (webView != null) { webView.stopLoading(); webView.destroy(); }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) ProxyController.getInstance().clearProxyOverride(direct, () -> {});
        super.onDestroy();
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
