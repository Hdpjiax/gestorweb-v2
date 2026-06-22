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
 * Secciones: Acciones | Spoof | Datos
 */
public final class BrowserMenuSheet extends BottomSheetDialogFragment {

    // ── colores (mismos tokens que BrowserActivity) ──────────────────────────
    private static final int BG      = Color.rgb(15, 23, 36);
    private static final int SURFACE = Color.rgb(20, 31, 48);
    private static final int DIVIDER = Color.rgb(42, 57, 83);
    private static final int TEXT    = Color.rgb(238, 244, 252);
    private static final int MUTED   = Color.rgb(143, 156, 178);
    private static final int ACCENT  = Color.rgb(124, 92, 252);
    private static final int WARN    = Color.rgb(239, 68, 68);

    // ── callback hacia BrowserActivity ───────────────────────────────────────
    public interface Listener {
        WebView getWebView();
        String  getCurrentUrl();
        SpoofState getSpoofState();
        /** Llamado cuando un spoof cambia; la Activity re-inyecta el JS. */
        void onSpoofChanged();
    }

    /** Estado de los spoofs — vive en memoria durante la sesión del browser. */
    public static final class SpoofState {
        public boolean desktopMode  = false;
        public boolean darkMode     = false;
        public boolean spoofCanvas  = false;
        public boolean spoofWebGL   = false;
        public String  spoofTZ      = null;   // null = no activo
        public String  spoofLang    = null;   // null = no activo
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

        // ── drag handle ───────────────────────────────────────────────────────
        View handle = new View(ctx);
        handle.setBackgroundColor(DIVIDER);
        LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(dp(40), dp(4));
        hp.gravity = android.view.Gravity.CENTER_HORIZONTAL;
        hp.bottomMargin = dp(16);
        root.addView(handle, hp);

        // ── sección: Acciones ─────────────────────────────────────────────────
        root.addView(sectionLabel(ctx, "Acciones"));
        root.addView(item(ctx, "↗",  "Compartir URL",   ACCENT, () -> shareUrl()));
        root.addView(item(ctx, "⎘",  "Copiar URL",      TEXT,   () -> copyUrl()));
        root.addView(item(ctx, "⧉",  "Abrir en navegador externo", TEXT, () -> openExternal()));
        root.addView(toggleItem(ctx, "⊞", "Modo escritorio",
                listener != null && listener.getSpoofState().desktopMode,
                () -> toggleDesktop()));
        root.addView(toggleItem(ctx, "◑", "Inyectar modo oscuro",
                listener != null && listener.getSpoofState().darkMode,
                () -> toggleDark()));

        // ── sección: Spoof ────────────────────────────────────────────────────
        root.addView(divider(ctx));
        root.addView(sectionLabel(ctx, "Spoof / Privacidad"));
        root.addView(toggleItem(ctx, "⧩", "Spoof Canvas",
                listener != null && listener.getSpoofState().spoofCanvas,
                () -> toggleCanvas()));
        root.addView(toggleItem(ctx, "⬡", "Spoof WebGL",
                listener != null && listener.getSpoofState().spoofWebGL,
                () -> toggleWebGL()));
        root.addView(item(ctx, "🕐", "Spoof Timezone",  MUTED, () -> pickTimezone(ctx)));
        root.addView(item(ctx, "🌐", "Spoof Language",   MUTED, () -> pickLanguage(ctx)));

        // ── sección: Datos ────────────────────────────────────────────────────
        root.addView(divider(ctx));
        root.addView(sectionLabel(ctx, "Datos"));
        root.addView(item(ctx, "🗑", "Limpiar caché y cookies", WARN, () -> clearData()));

