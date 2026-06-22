package local.gestorweb.android;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.ProxyConfig;
import androidx.webkit.ProxyController;
import androidx.webkit.WebViewFeature;
import java.util.List;
import java.util.concurrent.Executor;

public final class BrowserActivity extends AppCompatActivity {
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

        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.rgb(9, 13, 19));
        LinearLayout toolbar = new LinearLayout(this); toolbar.setOrientation(LinearLayout.HORIZONTAL); toolbar.setPadding(4, 4, 4, 4);
        Button back = new Button(this); back.setText("‹"); back.setOnClickListener(v -> { if (webView.canGoBack()) webView.goBack(); }); toolbar.addView(back, new LinearLayout.LayoutParams(58, 58));
        Button refresh = new Button(this); refresh.setText("↻"); refresh.setOnClickListener(v -> webView.reload()); toolbar.addView(refresh, new LinearLayout.LayoutParams(58, 58));
        address = new EditText(this); address.setSingleLine(true); address.setTextColor(Color.WHITE); address.setHintTextColor(Color.GRAY); address.setBackgroundColor(Color.rgb(20, 27, 38));
        address.setOnEditorActionListener((v, actionId, event) -> { navigate(address.getText().toString()); return true; }); toolbar.addView(address, new LinearLayout.LayoutParams(0, 58, 1));
        root.addView(toolbar, new LinearLayout.LayoutParams(-1, 66));

        webView = new WebView(this); webView.setBackgroundColor(Color.rgb(16, 20, 28));
        webView.getSettings().setJavaScriptEnabled(true); webView.getSettings().setDomStorageEnabled(true); webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setSupportMultipleWindows(true);
        if (!profile.userAgent.isEmpty()) webView.getSettings().setUserAgentString(profile.userAgent);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return false; }
            @Override public void onPageFinished(WebView view, String url) { address.setText(url); }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler sslHandler, SslError error) { sslHandler.cancel(); }
        });
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1)); setContentView(root);
        applyProxyAndOpen();
        handler.postDelayed(licenseCheck, 60_000);
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

    @Override protected void onDestroy() {
        handler.removeCallbacks(licenseCheck);
        if (webView != null) { webView.stopLoading(); webView.destroy(); }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) ProxyController.getInstance().clearProxyOverride(direct, () -> {});
        super.onDestroy();
    }
}
