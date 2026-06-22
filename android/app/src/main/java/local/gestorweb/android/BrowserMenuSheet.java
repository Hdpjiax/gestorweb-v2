package local.gestorweb.android;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import com.google.android.material.bottomsheet.BottomSheetDialogFragment;

/**
 * Bottom sheet de acciones del browser.
 * Secciones: Acciones | Spoof / Privacidad | Datos
 */
public final class BrowserMenuSheet extends BottomSheetDialogFragment {

    private static final int BG      = Color.rgb(15, 23, 36);
    private static final int DIVIDER = Color.rgb(42, 57, 83);
    private static final int TEXT    = Color.rgb(238, 244, 252);
    private static final int MUTED   = Color.rgb(143, 156, 178);
    private static final int ACCENT  = Color.rgb(124, 92, 252);
    private static final int WARN    = Color.rgb(239, 68, 68);

    // ── Interfaz → BrowserActivity ─────────────────────────────────────────
    public interface Listener {
        WebView  getWebView();
        String   getCurrentUrl();
        SpoofState getSpoofState();
        void onSpoofChanged();
    }

    /** Estado de spoofs en memoria para la sesión del browser. */
    public static final class SpoofState {
        public boolean desktopMode  = false;
        public boolean darkMode     = false;
        public boolean spoofCanvas  = false;
        public boolean spoofWebGL   = false;
        public boolean blockWebRTC  = false;   // ← NUEVO
        public String  spoofTZ      = null;
        public String  spoofLang    = null;
    }

    private Listener listener;

    public static BrowserMenuSheet newInstance() { return new BrowserMenuSheet(); }

    @Override public void onAttach(Context ctx) {
        super.onAttach(ctx);
        if (ctx instanceof Listener) listener = (Listener) ctx;
    }

    @Override
    public View onCreateView(LayoutInflater inf, ViewGroup parent, Bundle state) {
        Context ctx = requireContext();
        LinearLayout root = new LinearLayout(ctx);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setPadding(dp(16), dp(12), dp(16), dp(32));

        // drag handle
        View handle = new View(ctx);
        handle.setBackgroundColor(DIVIDER);
        LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(dp(40), dp(4));
        hp.gravity = android.view.Gravity.CENTER_HORIZONTAL;
        hp.bottomMargin = dp(16);
        root.addView(handle, hp);

        SpoofState sp = listener != null ? listener.getSpoofState() : new SpoofState();

        // ── Acciones ──────────────────────────────────────────────────────────
        root.addView(sectionLabel(ctx, "Acciones"));
        root.addView(item(ctx, "↗",  "Compartir URL",   ACCENT, this::shareUrl));
        root.addView(item(ctx, "⌘",  "Copiar URL",      TEXT,   this::copyUrl));
        root.addView(item(ctx, "⧉",  "Abrir en navegador externo", TEXT, this::openExternal));
        root.addView(toggleItem(ctx, "⊞", "Modo escritorio",      sp.desktopMode, this::toggleDesktop));
        root.addView(toggleItem(ctx, "◑", "Modo oscuro CSS",       sp.darkMode,    this::toggleDark));

        // ── Spoof / Privacidad ────────────────────────────────────────────────
        root.addView(divider(ctx));
        root.addView(sectionLabel(ctx, "Spoof / Privacidad"));
        root.addView(toggleItem(ctx, "⧩", "Spoof Canvas",          sp.spoofCanvas, this::toggleCanvas));
        root.addView(toggleItem(ctx, "⬡", "Spoof WebGL",           sp.spoofWebGL,  this::toggleWebGL));
        root.addView(toggleItem(ctx, "⛔","Bloquear WebRTC",       sp.blockWebRTC, this::toggleWebRTC));
        root.addView(item(ctx, "🕐", "Spoof Timezone",  MUTED, () -> pickTimezone(ctx)));
        root.addView(item(ctx, "🌐", "Spoof Language",   MUTED, () -> pickLanguage(ctx)));

        // ── Datos ─────────────────────────────────────────────────────────────
        root.addView(divider(ctx));
        root.addView(sectionLabel(ctx, "Datos"));
        root.addView(item(ctx, "🗑", "Limpiar caché y cookies", WARN, this::clearData));

        return root;
    }

    // ════════════════════════════════════════ Acciones ═══════════════════════

