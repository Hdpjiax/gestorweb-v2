package local.gestorweb.android;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import java.util.List;

public final class MainActivity extends AppCompatActivity {
    private static final int BG = Color.rgb(7, 10, 16);
    private static final int PANEL = Color.rgb(15, 23, 36);
    private static final int PANEL_2 = Color.rgb(20, 31, 48);
    private static final int BORDER = Color.rgb(42, 57, 83);
    private static final int TEXT = Color.rgb(238, 244, 252);
    private static final int MUTED = Color.rgb(143, 156, 178);
    private static final int ACCENT = Color.rgb(124, 92, 252);
    private static final int ACCENT_2 = Color.rgb(38, 198, 218);
    private static final int DANGER = Color.rgb(255, 103, 128);
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
            LicenseClient.Result result = LicenseClient.verify(this, text, licenses.deviceId());
            runOnUiThread(() -> {
                if (result.active) renderDashboard();
                else { licenses.clearLicense(); renderActivation(result.reason); }
            });
        }).start();
    }

    private LinearLayout baseRoot() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(16), dp(18), dp(16), dp(18));
        root.setBackgroundColor(BG);
        return root;
    }

    private TextView label(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setPadding(0, dp(3), 0, dp(3));
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        return view;
    }

    private LinearLayout card() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(14), dp(16), dp(14));
        card.setBackground(rounded(PANEL, dp(18), BORDER));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, dp(10), 0, 0);
        card.setLayoutParams(params);
        return card;
    }

    private GradientDrawable rounded(int color, int radius, int strokeColor) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(color);
        shape.setCornerRadius(radius);
        if (strokeColor != 0) shape.setStroke(dp(1), strokeColor);
        return shape;
    }

    private EditText input(String hint) {
        EditText view = new EditText(this);
        view.setHint(hint);
        view.setHintTextColor(MUTED);
        view.setTextColor(TEXT);
        view.setSingleLine(true);
        view.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        view.setBackground(rounded(PANEL_2, dp(14), BORDER));
        view.setPadding(dp(14), dp(10), dp(14), dp(10));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(52));
        params.setMargins(0, dp(8), 0, 0);
        view.setLayoutParams(params);
        return view;
    }

    private Button button(String label) {
        Button view = new Button(this);
        view.setText(label);
        view.setTextColor(Color.WHITE);
        view.setTypeface(Typeface.DEFAULT_BOLD);
        view.setBackground(rounded(ACCENT, dp(14), 0));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(52));
        params.setMargins(0, dp(10), 0, 0);
        view.setLayoutParams(params);
        return view;
    }

    private Button ghostButton(String label) {
        Button view = button(label);
        view.setBackground(rounded(PANEL_2, dp(14), BORDER));
        return view;
    }

    private Spinner modeSpinner() {
        Spinner spinner = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, new String[] {
            ProfileStore.MODE_COMPAT,
            ProfileStore.MODE_PRIVATE,
            ProfileStore.MODE_STRICT
        });
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        spinner.setBackground(rounded(PANEL_2, dp(14), BORDER));
        spinner.setPadding(dp(10), 0, dp(10), 0);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(52));
        params.setMargins(0, dp(8), 0, 0);
        spinner.setLayoutParams(params);
        return spinner;
    }

    private LinearLayout row() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        return row;
    }

    private TextView pill(String text, int color) {
        TextView pill = label(text, 12, Color.WHITE, true);
        pill.setGravity(Gravity.CENTER);
        pill.setPadding(dp(10), dp(5), dp(10), dp(5));
        pill.setBackground(rounded(color, dp(20), 0));
        return pill;
    }

    private void renderLoading() {
        LinearLayout root = baseRoot();
        root.setGravity(Gravity.CENTER);
        root.addView(label("Gestor Web", 28, TEXT, true));
        root.addView(label("Validando licencia y sesión segura…", 15, MUTED, false));
        setContentView(root);
    }

    private void renderActivation(String error) {
        LinearLayout root = baseRoot();
        root.addView(label("GESTOR WEB", 13, ACCENT_2, true));
        root.addView(label("Activación Android", 32, TEXT, true));
        root.addView(label("Conecta este dispositivo al mismo sistema de licencias de escritorio.", 15, MUTED, false));

        LinearLayout device = card();
        device.addView(label("ID de este dispositivo", 13, MUTED, true));
        TextView hwid = label(licenses.deviceId(), 15, TEXT, true);
        hwid.setTextIsSelectable(true);
        device.addView(hwid);
        Button copy = ghostButton("COPIAR HWID");
        copy.setOnClickListener(v -> ((ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("HWID", licenses.deviceId())));
        device.addView(copy);
        root.addView(device);

        LinearLayout form = card();
        form.addView(label("Licencia", 20, TEXT, true));
        form.addView(label("Pega la key GW-LIC-V1 generada desde el panel admin.", 13, MUTED, false));
        EditText license = input("Pega aquí la licencia GW-LIC-V1");
        license.setSingleLine(false);
        license.setMinLines(5);
        form.addView(license, new LinearLayout.LayoutParams(-1, dp(150)));
        if (!error.isEmpty()) form.addView(label(error, 13, DANGER, true));
        Button activate = button("ACTIVAR LICENCIA");
        activate.setOnClickListener(v -> {
            if (!license.getText().toString().trim().isEmpty()) {
                licenses.saveLicense(license.getText().toString());
                validateAndRender();
            }
        });
        form.addView(activate);
        root.addView(form);

        setContentView(root);
    }

    private void renderDashboard() {
        List<ProfileStore.Profile> list = profiles.list();
        LinearLayout content = baseRoot();
        content.addView(label("GESTOR WEB ANDROID", 12, ACCENT_2, true));
        content.addView(label("Panel principal", 32, TEXT, true));
        content.addView(label("Perfiles, licencia y navegación desde una vista tipo dashboard.", 14, MUTED, false));

        LinearLayout stats = row();
        stats.setPadding(0, dp(8), 0, dp(2));
        stats.addView(statCard("Perfiles", String.valueOf(list.size())), new LinearLayout.LayoutParams(0, -2, 1));
        stats.addView(statCard("Con proxy", String.valueOf(profiles.countWithProxy())), new LinearLayout.LayoutParams(0, -2, 1));
        content.addView(stats);

        LinearLayout licenseCard = card();
        LinearLayout licenseRow = row();
        TextView title = label("Licencia activa", 20, TEXT, true);
        licenseRow.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        licenseRow.addView(pill("ONLINE", ACCENT));
        licenseCard.addView(licenseRow);
        licenseCard.addView(label("HWID: " + licenses.deviceId(), 13, MUTED, false));
        Button copyHwid = ghostButton("COPIAR HWID");
        copyHwid.setOnClickListener(v -> ((ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("HWID", licenses.deviceId())));
        licenseCard.addView(copyHwid);
        content.addView(licenseCard);

        LinearLayout creator = card();
        creator.addView(label("Nuevo perfil", 22, TEXT, true));
        creator.addView(label("Crea un perfil con URL, proxy, user-agent y modo de privacidad seguro.", 13, MUTED, false));
        EditText name = input("Nombre del perfil"); creator.addView(name);
        EditText url = input("URL inicial, ej. https://example.com"); creator.addView(url);
        EditText proxy = input("Proxy opcional, ej. http://host:puerto"); creator.addView(proxy);
        EditText ua = input("User-Agent opcional"); creator.addView(ua);
        creator.addView(label("Modo", 13, MUTED, true));
        Spinner mode = modeSpinner(); creator.addView(mode);
        Button create = button("+ CREAR PERFIL");
        create.setOnClickListener(v -> {
            profiles.add(
                name.getText().toString().trim().isEmpty() ? "Perfil" : name.getText().toString().trim(),
                url.getText().toString().trim(),
                proxy.getText().toString().trim(),
                ua.getText().toString().trim(),
                String.valueOf(mode.getSelectedItem())
            );
            renderDashboard();
        });
        creator.addView(create);
        content.addView(creator);

        LinearLayout profilesCard = card();
        profilesCard.addView(label("Perfiles guardados", 22, TEXT, true));
        if (list.isEmpty()) {
            profilesCard.addView(label("Aún no tienes perfiles. Crea uno arriba para empezar.", 14, MUTED, false));
        }
        for (ProfileStore.Profile profile : list) profilesCard.addView(profileCard(profile));
        content.addView(profilesCard);

        LinearLayout limits = card();
        limits.addView(label("Funciones Android", 22, TEXT, true));
        limits.addView(label("Esta versión usa Android WebView. Comparte licencias y perfiles básicos con la lógica del sistema, pero no ejecuta Electron ni módulos internos de escritorio.", 13, MUTED, false));
        limits.addView(label("Modos disponibles: compatibilidad, privado y estricto. Son controles de privacidad/seguridad del WebView, no evasión encubierta.", 13, MUTED, false));
        Button logout = ghostButton("DESACTIVAR LICENCIA EN ESTE EQUIPO");
        logout.setOnClickListener(v -> { licenses.clearLicense(); renderActivation(""); });
        limits.addView(logout);
        content.addView(limits);

        ScrollView scroll = new ScrollView(this);
        scroll.addView(content);
        setContentView(scroll);
    }

    private LinearLayout statCard(String title, String value) {
        LinearLayout stat = new LinearLayout(this);
        stat.setOrientation(LinearLayout.VERTICAL);
        stat.setPadding(dp(12), dp(10), dp(12), dp(10));
        stat.setBackground(rounded(PANEL, dp(16), BORDER));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1);
        p.setMargins(0, dp(6), dp(6), dp(6));
        stat.setLayoutParams(p);
        stat.addView(label(title, 12, MUTED, true));
        stat.addView(label(value, 26, TEXT, true));
        return stat;
    }

    private LinearLayout profileCard(ProfileStore.Profile profile) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(14), dp(12), dp(14), dp(12));
        card.setBackground(rounded(PANEL_2, dp(16), BORDER));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, dp(10), 0, 0);
        card.setLayoutParams(params);

        LinearLayout header = row();
        header.addView(label(profile.name, 19, TEXT, true), new LinearLayout.LayoutParams(0, -2, 1));
        header.addView(pill(profile.privacyMode.toUpperCase(), profile.privacyMode.equals(ProfileStore.MODE_STRICT) ? DANGER : ACCENT));
        card.addView(header);
        card.addView(label(profile.url, 13, MUTED, false));
        card.addView(label(profile.proxy.isEmpty() ? "Conexión directa" : "Proxy: " + profile.proxy, 12, MUTED, false));
        if (!profile.userAgent.isEmpty()) card.addView(label("UA personalizado", 12, MUTED, false));

        LinearLayout actions = row();
        Button open = button("ABRIR");
        open.setOnClickListener(v -> {
            Intent intent = new Intent(this, BrowserActivity.class);
            intent.putExtra("profileId", profile.id);
            startActivity(intent);
        });
        Button remove = ghostButton("ELIMINAR");
        remove.setOnClickListener(v -> { profiles.remove(profile.id); renderDashboard(); });
        actions.addView(open, new LinearLayout.LayoutParams(0, dp(52), 1));
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(0, dp(52), 1);
        rp.setMargins(dp(8), dp(10), 0, 0);
        actions.addView(remove, rp);
        card.addView(actions);
        return card;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
