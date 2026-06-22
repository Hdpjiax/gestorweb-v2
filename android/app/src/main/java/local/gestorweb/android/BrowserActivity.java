package local.gestorweb.android;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
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

public final class BrowserActivity extends AppCompatActivity
        implements BrowserMenuSheet.Listener {

    private static final int BG      = Color.rgb(7, 10, 16);
    private static final int PANEL   = Color.rgb(15, 23, 36);
    private static final int PANEL_2 = Color.rgb(20, 31, 48);
    private static final int BORDER  = Color.rgb(42, 57, 83);
    private static final int TEXT    = Color.rgb(238, 244, 252);
    private static final int MUTED   = Color.rgb(143, 156, 178);
    private static final int ACCENT  = Color.rgb(124, 92, 252);

    private final Handler  handler = new Handler(Looper.getMainLooper());
    private final Executor direct  = Runnable::run;

    private WebView  webView;
    private EditText address;
    private ProfileStore.Profile        profile;
    private LicenseStore                licenses;
    private BrowserMenuSheet.SpoofState spoofState = new BrowserMenuSheet.SpoofState();

    // ── licenseCheck ─────────────────────────────────────────────────────────
    private final Runnable licenseCheck = new Runnable() {
        @Override public void run() {
            new Thread(() -> {
                LicenseClient.Result r = LicenseClient.verify(
                        BrowserActivity.this, licenses.license(), licenses.deviceId());
                runOnUiThread(() -> {
                    if (!r.active) {
                        licenses.clearLicense();
                        startActivity(new Intent(BrowserActivity.this, MainActivity.class)
                                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));
                        finish();
                    } else handler.postDelayed(this, 15_000);
                });
            }).start();
        }
    };

    // ── onCreate ──────────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        licenses = new LicenseStore(this);

        String profileId = getIntent().getStringExtra("profileId");
        List<ProfileStore.Profile> profiles = new ProfileStore(this).list();
        for (ProfileStore.Profile item : profiles)
            if (item.id.equals(profileId)) profile = item;
        if (profile == null || licenses.license().isEmpty()) { finish(); return; }

        // ── Layout ────────────────────────────────────────────────────────────
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setPadding(dp(8), dp(8), dp(8), dp(8));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(dp(10), dp(8), dp(10), dp(8));
        header.setBackground(rounded(PANEL, dp(18), BORDER));
        header.addView(text(profile.name, 16, TEXT, true));
        header.addView(text(
                "Modo " + profile.privacyMode
                + (profile.proxy.isEmpty() ? " · directo" : " · proxy activo")
                + " · " + profile.engine,
                12, MUTED, false));
        root.addView(header, new LinearLayout.LayoutParams(-1, -2));

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
        address.setOnEditorActionListener((v, id, ev) -> {
            navigate(address.getText().toString()); return true;
        });
        toolbar.addView(address, new LinearLayout.LayoutParams(0, dp(48), 1));

        Button more = smallButton("⋯");
        LinearLayout.LayoutParams mp = new LinearLayout.LayoutParams(dp(48), dp(48));
        mp.setMargins(dp(6), 0, 0, 0);
        more.setOnClickListener(v -> openMenu());
        toolbar.addView(more, mp);

        root.addView(toolbar, new LinearLayout.LayoutParams(-1, -2));

        // ── WebView vía BrowserEngineFactory ──────────────────────────────────
        BrowserEngineFactory.Result engine = BrowserEngineFactory.create(
                this, profile, url -> {
                    address.setText(url);
                    // Re-inyectar todos los spoofs activos en cada página
                    SpoofInjector.apply(webView, spoofState);
                });
        webView = engine.webView;
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));

        setContentView(root);
        applyProxyAndOpen();
        handler.postDelayed(licenseCheck, 15_000);
    }

    @Override protected void onDestroy() {
        handler.removeCallbacks(licenseCheck);
        if (webView != null) { webView.stopLoading(); webView.destroy(); }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE))
            ProxyController.getInstance().clearProxyOverride(direct, () -> {});
        super.onDestroy();
    }

    // ── BrowserMenuSheet.Listener ─────────────────────────────────────────────

    @Override public WebView getWebView()    { return webView; }
    @Override public String  getCurrentUrl() {
        String u = webView.getUrl();
        return u != null ? u : address.getText().toString();
    }
    @Override public BrowserMenuSheet.SpoofState getSpoofState() { return spoofState; }
    @Override public void onSpoofChanged() { SpoofInjector.apply(webView, spoofState); }

    // ── Proxy + navegación ────────────────────────────────────────────────────

    private void applyProxyAndOpen() {
        if (profile.proxy.isEmpty()
                || !WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) {
            navigate(profile.url);
            return;
        }
        String raw = profile.proxy.contains("://") ? profile.proxy : "http://" + profile.proxy;
        ProxyConfig cfg = new ProxyConfig.Builder()
                .addProxyRule(raw).addDirect().build();
        ProxyController.getInstance().setProxyOverride(cfg, direct, () -> navigate(profile.url));
    }

    private void navigate(String raw) {
        String v = (raw == null || raw.trim().isEmpty()) ? "about:blank" : raw.trim();
        if (!v.equals("about:blank") && Uri.parse(v).getScheme() == null) v = "https://" + v;
        address.setText(v);
        webView.loadUrl(v);
    }

    private void openMenu() {
        BrowserMenuSheet.newInstance().show(getSupportFragmentManager(), "browser_menu");
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value); view.setTextSize(size); view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        return view;
    }

    private Button smallButton(String label) {
        Button b = new Button(this);
        b.setText(label); b.setTextColor(Color.WHITE);
        b.setTextSize(20); b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setBackground(rounded(ACCENT, dp(14), 0));
        return b;
    }

    private GradientDrawable rounded(int color, int radius, int stroke) {
        GradientDrawable s = new GradientDrawable();
        s.setColor(color); s.setCornerRadius(radius);
        if (stroke != 0) s.setStroke(dp(1), stroke);
        return s;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
