package local.gestorweb.android;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public final class MainActivity extends AppCompatActivity {
    private static final int BG = Color.rgb(9, 13, 19);
    private static final int PANEL = Color.rgb(16, 23, 35);
    private static final int TEXT = Color.rgb(235, 240, 248);
    private static final int MUTED = Color.rgb(130, 145, 166);
    private static final int ACCENT = Color.rgb(124, 92, 252);
    private LicenseStore licenses;
    private ProfileStore profiles;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        licenses = new LicenseStore(this);
        profiles = new ProfileStore(this);
        validateAndRender();
    }

    @Override protected void onResume() {
        super.onResume();
        if (licenses != null && !licenses.license().isEmpty()) validateAndRender();
    }

    private void validateAndRender() {
        String text = licenses.license();
        if (text.isEmpty()) { renderActivation(""); return; }
        renderLoading();
        new Thread(() -> {
            LicenseClient.Result result = LicenseClient.verify(text, licenses.deviceId());
            runOnUiThread(() -> {
                if (result.active) renderDashboard();
                else { licenses.clearLicense(); renderActivation(result.reason); }
            });
        }).start();
    }

    private LinearLayout root() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL); root.setPadding(dp(18), dp(18), dp(18), dp(18)); root.setBackgroundColor(BG);
        return root;
    }
    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this); view.setText(value); view.setTextSize(size); view.setTextColor(color); view.setPadding(0, dp(6), 0, dp(6)); return view;
    }
    private EditText input(String hint) {
        EditText view = new EditText(this); view.setHint(hint); view.setHintTextColor(MUTED); view.setTextColor(TEXT); view.setSingleLine(true); view.setBackgroundColor(PANEL); view.setPadding(dp(14), dp(10), dp(14), dp(10));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(50)); params.setMargins(0, dp(6), 0, dp(6)); view.setLayoutParams(params); return view;
    }
    private Button button(String label) {
        Button view = new Button(this); view.setText(label); view.setTextColor(Color.WHITE); view.setBackgroundColor(ACCENT); return view;
    }

    private void renderLoading() {
        LinearLayout root = root(); TextView label = text("Validando licencia…", 18, TEXT); label.setGravity(Gravity.CENTER); root.addView(label, new LinearLayout.LayoutParams(-1, -1)); setContentView(root);
    }

    private void renderActivation(String error) {
        LinearLayout root = root();
        root.addView(text("Gestor Web  ·  v1.5.0", 22, TEXT));
        root.addView(text("Activación Android", 30, TEXT));
        root.addView(text("ID de este dispositivo", 13, MUTED));
        TextView hwid = text(licenses.deviceId(), 14, TEXT); hwid.setTextIsSelectable(true); root.addView(hwid);
        Button copy = button("COPIAR ID"); copy.setOnClickListener(v -> ((ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("HWID", licenses.deviceId()))); root.addView(copy);
        EditText license = input("Pega aquí la key GW-LIC-V1"); license.setSingleLine(false); license.setMinLines(5); root.addView(license, new LinearLayout.LayoutParams(-1, dp(150)));
        if (!error.isEmpty()) root.addView(text(error, 13, Color.rgb(255, 103, 128)));
        Button activate = button("ACTIVAR"); activate.setOnClickListener(v -> { if (!license.getText().toString().trim().isEmpty()) { licenses.saveLicense(license.getText().toString()); validateAndRender(); } }); root.addView(activate);
        setContentView(root);
    }

    private void renderDashboard() {
        LinearLayout content = root();
        content.addView(text("Gestor Web  ·  Android 1.5.0", 14, MUTED));
        content.addView(text("Perfiles", 30, TEXT));
        EditText name = input("Nombre del perfil"); content.addView(name);
        EditText url = input("URL inicial (vacío = pestaña en blanco)"); content.addView(url);
        EditText proxy = input("Proxy, ej. http://host:puerto"); content.addView(proxy);
        EditText ua = input("User-Agent de plantilla (opcional)"); content.addView(ua);
        Button create = button("+ NUEVO PERFIL"); create.setOnClickListener(v -> { profiles.add(name.getText().toString().trim().isEmpty() ? "Perfil" : name.getText().toString().trim(), url.getText().toString().trim(), proxy.getText().toString().trim(), ua.getText().toString().trim()); renderDashboard(); }); content.addView(create);
        for (ProfileStore.Profile profile : profiles.list()) {
            LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL); card.setPadding(dp(14), dp(12), dp(14), dp(12)); card.setBackgroundColor(PANEL);
            LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(-1, -2); cardParams.setMargins(0, dp(10), 0, 0);
            card.addView(text(profile.name, 19, TEXT)); card.addView(text(profile.proxy.isEmpty() ? "conexión directa" : profile.proxy, 12, MUTED));
            Button open = button("ABRIR"); open.setOnClickListener(v -> { Intent intent = new Intent(this, BrowserActivity.class); intent.putExtra("profileId", profile.id); startActivity(intent); }); card.addView(open);
            Button remove = button("ELIMINAR"); remove.setOnClickListener(v -> { profiles.remove(profile.id); renderDashboard(); }); card.addView(remove);
            content.addView(card, cardParams);
        }
        ScrollView scroll = new ScrollView(this); scroll.addView(content); setContentView(scroll);
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
