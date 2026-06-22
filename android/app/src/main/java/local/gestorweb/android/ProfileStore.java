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

    // Motores soportados
    static final String ENGINE_WEBVIEW = "webview";
    static final String ENGINE_CRONET  = "cronet";
    static final String ENGINE_AUTO    = "auto";     // default

    static final class Profile {
        final String id, name, url, proxy, userAgent, privacyMode, engine;
        Profile(String id, String name, String url, String proxy,
                String userAgent, String privacyMode, String engine) {
            this.id          = id;
            this.name        = name;
            this.url         = url;
            this.proxy       = proxy;
            this.userAgent   = userAgent;
            this.privacyMode = normalizeMode(privacyMode);
            this.engine      = normalizeEngine(engine);
        }
    }

    private final SharedPreferences prefs;
    ProfileStore(Context context) {
        prefs = context.getSharedPreferences("gestor_profiles", Context.MODE_PRIVATE);
    }

    List<Profile> list() {
        List<Profile> result = new ArrayList<>();
        try {
            JSONArray values = new JSONArray(prefs.getString("profiles", "[]"));
            for (int i = 0; i < values.length(); i++) {
                JSONObject item = values.getJSONObject(i);
                result.add(new Profile(
                    item.getString("id"),
                    item.optString("name", "Perfil"),
                    item.optString("url", "about:blank"),
                    item.optString("proxy", ""),
                    item.optString("userAgent", ""),
                    item.optString("privacyMode", MODE_COMPAT),
                    item.optString("engine", ENGINE_AUTO)
                ));
            }
        } catch (Exception ignored) {}
        return result;
    }

    void add(String name, String url, String proxy, String userAgent) {
        add(name, url, proxy, userAgent, MODE_COMPAT, ENGINE_AUTO);
    }

    void add(String name, String url, String proxy, String userAgent, String privacyMode) {
        add(name, url, proxy, userAgent, privacyMode, ENGINE_AUTO);
    }

    void add(String name, String url, String proxy, String userAgent,
             String privacyMode, String engine) {
        List<Profile> profiles = list();
        profiles.add(new Profile(
            UUID.randomUUID().toString(), name,
            url.isEmpty() ? "about:blank" : url,
            proxy, userAgent, privacyMode, engine
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

    static String normalizeMode(String value) {
        String m = String.valueOf(value == null ? "" : value).trim().toLowerCase();
        if (m.equals(MODE_PRIVATE)) return MODE_PRIVATE;
        if (m.equals(MODE_STRICT))  return MODE_STRICT;
        return MODE_COMPAT;
    }

    static String normalizeEngine(String value) {
        String e = String.valueOf(value == null ? "" : value).trim().toLowerCase();
        if (e.equals(ENGINE_WEBVIEW)) return ENGINE_WEBVIEW;
        if (e.equals(ENGINE_CRONET))  return ENGINE_CRONET;
        return ENGINE_AUTO;
    }

    private void save(List<Profile> profiles) {
        JSONArray values = new JSONArray();
        try {
            for (Profile p : profiles) {
                JSONObject item = new JSONObject();
                item.put("id",          p.id);
                item.put("name",        p.name);
                item.put("url",         p.url);
                item.put("proxy",       p.proxy);
                item.put("userAgent",   p.userAgent);
                item.put("privacyMode", p.privacyMode);
                item.put("engine",      p.engine);
                values.put(item);
            }
        } catch (Exception ignored) {}
        prefs.edit().putString("profiles", values.toString()).apply();
    }
}
