package local.gestorweb.android;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class ProfileStore {
    static final String MODE_COMPAT = "compatibilidad";
    static final String MODE_PRIVATE = "privado";
    static final String MODE_STRICT = "estricto";

    static final class Profile {
        final String id, name, url, proxy, userAgent, privacyMode;
        Profile(String id, String name, String url, String proxy, String userAgent, String privacyMode) {
            this.id = id;
            this.name = name;
            this.url = url;
            this.proxy = proxy;
            this.userAgent = userAgent;
            this.privacyMode = normalizeMode(privacyMode);
        }
    }

    private final SharedPreferences prefs;
    ProfileStore(Context context) { prefs = context.getSharedPreferences("gestor_profiles", Context.MODE_PRIVATE); }

    List<Profile> list() {
        List<Profile> result = new ArrayList<>();
        try {
            JSONArray values = new JSONArray(prefs.getString("profiles", "[]"));
            for (int index = 0; index < values.length(); index++) {
                JSONObject item = values.getJSONObject(index);
                result.add(new Profile(
                    item.getString("id"),
                    item.optString("name", "Perfil"),
                    item.optString("url", "about:blank"),
                    item.optString("proxy", ""),
                    item.optString("userAgent", ""),
                    item.optString("privacyMode", MODE_COMPAT)
                ));
            }
        } catch (Exception ignored) {}
        return result;
    }

    void add(String name, String url, String proxy, String userAgent) {
        add(name, url, proxy, userAgent, MODE_COMPAT);
    }

    void add(String name, String url, String proxy, String userAgent, String privacyMode) {
        List<Profile> profiles = list();
        profiles.add(new Profile(
            UUID.randomUUID().toString(),
            name,
            url.isEmpty() ? "about:blank" : url,
            proxy,
            userAgent,
            privacyMode
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
        for (Profile profile : list()) if (!profile.proxy.isEmpty()) count++;
        return count;
    }

    static String normalizeMode(String value) {
        String mode = String.valueOf(value == null ? "" : value).trim().toLowerCase();
        if (mode.equals(MODE_PRIVATE)) return MODE_PRIVATE;
        if (mode.equals(MODE_STRICT)) return MODE_STRICT;
        return MODE_COMPAT;
    }

    private void save(List<Profile> profiles) {
        JSONArray values = new JSONArray();
        try {
            for (Profile profile : profiles) {
                JSONObject item = new JSONObject();
                item.put("id", profile.id);
                item.put("name", profile.name);
                item.put("url", profile.url);
                item.put("proxy", profile.proxy);
                item.put("userAgent", profile.userAgent);
                item.put("privacyMode", profile.privacyMode);
                values.put(item);
            }
        } catch (Exception ignored) {}
        prefs.edit().putString("profiles", values.toString()).apply();
    }
}
