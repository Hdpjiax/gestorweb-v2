package local.gestorweb.android

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class ProfileStore(ctx: Context) {

    companion object {
        const val MODE_COMPAT   = "COMPAT"
        const val MODE_PRIVATE  = "PRIVATE"
        const val MODE_STRICT   = "STRICT"
        private  const val PREF = "profiles"
        private  const val KEY  = "list"
    }

    data class Profile(
        val id:          String,
        val name:        String,
        val url:         String,
        val proxy:       String,
        val userAgent:   String,
        val privacyMode: String
    )

    private val prefs = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE)

    fun list(): List<Profile> {
        val raw = prefs.getString(KEY, "[]") ?: "[]"
        val arr = JSONArray(raw)
        return (0 until arr.length()).map { arr.getJSONObject(it).toProfile() }
    }

    fun add(name: String, url: String, proxy: String, ua: String, mode: String) {
        val arr = JSONArray(prefs.getString(KEY, "[]") ?: "[]")
        arr.put(JSONObject().apply {
            put("id",   UUID.randomUUID().toString())
            put("name", name); put("url", url)
            put("proxy", proxy); put("ua", ua); put("mode", mode)
        })
        prefs.edit().putString(KEY, arr.toString()).apply()
    }

    fun update(id: String, name: String, url: String, proxy: String, ua: String, mode: String) {
        val arr    = JSONArray(prefs.getString(KEY, "[]") ?: "[]")
        val result = JSONArray()
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            if (obj.getString("id") == id) {
                result.put(JSONObject().apply {
                    put("id",   id)
                    put("name", name); put("url", url)
                    put("proxy", proxy); put("ua", ua); put("mode", mode)
                })
            } else result.put(obj)
        }
        prefs.edit().putString(KEY, result.toString()).apply()
    }

    fun remove(id: String) {
        val arr    = JSONArray(prefs.getString(KEY, "[]") ?: "[]")
        val result = JSONArray()
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            if (obj.getString("id") != id) result.put(obj)
        }
        prefs.edit().putString(KEY, result.toString()).apply()
    }

    fun countWithProxy() = list().count { it.proxy.isNotEmpty() }

    private fun JSONObject.toProfile() = Profile(
        id          = getString("id"),
        name        = optString("name"),
        url         = optString("url"),
        proxy       = optString("proxy"),
        userAgent   = optString("ua"),
        privacyMode = optString("mode", MODE_COMPAT)
    )
}
