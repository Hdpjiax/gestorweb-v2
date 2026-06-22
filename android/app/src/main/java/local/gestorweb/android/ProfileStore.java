package local.gestorweb.android;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class ProfileStore {
    static final String MODE_COMPAT  = "compatibilidad";
    static final String MODE_PRIVATE = "privado";
    static final String MODE_STRICT  = "estricto";

    // ── Tipos de proxy ───────────────────────────────────────────────────────
    static final String PROXY_HTTP   = "HTTP";
    static final String PROXY_HTTPS  = "HTTPS";
    static final String PROXY_SOCKS4 = "SOCKS4";
    static final String PROXY_SOCKS5 = "SOCKS5";

    // ── Presets de spoofing ──────────────────────────────────────────────────
    static final String SPOOF_NONE    = "none";
    static final String SPOOF_WIN     = "windows";
    static final String SPOOF_MOBILE  = "mobile";
    static final String SPOOF_MACOS   = "macos";

    // ────────────────────────────────────────────────────────────────────────
    static final class Profile {
        final String id;
        final String name;
        final String url;

        // Proxy completo
        final String proxy;      // host:puerto  (vacío = sin proxy)
        final String proxyType;  // HTTP / HTTPS / SOCKS4 / SOCKS5
        final String proxyUser;  // usuario para auth (puede estar vacío)
        final String proxyPass;  // contraseña para auth (puede estar vacío)

        final String userAgent;
        final String privacyMode;
        final String spoofPreset; // none / windows / mobile / macos

        Profile(String id, String name, String url,
                String proxy, String proxyType, String proxyUser, String proxyPass,
                String userAgent, String privacyMode, String spoofPreset) {
            this.id          = id;
            this.name        = name;
            this.url         = url;
            this.proxy       = proxy     == null ? "" : proxy.trim();
            this.proxyType   = normalizeProxyType(proxyType);
            this.proxyUser   = proxyUser == null ? "" : proxyUser;
            this.proxyPass   = proxyPass == null ? "" : proxyPass;
            this.userAgent   = userAgent == null ? "" : userAgent;
            this.privacyMode = normalizeMode(privacyMode);
            this.spoofPreset = normalizeSpoofPreset(spoofPreset);
        }

        /** Devuelve true si tiene credenciales de proxy. */
        boolean hasProxyAuth() {
            return !proxyUser.isEmpty();
        }

        /**
         * Construye la URI de proxy lista para ProxyConfig / Socks.
         * Ejemplos:
         *   http://host:3128
         *   socks5://user:pass@host:1080
         */
        String proxyUri() {
            if (proxy.isEmpty()) return "";
            String scheme;
            switch (proxyType) {
                case PROXY_SOCKS5: scheme = "socks5"; break;
                case PROXY_SOCKS4: scheme = "socks4"; break;
                case PROXY_HTTPS:  scheme = "https";  break;
                default:           scheme = "http";   break;
            }
            String auth = hasProxyAuth()
                ? (Uri_encode(proxyUser) + ":" + Uri_encode(proxyPass) + "@")
                : "";
            return scheme + "://" + auth + proxy;
        }

        /** Devuelve el SpoofInjector.Preset correspondiente al preset guardado. */
        SpoofInjector.Preset resolvePreset() {
            switch (spoofPreset) {
                case SPOOF_MOBILE: return SpoofInjector.Preset.mobile();
                case SPOOF_MACOS:  return SpoofInjector.Preset.macos();
                case SPOOF_WIN:    return SpoofInjector.Preset.defaults();
                default:           return null; // SPOOF_NONE
            }
        }

        // Encode mínimo para user:pass en URI (evita @ / : en credenciales)
        private static String Uri_encode(String s) {
            return android.net.Uri.encode(s);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    private final SharedPreferences prefs;

    ProfileStore(Context context) {
        prefs = context.getSharedPreferences("gestor_profiles", Context.MODE_PRIVATE);
    }

    List<Profile> list() {
        List<Profile> result = new ArrayList<>();
        try {
            JSONArray values = new JSONArray(prefs.getString("profiles", "[]"));
            for (int i = 0; i < values.length(); i++) {
                JSONObject o = values.getJSONObject(i);
                result.add(fromJson(o));
            }
        } catch (Exception ignored) {}
        return result;
    }

    /** Busca un perfil por id; retorna null si no existe. */
    Profile findById(String id) {
        for (Profile p : list()) if (p.id.equals(id)) return p;
        return null;
    }

    /** Añade perfil con los campos mínimos originales (retrocompatibilidad). */
    void add(String name, String url, String proxy, String userAgent) {
        add(name, url, proxy, PROXY_HTTP, "", "", userAgent, MODE_COMPAT, SPOOF_NONE);
    }

    /** Añade perfil completo. */
    void add(String name, String url,
             String proxy, String proxyType, String proxyUser, String proxyPass,
             String userAgent, String privacyMode, String spoofPreset) {
        List<Profile> profiles = list();
        profiles.add(new Profile(
            UUID.randomUUID().toString(),
            name,
            url.isEmpty() ? "about:blank" : url,
            proxy, proxyType, proxyUser, proxyPass,
            userAgent, privacyMode, spoofPreset
        ));
        save(profiles);
    }

    void remove(String id) {
        List<Profile> profiles = list();
        profiles.removeIf(item -> item.id.equals(id));
        save(profiles);
    }

    int countWithProxy() {
        int count = 0;
        for (Profile p : list()) if (!p.proxy.isEmpty()) count++;
        return count;
    }

    // ── Normalizadores ───────────────────────────────────────────────────────

    static String normalizeMode(String value) {
        String mode = value == null ? "" : value.trim().toLowerCase();
        if (mode.equals(MODE_PRIVATE)) return MODE_PRIVATE;
        if (mode.equals(MODE_STRICT))  return MODE_STRICT;
        return MODE_COMPAT;
    }

    static String normalizeProxyType(String value) {
        String v = value == null ? "" : value.trim().toUpperCase();
        if (v.equals(PROXY_SOCKS5)) return PROXY_SOCKS5;
        if (v.equals(PROXY_SOCKS4)) return PROXY_SOCKS4;
        if (v.equals(PROXY_HTTPS))  return PROXY_HTTPS;
        return PROXY_HTTP;
    }

    static String normalizeSpoofPreset(String value) {
        String v = value == null ? "" : value.trim().toLowerCase();
        if (v.equals(SPOOF_WIN))    return SPOOF_WIN;
        if (v.equals(SPOOF_MOBILE)) return SPOOF_MOBILE;
        if (v.equals(SPOOF_MACOS))  return SPOOF_MACOS;
        return SPOOF_NONE;
    }

    // ── Serialización ────────────────────────────────────────────────────────

    private static Profile fromJson(JSONObject o) throws Exception {
        return new Profile(
            o.getString("id"),
            o.optString("name",        "Perfil"),
            o.optString("url",         "about:blank"),
            o.optString("proxy",       ""),
            o.optString("proxyType",   PROXY_HTTP),
            o.optString("proxyUser",   ""),
            o.optString("proxyPass",   ""),
            o.optString("userAgent",   ""),
            o.optString("privacyMode", MODE_COMPAT),
            o.optString("spoofPreset", SPOOF_NONE)
        );
    }

    private void save(List<Profile> profiles) {
        JSONArray values = new JSONArray();
        try {
            for (Profile p : profiles) {
                JSONObject o = new JSONObject();
                o.put("id",          p.id);
                o.put("name",        p.name);
                o.put("url",         p.url);
                o.put("proxy",       p.proxy);
                o.put("proxyType",   p.proxyType);
                o.put("proxyUser",   p.proxyUser);
                o.put("proxyPass",   p.proxyPass);
                o.put("userAgent",   p.userAgent);
                o.put("privacyMode", p.privacyMode);
                o.put("spoofPreset", p.spoofPreset);
                values.put(o);
            }
        } catch (Exception ignored) {}
        prefs.edit().putString("profiles", values.toString()).apply();
    }
}
