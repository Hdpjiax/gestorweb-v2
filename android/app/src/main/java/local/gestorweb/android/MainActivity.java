package local.gestorweb.android;

import android.app.AlertDialog;
import android.app.Dialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;
import android.graphics.Typeface;
import androidx.core.splashscreen.SplashScreen;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public final class MainActivity extends AppCompatActivity {
    private static final int IMPORT_JSON = 501;
    private static final int EXPORT_JSON = 502;
    private LicenseStore licenses;
    private ProfileStore profiles;
    private HistoryStore history;
    private final List<View> panels = new ArrayList<>();
    private String selectedProfileId = "";

    @Override protected void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        licenses = new LicenseStore(this);
        profiles = new ProfileStore(this);
        history = new HistoryStore(this);
        bindStaticActions();
        validateLicense();
    }

    @Override protected void onResume() {
        super.onResume();
        if (licenses != null && !licenses.license().isEmpty()) validateLicense();
    }

    private void bindStaticActions() {
        findViewById(R.id.copyDeviceId).setOnClickListener(v -> copy("HWID", licenses.deviceId()));
        findViewById(R.id.activateButton).setOnClickListener(v -> {
            String value = ((EditText)findViewById(R.id.licenseInput)).getText().toString().trim();
            if (!value.isEmpty()) { licenses.saveLicense(value); validateLicense(); }
        });
        panels.add(findViewById(R.id.panelDashboard)); panels.add(findViewById(R.id.panelProfiles)); panels.add(findViewById(R.id.panelFingerprint)); panels.add(findViewById(R.id.panelPrivacy)); panels.add(findViewById(R.id.panelNetwork)); panels.add(findViewById(R.id.panelSettings));
        bindNav(R.id.navDashboard, R.id.panelDashboard); bindNav(R.id.navProfiles, R.id.panelProfiles); bindNav(R.id.navFingerprint, R.id.panelFingerprint); bindNav(R.id.navPrivacy, R.id.panelPrivacy); bindNav(R.id.navNetwork, R.id.panelNetwork); bindNav(R.id.navSettings, R.id.panelSettings);
        findViewById(R.id.newProfile).setOnClickListener(v -> showProfileEditor(null));
        findViewById(R.id.importProfiles).setOnClickListener(v -> startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE), IMPORT_JSON));
        findViewById(R.id.exportProfiles).setOnClickListener(v -> startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").putExtra(Intent.EXTRA_TITLE, "gestor-web-profiles.json"), EXPORT_JSON));
        findViewById(R.id.clearHistory).setOnClickListener(v -> { history.clear(); renderHistory(); });
        findViewById(R.id.logoutLicense).setOnClickListener(v -> { licenses.clearLicense(); showActivation(""); });
        SwitchCompat resource = findViewById(R.id.resourceMode);
        resource.setChecked(getPreferences(Context.MODE_PRIVATE).getBoolean("economy", true));
        resource.setOnCheckedChangeListener((button, checked) -> { getPreferences(Context.MODE_PRIVATE).edit().putBoolean("economy", checked).apply(); updateGlobalStatus(); });
        findViewById(R.id.presetNone).setOnClickListener(v -> applyPreset("none")); findViewById(R.id.presetStandard).setOnClickListener(v -> applyPreset("standard")); findViewById(R.id.presetHardened).setOnClickListener(v -> applyPreset("hardened")); findViewById(R.id.presetAnonymous).setOnClickListener(v -> applyPreset("anonymous"));
    }

    private void validateLicense() {
        findViewById(R.id.activationScreen).setVisibility(View.VISIBLE); findViewById(R.id.appScreen).setVisibility(View.GONE);
        ((TextView)findViewById(R.id.deviceId)).setText(licenses.deviceId());
        String text = licenses.license();
        if (text.isEmpty()) { showActivation(""); return; }
        ((TextView)findViewById(R.id.licenseError)).setText("Validando online…");
        new Thread(() -> {
            LicenseClient.Result result = LicenseClient.verify(this, text, licenses.deviceId());
            runOnUiThread(() -> { if (result.active) showApplication(); else { licenses.clearLicense(); showActivation(result.reason); } });
        }).start();
    }

    private void showActivation(String error) {
        findViewById(R.id.activationScreen).setVisibility(View.VISIBLE); findViewById(R.id.appScreen).setVisibility(View.GONE);
        ((TextView)findViewById(R.id.deviceId)).setText(licenses.deviceId()); ((TextView)findViewById(R.id.licenseError)).setText(error);
    }

    private void showApplication() {
        findViewById(R.id.activationScreen).setVisibility(View.GONE); findViewById(R.id.appScreen).setVisibility(View.VISIBLE);
        List<ProfileStore.Profile> values = profiles.list();
        if (selectedProfileId.isEmpty() && !values.isEmpty()) selectedProfileId = values.get(0).id;
        updateGlobalStatus(); renderDashboard(); renderProfiles(); bindProfileSelectors(); renderFingerprint(); renderPrivacy(); renderHistory(); showPanel(R.id.panelDashboard, R.id.navDashboard);
        openDeepLinkIfPresent();
    }

    private void updateGlobalStatus() {
        boolean economy = getPreferences(Context.MODE_PRIVATE).getBoolean("economy", true);
        ((TextView)findViewById(R.id.globalStatus)).setText("ANDROID · " + (economy ? "AHORRO" : "NORMAL"));
    }

    private void bindNav(int buttonId, int panelId) { findViewById(buttonId).setOnClickListener(v -> showPanel(panelId, buttonId)); }
    private void showPanel(int panelId, int navId) {
        for (View panel : panels) panel.setVisibility(panel.getId() == panelId ? View.VISIBLE : View.GONE);
        int[] nav = { R.id.navDashboard,R.id.navProfiles,R.id.navFingerprint,R.id.navPrivacy,R.id.navNetwork,R.id.navSettings };
        for (int id : nav) findViewById(id).setBackgroundResource(id == navId ? R.drawable.bg_nav_selected : android.R.color.transparent);
    }

    private void renderDashboard() {
        List<ProfileStore.Profile> values = profiles.list();
        ((TextView)findViewById(R.id.statProfiles)).setText("PERFILES\n" + values.size());
        ((TextView)findViewById(R.id.statProxies)).setText("CON PROXY\n" + profiles.countWithProxy());
        LinearLayout summary = findViewById(R.id.dashboardSummary); summary.removeAllViews();
        if (values.isEmpty()) summary.addView(infoRow("Sin perfiles", "Crea una identidad para comenzar", "warn"));
        for (int index = 0; index < Math.min(values.size(), 4); index++) {
            ProfileStore.Profile profile = values.get(index); summary.addView(infoRow(profile.name, "Privacidad " + profile.privacyScore() + "% · " + profile.privacyPreset, profile.privacyScore() >= 70 ? "ok" : "warn"));
        }
    }

    private void renderProfiles() {
        LinearLayout container = findViewById(R.id.profileList); container.removeAllViews();
        for (ProfileStore.Profile profile : profiles.list()) {
            View item = LayoutInflater.from(this).inflate(R.layout.item_profile, container, false);
            ((TextView)item.findViewById(R.id.profileName)).setText(profile.name);
            ((TextView)item.findViewById(R.id.profilePreset)).setText(profile.privacyPreset.toUpperCase());
            ((TextView)item.findViewById(R.id.profileMeta)).setText((profile.hasProxy() ? profile.proxyType + " · " + profile.proxy : "conexión directa") + "\n" + profile.template + " · spoof " + profile.spoofLevel);
            ((ProgressBar)item.findViewById(R.id.privacyScore)).setProgress(profile.privacyScore());
            item.findViewById(R.id.openProfile).setOnClickListener(v -> openProfile(profile));
            item.findViewById(R.id.editProfile).setOnClickListener(v -> showProfileEditor(profile));
            item.findViewById(R.id.deleteProfile).setOnClickListener(v -> new AlertDialog.Builder(this).setTitle("Eliminar perfil").setMessage(profile.name).setNegativeButton("Cancelar", null).setPositiveButton("Eliminar", (d,w) -> { profiles.remove(profile.id); refreshAll(); }).show());
            item.setOnClickListener(v -> { selectedProfileId = profile.id; bindProfileSelectors(); renderFingerprint(); renderPrivacy(); });
            container.addView(item);
        }
    }

    private void bindProfileSelectors() {
        List<ProfileStore.Profile> values = profiles.list(); List<String> names = new ArrayList<>(); int selected = 0;
        for (int index = 0; index < values.size(); index++) { names.add(values.get(index).name); if (values.get(index).id.equals(selectedProfileId)) selected = index; }
        Spinner fp = findViewById(R.id.fingerprintProfile), privacy = findViewById(R.id.privacyProfile);
        ArrayAdapter<String> adapter = darkAdapter(names); fp.setAdapter(adapter); privacy.setAdapter(adapter); if (!names.isEmpty()) { fp.setSelection(selected); privacy.setSelection(selected); }
        fp.setOnItemSelectedListener(new SimpleSelection(position -> { if (position < profiles.list().size()) { selectedProfileId = profiles.list().get(position).id; renderFingerprint(); } }));
        privacy.setOnItemSelectedListener(new SimpleSelection(position -> { if (position < profiles.list().size()) { selectedProfileId = profiles.list().get(position).id; renderPrivacy(); } }));
    }

    private void renderFingerprint() {
        LinearLayout rows = findViewById(R.id.fingerprintRows); rows.removeAllViews(); ProfileStore.Profile p = profiles.findById(selectedProfileId);
        if (p == null) { rows.addView(infoRow("Sin perfil", "Selecciona o crea uno", "warn")); return; }
        ((TextView)findViewById(R.id.fingerprintTitle)).setText("Fingerprint · " + p.name);
        boolean strong = p.spoofLevel.equals("strong") || p.hardenAll;
        addInfo(rows,"Canvas hash",strong ? "noise determinista" : "nativo",strong); addInfo(rows,"Audio hash",strong ? "noise determinista" : "nativo",strong);
        addInfo(rows,"User Agent","plantilla Android coherente",true); addInfo(rows,"WebGL renderer",strong ? p.webGlLabel() : "GPU nativa",strong);
        addInfo(rows,"Timezone",p.timezone,true); addInfo(rows,"Resolución",p.width + "x" + p.height,true); addInfo(rows,"Proxy",p.hasProxy() ? p.proxyType + " · asignado" : "sin proxy",p.hasProxy());
        addInfo(rows,"WebRTC leak",p.webrtcBlock ? "bloqueado por página" : "expuesto",p.webrtcBlock); addInfo(rows,"Bloqueo trackers",p.blockTrackers ? "~80 dominios" : "off",p.blockTrackers);
        addInfo(rows,"Client hints",p.sanitizeHeaders ? "reducidos (límite WebView)" : "estándar",p.sanitizeHeaders); addInfo(rows,"No-referrer",p.strictReferer ? "solicitado" : "off",p.strictReferer);
        addInfo(rows,"Force HTTPS",p.forceHttps ? "activado" : "off",p.forceHttps); addInfo(rows,"DNS over HTTPS",p.dohEnabled ? "requiere DNS privado Android" : "off",false);
        addInfo(rows,"Spoof nivel",p.spoofLevel,p.spoofLevel.equals("strong")); addInfo(rows,"Solo en memoria",p.inMemory ? "RAM / no-cache" : "disco",p.inMemory); addInfo(rows,"Auto-wipe",p.autoWipeClose ? "al cerrar" : "off",p.autoWipeClose);
        addInfo(rows,"Sesión","inactiva",false); addInfo(rows,"Compat mode",p.compatMode ? "reducido" : "controles completos",!p.compatMode); addInfo(rows,"Headless",p.headless ? "no soportado en WebView" : "off",false); addInfo(rows,"HAR",p.harEnabled ? "registro básico" : "off",p.harEnabled); addInfo(rows,"Anti-leak",p.antiLeak ? "on" : "off",p.antiLeak);
    }

    private void renderPrivacy() {
        LinearLayout flags = findViewById(R.id.privacyFlags); flags.removeAllViews(); ProfileStore.Profile p = profiles.findById(selectedProfileId);
        if (p == null) return;
        addFlag(flags,"Bloquear trackers · ~80 dominios",p.blockTrackers,v->p.blockTrackers=v,p); addFlag(flags,"Quitar UTM/fbclid/gclid",p.stripTrackingParams,v->p.stripTrackingParams=v,p); addFlag(flags,"Reducir client hints",p.sanitizeHeaders,v->p.sanitizeHeaders=v,p); addFlag(flags,"No-referrer",p.strictReferer,v->p.strictReferer=v,p); addFlag(flags,"Bloquear WebRTC",p.webrtcBlock,v->p.webrtcBlock=v,p); addFlag(flags,"DNS privado / DoH solicitado",p.dohEnabled,v->p.dohEnabled=v,p); addFlag(flags,"Force HTTPS",p.forceHttps,v->p.forceHttps=v,p); addFlag(flags,"Spoof fuerte",p.hardenAll,v->p.hardenAll=v,p); addFlag(flags,"Solo en memoria",p.inMemory,v->p.inMemory=v,p); addFlag(flags,"Auto-wipe al cerrar",p.autoWipeClose,v->p.autoWipeClose=v,p); addFlag(flags,"Tor mediante Orbot",p.torMode,v->p.torMode=v,p); addFlag(flags,"HAR básico",p.harEnabled,v->p.harEnabled=v,p); addFlag(flags,"Anti-leak",p.antiLeak,v->p.antiLeak=v,p); addFlag(flags,"Compat mode",p.compatMode,v->p.compatMode=v,p);
    }

    private void renderHistory() {
        LinearLayout container = findViewById(R.id.historyList); container.removeAllViews(); List<HistoryStore.Entry> values = history.list();
        if (values.isEmpty()) { container.addView(infoRow("Sin eventos", "Las navegaciones y solicitudes aparecerán aquí", "warn")); return; }
        for (int index=0; index<Math.min(values.size(),150); index++) { HistoryStore.Entry e=values.get(index); container.addView(infoRow(e.method+" · "+e.profileName,e.url+"\n"+DateFormat.getDateTimeInstance().format(new Date(e.timestamp)),"ok")); }
    }

    private void applyPreset(String value) { ProfileStore.Profile p = profiles.findById(selectedProfileId); if (p == null) return; p.applyPreset(value); profiles.upsert(p); renderPrivacy(); renderFingerprint(); renderProfiles(); renderDashboard(); }
    private interface FlagSetter { void set(boolean value); }
    private void addFlag(LinearLayout root,String label,boolean checked,FlagSetter setter,ProfileStore.Profile profile) { SwitchCompat view=new SwitchCompat(this); view.setText(label); view.setTextColor(getColor(R.color.text)); view.setChecked(checked); view.setPadding(12,10,12,10); view.setBackgroundResource(R.drawable.bg_panel); LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2); lp.setMargins(0,6,0,0); view.setLayoutParams(lp); view.setOnCheckedChangeListener((b,v)->{setter.set(v); profiles.upsert(profile); renderFingerprint(); renderProfiles();}); root.addView(view); }
    private void addInfo(LinearLayout root,String label,String value,boolean ok){root.addView(infoRow(label,value,ok?"ok":"warn"));}
    private View infoRow(String label,String value,String status) { LinearLayout row=new LinearLayout(this); row.setOrientation(LinearLayout.VERTICAL); row.setPadding(14,12,14,12); row.setBackgroundResource(R.drawable.bg_panel); LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2); lp.setMargins(0,7,0,0); row.setLayoutParams(lp); TextView title=new TextView(this); title.setText(label); title.setTextColor(getColor(R.color.text)); title.setTextSize(15); title.setTypeface(null,Typeface.BOLD); TextView detail=new TextView(this); detail.setText(("ok".equals(status)?"✓ ":"△ ")+value); detail.setTextColor(getColor("ok".equals(status)?R.color.success:R.color.warning)); row.addView(title); row.addView(detail); return row; }

    private void openProfile(ProfileStore.Profile p) { Intent intent=new Intent(this,BrowserActivity.class).putExtra("profileId",p.id); startActivity(intent); overridePendingTransition(R.anim.slide_in_right,R.anim.slide_out_left); }

    private void showProfileEditor(ProfileStore.Profile existing) {
        Dialog dialog=new Dialog(this); dialog.requestWindowFeature(Window.FEATURE_NO_TITLE); dialog.setContentView(R.layout.dialog_profile); Window window=dialog.getWindow(); if(window!=null){window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT);window.setBackgroundDrawableResource(R.color.bg);}
        ProfileStore.Profile p=existing==null?new ProfileStore.Profile():existing;
        setText(dialog,R.id.editName,p.name);setText(dialog,R.id.editUrl,p.url.equals("about:blank")?"":p.url);setText(dialog,R.id.editGroup,p.groupTag);setText(dialog,R.id.editProxy,p.proxy);setText(dialog,R.id.editProxyUser,p.proxyUser);setText(dialog,R.id.editProxyPass,p.proxyPass);setText(dialog,R.id.editUserAgent,p.userAgent);setText(dialog,R.id.editTimezone,p.timezone);setText(dialog,R.id.editResolution,p.width+"x"+p.height);setText(dialog,R.id.editNotes,p.notes);
        Spinner proxyType=setupSpinner(dialog,R.id.editProxyType,ProfileStore.PROXY_TYPES,p.proxyType), template=setupSpinner(dialog,R.id.editTemplate,ProfileStore.TEMPLATES,p.template), spoof=setupSpinner(dialog,R.id.editSpoofLevel,ProfileStore.SPOOF_LEVELS,p.spoofLevel), preset=setupSpinner(dialog,R.id.editPrivacyPreset,ProfileStore.PRIVACY_PRESETS,p.privacyPreset);
        setSwitch(dialog,R.id.editBlockTrackers,p.blockTrackers);setSwitch(dialog,R.id.editStripTracking,p.stripTrackingParams);setSwitch(dialog,R.id.editSanitizeHeaders,p.sanitizeHeaders);setSwitch(dialog,R.id.editNoReferrer,p.strictReferer);setSwitch(dialog,R.id.editWebrtc,p.webrtcBlock);setSwitch(dialog,R.id.editDoh,p.dohEnabled);setSwitch(dialog,R.id.editForceHttps,p.forceHttps);setSwitch(dialog,R.id.editHarden,p.hardenAll);setSwitch(dialog,R.id.editMemory,p.inMemory);setSwitch(dialog,R.id.editAutoWipe,p.autoWipeClose);setSwitch(dialog,R.id.editTor,p.torMode);setSwitch(dialog,R.id.editHar,p.harEnabled);setSwitch(dialog,R.id.editAntiLeak,p.antiLeak);setSwitch(dialog,R.id.editCompat,p.compatMode);
        dialog.findViewById(R.id.cancelProfile).setOnClickListener(v->dialog.dismiss()); dialog.findViewById(R.id.saveProfile).setOnClickListener(v->{p.name=text(dialog,R.id.editName,"Perfil");p.url=text(dialog,R.id.editUrl,"about:blank");p.groupTag=text(dialog,R.id.editGroup,"");p.proxy=text(dialog,R.id.editProxy,"");p.proxyType=String.valueOf(proxyType.getSelectedItem());p.proxyUser=text(dialog,R.id.editProxyUser,"");p.proxyPass=text(dialog,R.id.editProxyPass,"");p.template=String.valueOf(template.getSelectedItem());p.spoofLevel=String.valueOf(spoof.getSelectedItem());p.privacyPreset=String.valueOf(preset.getSelectedItem());p.userAgent=text(dialog,R.id.editUserAgent,"");p.timezone=text(dialog,R.id.editTimezone,"America/Mexico_City");int[] size=parseResolution(text(dialog,R.id.editResolution,"1080x2400"));p.width=size[0];p.height=size[1];p.notes=text(dialog,R.id.editNotes,"");p.blockTrackers=checked(dialog,R.id.editBlockTrackers);p.stripTrackingParams=checked(dialog,R.id.editStripTracking);p.sanitizeHeaders=checked(dialog,R.id.editSanitizeHeaders);p.strictReferer=checked(dialog,R.id.editNoReferrer);p.webrtcBlock=checked(dialog,R.id.editWebrtc);p.dohEnabled=checked(dialog,R.id.editDoh);p.forceHttps=checked(dialog,R.id.editForceHttps);p.hardenAll=checked(dialog,R.id.editHarden);p.inMemory=checked(dialog,R.id.editMemory);p.autoWipeClose=checked(dialog,R.id.editAutoWipe);p.torMode=checked(dialog,R.id.editTor);p.harEnabled=checked(dialog,R.id.editHar);p.antiLeak=checked(dialog,R.id.editAntiLeak);p.compatMode=checked(dialog,R.id.editCompat);profiles.upsert(p);selectedProfileId=p.id;dialog.dismiss();refreshAll();});
        dialog.show(); if(window!=null)window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT);
    }

    private void refreshAll(){renderDashboard();renderProfiles();bindProfileSelectors();renderFingerprint();renderPrivacy();renderHistory();}
    private Spinner setupSpinner(Dialog d,int id,String[] values,String selected){Spinner s=d.findViewById(id);s.setAdapter(darkAdapter(java.util.Arrays.asList(values)));for(int i=0;i<values.length;i++)if(values[i].equals(selected))s.setSelection(i);return s;}
    private ArrayAdapter<String> darkAdapter(List<String> values){ArrayAdapter<String>a=new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,values){@Override public View getView(int p,View c,ViewGroup parent){TextView v=(TextView)super.getView(p,c,parent);v.setTextColor(Color.WHITE);v.setPadding(14,0,14,0);return v;}};return a;}
    private void setText(Dialog d,int id,String value){((EditText)d.findViewById(id)).setText(value);} private String text(Dialog d,int id,String fallback){String value=((EditText)d.findViewById(id)).getText().toString().trim();return value.isEmpty()?fallback:value;} private void setSwitch(Dialog d,int id,boolean value){((SwitchCompat)d.findViewById(id)).setChecked(value);} private boolean checked(Dialog d,int id){return ((SwitchCompat)d.findViewById(id)).isChecked();}
    private int[] parseResolution(String value){try{String[]p=value.toLowerCase().split("x");return new int[]{Math.max(320,Integer.parseInt(p[0].trim())),Math.max(480,Integer.parseInt(p[1].trim()))};}catch(Exception e){return new int[]{1080,2400};}}
    private void copy(String label,String value){((ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText(label,value));Toast.makeText(this,"Copiado",Toast.LENGTH_SHORT).show();}

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(resultCode!=RESULT_OK||data==null||data.getData()==null)return;Uri uri=data.getData();try{if(requestCode==EXPORT_JSON){try(OutputStream out=getContentResolver().openOutputStream(uri)){out.write(profiles.exportJson().getBytes(StandardCharsets.UTF_8));}Toast.makeText(this,"Perfiles exportados sin contraseñas",Toast.LENGTH_LONG).show();}else if(requestCode==IMPORT_JSON){StringBuilder raw=new StringBuilder();try(BufferedReader reader=new BufferedReader(new InputStreamReader(getContentResolver().openInputStream(uri),StandardCharsets.UTF_8))){String line;while((line=reader.readLine())!=null)raw.append(line);}int count=profiles.importJson(raw.toString());Toast.makeText(this,count+" perfiles importados",Toast.LENGTH_LONG).show();refreshAll();}}catch(Exception error){Toast.makeText(this,"JSON inválido: "+error.getMessage(),Toast.LENGTH_LONG).show();}}
    private void openDeepLinkIfPresent(){Uri data=getIntent().getData();if(data==null||!"gestorweb".equals(data.getScheme())||!"profile".equals(data.getHost()))return;String id=data.getLastPathSegment();ProfileStore.Profile p=profiles.findById(id);getIntent().setData(null);if(p!=null)openProfile(p);}

    private static final class SimpleSelection implements android.widget.AdapterView.OnItemSelectedListener { interface Callback{void select(int position);} final Callback callback; SimpleSelection(Callback callback){this.callback=callback;} public void onItemSelected(android.widget.AdapterView<?>p,View v,int position,long id){callback.select(position);} public void onNothingSelected(android.widget.AdapterView<?>p){} }
}
