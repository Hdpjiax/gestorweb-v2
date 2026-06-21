package local.gestorweb.android;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import java.util.UUID;

final class LicenseStore {
    private static final String FILE = "gestor_secure";
    private final SharedPreferences prefs;

    LicenseStore(Context context) {
        try {
            MasterKey key = new MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
            prefs = EncryptedSharedPreferences.create(context, FILE, key,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        } catch (Exception error) {
            throw new IllegalStateException("No se pudo abrir el almacenamiento seguro", error);
        }
    }

    String deviceId() {
        String value = prefs.getString("device_install_id", "");
        if (!value.isEmpty()) return value;
        value = "ANDROID-" + UUID.randomUUID().toString().toUpperCase();
        prefs.edit().putString("device_install_id", value).apply();
        return value;
    }

    String license() { return prefs.getString("license_text", ""); }
    void saveLicense(String value) { prefs.edit().putString("license_text", value.trim()).apply(); }
    void clearLicense() { prefs.edit().remove("license_text").apply(); }
}
