package local.gestorweb.android;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class ProfileStore {
    static final String[] PRIVACY_PRESETS = { "none", "standard", "hardened", "anonymous" };
    static final String[] SPOOF_LEVELS = { "off", "balanced", "strong" };
    static final String[] TEMPLATES = { "Pixel 8 · Android 14", "Galaxy S24 · Android 14", "Tablet · Android 14" };
    static final String[] PROXY_TYPES = { "HTTP", "HTTPS", "SOCKS4", "SOCKS5" };

    static final class Profile {
        String id = UUID.randomUUID().toString();
        String name = "Perfil";
        String url = "about:blank";
        String groupTag = "";
        String notes = "";
        String proxy = "";
        String proxyType = "HTTP";
        String proxyUser = "";
        String proxyPass = "";
        String template = TEMPLATES[0];
        String spoofLevel = "balanced";
        String privacyPreset = "standard";
        String userAgent = "";
        String timezone = "America/Mexico_City";
        String locale = "es-MX";
        int width = 1080;
        int height = 2400;
        int cores = 8;
        int memoryGb = 8;
        long noiseSeed = Math.abs(UUID.randomUUID().getMostSignificantBits());
        boolean blockTrackers;
        boolean stripTrackingParams;
        boolean sanitizeHeaders;
        boolean strictReferer;
        boolean webrtcBlock;
        boolean dohEnabled;
        boolean forceHttps;
        boolean hardenAll;
        boolean inMemory;
        boolean autoWipeClose;
        boolean torMode;
        boolean headless;
        boolean harEnabled;
        boolean antiLeak = true;
        boolean compatMode;

        Profile() { applyPreset("standard"); }

        void applyPreset(String value) {
            privacyPreset = normalize(value, PRIVACY_PRESETS, "standard");
            blockTrackers = false; stripTrackingParams = false; sanitizeHeaders = false;
            strictReferer = false; webrtcBlock = false; dohEnabled = false; forceHttps = false;
            hardenAll = false; inMemory = false; autoWipeClose = false; torMode = false;
            if (privacyPreset.equals("standard")) {
                blockTrackers = true; stripTrackingParams = true; sanitizeHeaders = true; webrtcBlock = true;
            } else if (privacyPreset.equals("hardened")) {
                blockTrackers = true; stripTrackingParams = true; sanitizeHeaders = true; strictReferer = true;
                webrtcBlock = true; dohEnabled = true; hardenAll = true; autoWipeClose = true;
            } else if (privacyPreset.equals("anonymous")) {
                blockTrackers = true; stripTrackingParams = true; sanitizeHeaders = true; strictReferer = true;
                webrtcBlock = true; dohEnabled = true; hardenAll = true; inMemory = true; autoWipeClose = true; torMode = true;
            }
        }

        boolean hasProxy() { return !proxy.trim().isEmpty(); }
        boolean hasProxyAuth() { return hasProxy() && !proxyUser.isEmpty(); }
        String proxyUri() {
            if (!hasProxy()) return "";
            String scheme = proxyType.toLowerCase();
            String auth = hasProxyAuth() ? android.net.Uri.encode(proxyUser) + ":" + android.net.Uri.encode(proxyPass) + "@" : "";
            return scheme + "://" + auth + proxy.trim();
        }
        int privacyScore() {
            int score = spoofLevel.equals("off") ? 5 : spoofLevel.equals("strong") ? 20 : 12;
            boolean[] flags = { blockTrackers, stripTrackingParams, sanitizeHeaders, strictReferer, webrtcBlock, dohEnabled, forceHttps, hardenAll, inMemory, autoWipeClose, torMode, antiLeak };
            for (boolean flag : flags) if (flag) score += 7;
            if (compatMode) score -= 12;
            return Math.max(0, Math.min(100, score));
        }
        String effectiveUserAgent() {
            if (!userAgent.trim().isEmpty()) return userAgent.trim();
            if (template.startsWith("Galaxy")) return "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
            if (template.startsWith("Tablet")) return "Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
        }
        String webGlLabel() {
            if (template.startsWith("Galaxy")) return "ANGLE (Qualcomm, Adreno 750)";
            if (template.startsWith("Tablet")) return "ANGLE (Google, Mali-G710)";
            return "ANGLE (Google, Mali-G715)";
        }
    }

    private final SharedPreferences prefs;

    ProfileStore(Context context) {
        try {
            MasterKey key = new MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
            prefs = EncryptedSharedPreferences.create(context, "gestor_profiles_secure", key,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
            migrateLegacy(context);
        } catch (Exception error) { throw new IllegalStateException("No se pudo abrir perfiles cifrados", error); }
    }

    private void migrateLegacy(Context context) {
        if (prefs.contains("profiles")) return;
        SharedPreferences legacy = context.getSharedPreferences("gestor_profiles", Context.MODE_PRIVATE);
        String raw = legacy.getString("profiles", "");
        if (!raw.isEmpty()) prefs.edit().putString("profiles", raw).apply();
    }

    List<Profile> list() {
        List<Profile> result = new ArrayList<>();
        try {
            JSONArray values = new JSONArray(prefs.getString("profiles", "[]"));
            for (int index = 0; index < values.length(); index++) result.add(fromJson(values.getJSONObject(index)));
        } catch (Exception ignored) {}
        return result;
    }

    Profile findById(String id) {
        for (Profile profile : list()) if (profile.id.equals(id)) return profile;
        return null;
    }

    void upsert(Profile profile) {
        List<Profile> values = list();
        boolean replaced = false;
        for (int index = 0; index < values.size(); index++) {
            if (values.get(index).id.equals(profile.id)) { values.set(index, profile); replaced = true; break; }
        }
        if (!replaced) values.add(0, profile);
        save(values);
    }

    void remove(String id) {
        List<Profile> values = list();
        values.removeIf(item -> item.id.equals(id));
        save(values);
    }

    int countWithProxy() { int count = 0; for (Profile profile : list()) if (profile.hasProxy()) count++; return count; }

    String exportJson() {
        JSONArray values = new JSONArray();
        try { for (Profile profile : list()) values.put(toJson(profile, false)); } catch (Exception ignored) {}
        JSONObject root = new JSONObject();
        try { root.put("app", "gestor-web"); root.put("version", 2); root.put("profiles", values); } catch (Exception ignored) {}
        return root.toString();
    }

    int importJson(String raw) throws Exception {
        JSONObject root = new JSONObject(raw);
        JSONArray values = root.getJSONArray("profiles");
        List<Profile> current = list();
        int imported = 0;
        for (int index = 0; index < values.length(); index++) {
            Profile profile = fromJson(values.getJSONObject(index));
            boolean duplicate = false;
            for (Profile existing : current) if (existing.id.equals(profile.id)) { duplicate = true; break; }
            if (duplicate) profile.id = UUID.randomUUID().toString();
            current.add(0, profile); imported++;
        }
        save(current);
        return imported;
    }

    private void save(List<Profile> values) {
        JSONArray array = new JSONArray();
        try { for (Profile profile : values) array.put(toJson(profile, true)); } catch (Exception ignored) {}
        prefs.edit().putString("profiles", array.toString()).apply();
    }

    private static JSONObject toJson(Profile p, boolean includeSecret) throws Exception {
        JSONObject o = new JSONObject();
        o.put("id", p.id); o.put("name", p.name); o.put("url", p.url); o.put("groupTag", p.groupTag); o.put("notes", p.notes);
        o.put("proxy", p.proxy); o.put("proxyType", p.proxyType); o.put("proxyUser", p.proxyUser); if (includeSecret) o.put("proxyPass", p.proxyPass);
        o.put("template", p.template); o.put("spoofLevel", p.spoofLevel); o.put("privacyPreset", p.privacyPreset); o.put("userAgent", p.userAgent);
        o.put("timezone", p.timezone); o.put("locale", p.locale); o.put("width", p.width); o.put("height", p.height); o.put("cores", p.cores); o.put("memoryGb", p.memoryGb); o.put("noiseSeed", p.noiseSeed);
        o.put("blockTrackers", p.blockTrackers); o.put("stripTrackingParams", p.stripTrackingParams); o.put("sanitizeHeaders", p.sanitizeHeaders); o.put("strictReferer", p.strictReferer); o.put("webrtcBlock", p.webrtcBlock); o.put("dohEnabled", p.dohEnabled); o.put("forceHttps", p.forceHttps); o.put("hardenAll", p.hardenAll); o.put("inMemory", p.inMemory); o.put("autoWipeClose", p.autoWipeClose); o.put("torMode", p.torMode); o.put("headless", p.headless); o.put("harEnabled", p.harEnabled); o.put("antiLeak", p.antiLeak); o.put("compatMode", p.compatMode);
        return o;
    }

    private static Profile fromJson(JSONObject o) {
        Profile p = new Profile();
        p.id = o.optString("id", UUID.randomUUID().toString()); p.name = o.optString("name", "Perfil"); p.url = o.optString("url", "about:blank"); p.groupTag = o.optString("groupTag", ""); p.notes = o.optString("notes", "");
        p.proxy = o.optString("proxy", ""); p.proxyType = normalize(o.optString("proxyType", "HTTP"), PROXY_TYPES, "HTTP"); p.proxyUser = o.optString("proxyUser", ""); p.proxyPass = o.optString("proxyPass", "");
        String legacySpoof = o.optString("spoofPreset", "none");
        String legacyPrivacy = o.optString("privacyMode", "compatibilidad");
        String migratedLevel = legacySpoof.equals("none") ? "off" : "balanced";
        String migratedPrivacy = legacyPrivacy.equals("estricto") ? "anonymous" : legacyPrivacy.equals("privado") ? "hardened" : "standard";
        p.template = normalize(o.optString("template", TEMPLATES[0]), TEMPLATES, TEMPLATES[0]); p.spoofLevel = normalize(o.optString("spoofLevel", migratedLevel), SPOOF_LEVELS, "balanced"); p.privacyPreset = normalize(o.optString("privacyPreset", migratedPrivacy), PRIVACY_PRESETS, "standard"); p.userAgent = o.optString("userAgent", "");
        p.timezone = o.optString("timezone", "America/Mexico_City"); p.locale = o.optString("locale", "es-MX"); p.width = o.optInt("width", 1080); p.height = o.optInt("height", 2400); p.cores = o.optInt("cores", 8); p.memoryGb = o.optInt("memoryGb", 8); p.noiseSeed = o.optLong("noiseSeed", p.noiseSeed);
        p.blockTrackers = o.optBoolean("blockTrackers", p.blockTrackers); p.stripTrackingParams = o.optBoolean("stripTrackingParams", p.stripTrackingParams); p.sanitizeHeaders = o.optBoolean("sanitizeHeaders", p.sanitizeHeaders); p.strictReferer = o.optBoolean("strictReferer", p.strictReferer); p.webrtcBlock = o.optBoolean("webrtcBlock", p.webrtcBlock); p.dohEnabled = o.optBoolean("dohEnabled", p.dohEnabled); p.forceHttps = o.optBoolean("forceHttps", p.forceHttps); p.hardenAll = o.optBoolean("hardenAll", p.hardenAll); p.inMemory = o.optBoolean("inMemory", p.inMemory); p.autoWipeClose = o.optBoolean("autoWipeClose", p.autoWipeClose); p.torMode = o.optBoolean("torMode", p.torMode); p.headless = o.optBoolean("headless", false); p.harEnabled = o.optBoolean("harEnabled", false); p.antiLeak = o.optBoolean("antiLeak", true); p.compatMode = o.optBoolean("compatMode", false);
        return p;
    }

    private static String normalize(String value, String[] allowed, String fallback) {
        for (String item : allowed) if (item.equalsIgnoreCase(value)) return item;
        return fallback;
    }
}