    private void shareUrl() {
        if (listener == null) return;
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, listener.getCurrentUrl());
        startActivity(Intent.createChooser(i, "Compartir URL"));
        dismiss();
    }

    private void copyUrl() {
        if (listener == null) return;
        ClipboardManager cm = (ClipboardManager)
                requireContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("url", listener.getCurrentUrl()));
        Toast.makeText(requireContext(), "URL copiada", Toast.LENGTH_SHORT).show();
        dismiss();
    }

    private void openExternal() {
        if (listener == null) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(listener.getCurrentUrl()))); }
        catch (Exception e) { Toast.makeText(requireContext(), "No hay navegador externo", Toast.LENGTH_SHORT).show(); }
        dismiss();
    }

    private void toggleDesktop() {
        if (listener == null) return;
        SpoofState s = listener.getSpoofState();
        s.desktopMode = !s.desktopMode;
        String ua = s.desktopMode
                ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  + "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                : null;
        listener.getWebView().getSettings().setUserAgentString(ua);
        listener.getWebView().reload();
        listener.onSpoofChanged();
        dismiss();
    }

    private void toggleDark() {
        if (listener == null) return;
        listener.getSpoofState().darkMode = !listener.getSpoofState().darkMode;
        listener.onSpoofChanged();
        dismiss();
    }

    // ════════════════════════════════════════ Spoof ══════════════════════════

    private void toggleCanvas()  { toggle(s -> s.spoofCanvas  = !s.spoofCanvas);  }
    private void toggleWebGL()   { toggle(s -> s.spoofWebGL   = !s.spoofWebGL);   }
    private void toggleWebRTC()  { toggle(s -> s.blockWebRTC  = !s.blockWebRTC);  }

    private interface SpoofMutator { void mutate(SpoofState s); }
    private void toggle(SpoofMutator m) {
        if (listener == null) return;
        m.mutate(listener.getSpoofState());
        listener.onSpoofChanged();
        dismiss();
    }

    private static final String[] TZ_LABELS = {
        "Desactivado","America/Mexico_City (CST)","America/New_York (EST)",
        "America/Los_Angeles (PST)","America/Chicago (CST)","Europe/London (GMT)",
        "Europe/Madrid (CET)","Europe/Berlin (CET)","Europe/Moscow (MSK)",
        "Asia/Tokyo (JST)","Asia/Shanghai (CST)","Australia/Sydney (AEST)"
    };
    private static final String[] TZ_IDS = {
        null,"America/Mexico_City","America/New_York","America/Los_Angeles",
        "America/Chicago","Europe/London","Europe/Madrid","Europe/Berlin",
        "Europe/Moscow","Asia/Tokyo","Asia/Shanghai","Australia/Sydney"
    };

    private void pickTimezone(Context ctx) {
        new android.app.AlertDialog.Builder(ctx)
            .setTitle("Spoof Timezone")
            .setItems(TZ_LABELS, (d, w) -> toggle(s -> s.spoofTZ = TZ_IDS[w]))
            .show();
    }

    private static final String[] LANG_LABELS = {
        "Desactivado","es-MX","es-ES","en-US","en-GB",
        "fr-FR","de-DE","pt-BR","it-IT","ja-JP","zh-CN","ru-RU"
    };
    private static final String[] LANG_IDS = {
        null,"es-MX","es-ES","en-US","en-GB",
        "fr-FR","de-DE","pt-BR","it-IT","ja-JP","zh-CN","ru-RU"
    };

    private void pickLanguage(Context ctx) {
        new android.app.AlertDialog.Builder(ctx)
            .setTitle("Spoof Language")
            .setItems(LANG_LABELS, (d, w) -> toggle(s -> s.spoofLang = LANG_IDS[w]))
            .show();
    }

    // ════════════════════════════════════════ Datos ══════════════════════════

    private void clearData() {
        if (listener == null) return;
        WebView wv = listener.getWebView();
        wv.clearCache(true);
        wv.clearHistory();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        Toast.makeText(requireContext(), "Caché y cookies eliminados", Toast.LENGTH_SHORT).show();
        dismiss();
    }

    // ════════════════════════════════════════ UI helpers ═════════════════════

    private View item(Context ctx, String icon, String label, int color, Runnable action) {
        LinearLayout row = row(ctx, action);
        row.addView(iconView(ctx, icon, color));
        row.addView(labelView(ctx, label, color), new LinearLayout.LayoutParams(0, -2, 1));
        return row;
    }

    private View toggleItem(Context ctx, String icon, String label, boolean on, Runnable action) {
        LinearLayout row = row(ctx, action);
        row.addView(iconView(ctx, icon, on ? ACCENT : MUTED));
        row.addView(labelView(ctx, label, on ? TEXT : MUTED), new LinearLayout.LayoutParams(0, -2, 1));
        TextView badge = new TextView(ctx);
        badge.setText(on ? "● Activo" : "○ Inactivo");
        badge.setTextSize(11);
        badge.setTextColor(on ? ACCENT : MUTED);
        row.addView(badge);
        return row;
    }

    private LinearLayout row(Context ctx, Runnable action) {
        LinearLayout r = new LinearLayout(ctx);
        r.setOrientation(LinearLayout.HORIZONTAL);
        r.setPadding(dp(4), dp(14), dp(4), dp(14));
        r.setClickable(true); r.setFocusable(true);
        r.setOnClickListener(v -> action.run());
        return r;
    }

    private TextView iconView(Context ctx, String icon, int color) {
        TextView tv = new TextView(ctx);
        tv.setText(icon); tv.setTextSize(18); tv.setTextColor(color);
        tv.setTypeface(Typeface.DEFAULT_BOLD); tv.setMinWidth(dp(36));
        return tv;
    }

    private TextView labelView(Context ctx, String label, int color) {
        TextView tv = new TextView(ctx);
        tv.setText(label); tv.setTextSize(15); tv.setTextColor(color);
        return tv;
    }

    private TextView sectionLabel(Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text.toUpperCase()); tv.setTextSize(11);
        tv.setTextColor(MUTED); tv.setTypeface(Typeface.DEFAULT_BOLD);
        tv.setLetterSpacing(0.12f);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
        lp.topMargin = dp(4); lp.bottomMargin = dp(6);
        tv.setLayoutParams(lp);
        return tv;
    }

    private View divider(Context ctx) {
        View v = new View(ctx);
        v.setBackgroundColor(DIVIDER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, dp(1));
        lp.topMargin = dp(8); lp.bottomMargin = dp(12);
        v.setLayoutParams(lp);
        return v;
    }

    private int dp(int v) {
        return Math.round(v * requireContext().getResources().getDisplayMetrics().density);
    }
}
