package local.gestorweb.android

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

internal class ProfileStore(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("gestor_profiles", Context.MODE_PRIVATE)

    // ── Model ─────────────────────────────────────────────────────────────────

    data class Profile(
        val id:          String,
        val name:        String,
        val url:         String,
        val proxy:       String,
        val userAgent:   String,
        val privacyMode: String
    ) {
        init {
            // privacyMode is already normalised at construction time
        }
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    fun list(): List<Profile> {
        val result = mutableListOf<Profile>()
        try {
            val values = JSONArray(prefs.getString("profiles", "[]") ?: "[]")
            for (i in 0 until values.length()) {
                val item = values.getJSONObject(i)
                result += Profile(
                    id          = item.getString("id"),
                    name        = item.optString("name", "Perfil"),
                    url         = item.optString("url", "about:blank"),
                    proxy       = item.optString("proxy", ""),
                    userAgent   = item.optString("userAgent", ""),
                    privacyMode = normalizeMode(item.optString("privacyMode", MODE_COMPAT))
                )
            }
        } catch (_: Exception) {}
        return result
    }

    @JvmOverloads
    fun add(
        name: String,
        url: String,
        proxy: String,
        userAgent: String,
        privacyMode: String = MODE_COMPAT
    ) {
        val updated = list().toMutableList().also {
            it += Profile(
                id          = UUID.randomUUID().toString(),
                name        = name,
                url         = url.ifEmpty { "about:blank" },
                proxy       = proxy,
                userAgent   = userAgent,
                privacyMode = normalizeMode(privacyMode)
            )
        }
        save(updated)
    }

    fun remove(id: String) {
        save(list().filter { it.id != id })
    }

    fun countWithProxy(): Int = list().count { it.proxy.isNotEmpty() }

    // ── Persistence ───────────────────────────────────────────────────────────

    private fun save(profiles: List<Profile>) {
        val values = JSONArray()
        profiles.forEach { profile ->
            try {
                values.put(JSONObject().apply {
                    put("id",          profile.id)
                    put("name",        profile.name)
                    put("url",         profile.url)
                    put("proxy",       profile.proxy)
                    put("userAgent",   profile.userAgent)
                    put("privacyMode", profile.privacyMode)
                })
            } catch (_: Exception) {}
        }
        prefs.edit().putString("profiles", values.toString()).apply()
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    companion object {
        const val MODE_COMPAT  = "compatibilidad"
        const val MODE_PRIVATE = "privado"
        const val MODE_STRICT  = "estricto"

        fun normalizeMode(value: String?): String {
            val mode = (value ?: "").trim().lowercase()
            return when (mode) {
                MODE_PRIVATE -> MODE_PRIVATE
                MODE_STRICT  -> MODE_STRICT
                else         -> MODE_COMPAT
            }
        }
    }
}