        return root;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Acciones
    // ═════════════════════════════════════════════════════════════════════════

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
        ClipboardManager cm = (ClipboardManager) requireContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("url", listener.getCurrentUrl()));
        Toast.makeText(requireContext(), "URL copiada", Toast.LENGTH_SHORT).show();
        dismiss();
    }

    private void openExternal() {
        if (listener == null) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(listener.getCurrentUrl())));
        } catch (Exception e) {
            Toast.makeText(requireContext(), "No se encontró navegador externo", Toast.LENGTH_SHORT).show();
        }
        dismiss();
    }

    private void toggleDesktop() {
        if (listener == null) return;
        SpoofState s = listener.getSpoofState();
        s.desktopMode = !s.desktopMode;
        WebView wv = listener.getWebView();
        String ua = s.desktopMode
                ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                : "";
        wv.getSettings().setUserAgentString(ua.isEmpty() ? null : ua);
        wv.reload();
        listener.onSpoofChanged();
        dismiss();
    }

    private void toggleDark() {
        if (listener == null) return;
        SpoofState s = listener.getSpoofState();
        s.darkMode = !s.darkMode;
        WebView wv = listener.getWebView();
        if (s.darkMode) {
            wv.evaluateJavascript(
                "(function(){"
                + "  if(document.getElementById('__gw_dark'))return;"
                + "  var el=document.createElement('style');"
                + "  el.id='__gw_dark';"
                + "  el.textContent='html{filter:invert(1) hue-rotate(180deg)!important}'"
                + "  + 'img,video,canvas,iframe{filter:invert(1) hue-rotate(180deg)!important}';"
                + "  document.head.appendChild(el);"
                + "})()", null);
        } else {
            wv.evaluateJavascript(
                "(function(){"
                + "  var el=document.getElementById('__gw_dark');"
                + "  if(el)el.remove();"
                + "})()", null);
        }
        listener.onSpoofChanged();
        dismiss();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Spoofs
    // ═════════════════════════════════════════════════════════════════════════

    private void toggleCanvas() {
        if (listener == null) return;
        listener.getSpoofState().spoofCanvas = !listener.getSpoofState().spoofCanvas;
        listener.onSpoofChanged();
        dismiss();
    }

    private void toggleWebGL() {
        if (listener == null) return;
        listener.getSpoofState().spoofWebGL = !listener.getSpoofState().spoofWebGL;
        listener.onSpoofChanged();
        dismiss();
    }

    private static final String[] TZ_LABELS = {
        "Desactivado",
        "America/Mexico_City (CST)",
        "America/New_York (EST)",
        "America/Los_Angeles (PST)",
        "America/Chicago (CST)",
        "Europe/London (GMT)",
        "Europe/Madrid (CET)",
        "Europe/Berlin (CET)",
        "Europe/Moscow (MSK)",
        "Asia/Tokyo (JST)",
        "Asia/Shanghai (CST)",
        "Australia/Sydney (AEST)"
    };
    private static final String[] TZ_IDS = {
        null,
        "America/Mexico_City",
        "America/New_York",
        "America/Los_Angeles",
        "America/Chicago",
        "Europe/London",
        "Europe/Madrid",
        "Europe/Berlin",
        "Europe/Moscow",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Australia/Sydney"
    };

    private void pickTimezone(Context ctx) {
        new android.app.AlertDialog.Builder(ctx)
            .setTitle("Spoof Timezone")
            .setItems(TZ_LABELS, (d, which) -> {
                if (listener == null) return;
                listener.getSpoofState().spoofTZ = TZ_IDS[which];
                listener.onSpoofChanged();
                dismiss();
            })
            .show();
    }

    private static final String[] LANG_LABELS = {
        "Desactivado",
        "es-MX (Español México)",
        "es-ES (Español España)",
        "en-US (English US)",
        "en-GB (English UK)",
        "fr-FR (Français)",
        "de-DE (Deutsch)",
        "pt-BR (Português BR)",
        "it-IT (Italiano)",
        "ja-JP (日本語)",
        "zh-CN (中文简体)",
        "ru-RU (Русский)"
    };
    private static final String[] LANG_IDS = {
        null,
        "es-MX", "es-ES", "en-US", "en-GB",
        "fr-FR", "de-DE", "pt-BR", "it-IT",
        "ja-JP", "zh-CN", "ru-RU"
    };

    private void pickLanguage(Context ctx) {
        new android.app.AlertDialog.Builder(ctx)
            .setTitle("Spoof Language")
            .setItems(LANG_LABELS, (d, which) -> {
                if (listener == null) return;
                listener.getSpoofState().spoofLang = LANG_IDS[which];
                listener.onSpoofChanged();
                dismiss();
            })
            .show();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Datos
    // ═════════════════════════════════════════════════════════════════════════

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

    // ═════════════════════════════════════════════════════════════════════════
    // Helpers de UI
    // ═════════════════════════════════════════════════════════════════════════

    private View item(Context ctx, String icon, String label, int labelColor, Runnable action) {
        LinearLayout row = new LinearLayout(ctx);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(dp(4), dp(14), dp(4), dp(14));
        row.setClickable(true);
        row.setFocusable(true);
        row.setOnClickListener(v -> action.run());

        TextView ico = new TextView(ctx);
        ico.setText(icon);
        ico.setTextSize(18);
        ico.setTextColor(labelColor);
        ico.setTypeface(Typeface.DEFAULT_BOLD);
        ico.setMinWidth(dp(36));
        row.addView(ico);

        TextView lbl = new TextView(ctx);
        lbl.setText(label);
        lbl.setTextSize(15);
        lbl.setTextColor(labelColor);
        row.addView(lbl, new LinearLayout.LayoutParams(0, -2, 1));

        return row;
    }

    private View toggleItem(Context ctx, String icon, String label, boolean active, Runnable action) {
        LinearLayout row = new LinearLayout(ctx);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(dp(4), dp(14), dp(4), dp(14));
        row.setClickable(true);
        row.setFocusable(true);
        row.setOnClickListener(v -> action.run());

        TextView ico = new TextView(ctx);
        ico.setText(icon);
        ico.setTextSize(18);
        ico.setTextColor(active ? ACCENT : MUTED);
        ico.setTypeface(Typeface.DEFAULT_BOLD);
        ico.setMinWidth(dp(36));
        row.addView(ico);

        TextView lbl = new TextView(ctx);
        lbl.setText(label);
        lbl.setTextSize(15);
        lbl.setTextColor(active ? TEXT : MUTED);
        row.addView(lbl, new LinearLayout.LayoutParams(0, -2, 1));

        TextView badge = new TextView(ctx);
        badge.setText(active ? "● Activo" : "○ Inactivo");
        badge.setTextSize(11);
        badge.setTextColor(active ? ACCENT : MUTED);
        row.addView(badge);

        return row;
    }

    private TextView sectionLabel(Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text.toUpperCase());
        tv.setTextSize(11);
        tv.setTextColor(MUTED);
        tv.setTypeface(Typeface.DEFAULT_BOLD);
        tv.setLetterSpacing(0.12f);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
        lp.topMargin = dp(4);
        lp.bottomMargin = dp(6);
        tv.setLayoutParams(lp);
        return tv;
    }

    private View divider(Context ctx) {
        View v = new View(ctx);
        v.setBackgroundColor(DIVIDER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, dp(1));
        lp.topMargin = dp(8);
        lp.bottomMargin = dp(12);
        v.setLayoutParams(lp);
        return v;
    }

    private int dp(int value) {
        return Math.round(value * requireContext().getResources().getDisplayMetrics().density);
    }
}
