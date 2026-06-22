package local.gestorweb.android;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

final class HistoryStore {
    static final class Entry {
        final String profileId, profileName, method, url, type;
        final long timestamp;
        Entry(String profileId, String profileName, String method, String url, String type, long timestamp) {
            this.profileId = profileId; this.profileName = profileName; this.method = method; this.url = url; this.type = type; this.timestamp = timestamp;
        }
    }
    private final SharedPreferences prefs;
    HistoryStore(Context context) { prefs = context.getSharedPreferences("gestor_history", Context.MODE_PRIVATE); }

    synchronized void add(ProfileStore.Profile profile, String method, String url, String type) {
        try {
            JSONArray source = new JSONArray(prefs.getString("entries", "[]"));
            JSONArray output = new JSONArray();
            JSONObject entry = new JSONObject();
            entry.put("profileId", profile.id); entry.put("profileName", profile.name); entry.put("method", method); entry.put("url", url); entry.put("type", type); entry.put("timestamp", System.currentTimeMillis());
            output.put(entry);
            for (int index = 0; index < Math.min(499, source.length()); index++) output.put(source.get(index));
            prefs.edit().putString("entries", output.toString()).apply();
        } catch (Exception ignored) {}
    }

    List<Entry> list() {
        List<Entry> values = new ArrayList<>();
        try {
            JSONArray source = new JSONArray(prefs.getString("entries", "[]"));
            for (int index = 0; index < source.length(); index++) {
                JSONObject item = source.getJSONObject(index);
                values.add(new Entry(item.optString("profileId"), item.optString("profileName", "Perfil"), item.optString("method", "GET"), item.optString("url"), item.optString("type", "navigation"), item.optLong("timestamp")));
            }
        } catch (Exception ignored) {}
        return values;
    }
    void clear() { prefs.edit().remove("entries").apply(); }
}
