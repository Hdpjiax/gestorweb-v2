package local.gestorweb.android

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.util.UUID

internal class LicenseStore(context: Context) {

    private val prefs: SharedPreferences

    init {
        try {
            val key = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            prefs = EncryptedSharedPreferences.create(
                context, FILE, key,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            throw IllegalStateException("No se pudo abrir el almacenamiento seguro", e)
        }
    }

    fun deviceId(): String {
        val stored = prefs.getString(DEVICE_KEY, "") ?: ""
        if (stored.isNotEmpty()) return stored
        val newId = "ANDROID-" + UUID.randomUUID().toString().uppercase()
        prefs.edit().putString(DEVICE_KEY, newId).apply()
        return newId
    }

    fun license(): String = prefs.getString(LICENSE_KEY, "") ?: ""

    fun saveLicense(value: String) {
        prefs.edit().putString(LICENSE_KEY, normalize(value)).apply()
    }

    fun clearLicense() {
        prefs.edit().remove(LICENSE_KEY).apply()
    }

    private fun normalize(value: String?): String =
        (value ?: "").replace("\r\n", "\n").replace("\r", "\n").trim()

    companion object {
        private const val FILE        = "gestor_secure"
        private const val DEVICE_KEY  = "device_install_id"
        private const val LICENSE_KEY = "license_text"
    }
}
