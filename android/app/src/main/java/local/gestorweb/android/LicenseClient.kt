package local.gestorweb.android

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

internal object LicenseClient {

    private const val PREFIX = "GW-LIC-V1"
    private const val APP_ID = "gestor-web"

    data class Result(val active: Boolean, val reason: String, val expiresAt: Long)

    private data class ParsedLicense(
        val normalized: String,
        val payloadSegment: String,
        val signature: ByteArray,
        val payload: JSONObject
    )

    // ── Public entry point ───────────────────────────────────────────────────

    fun verify(context: Context, licenseText: String, deviceId: String): Result = try {
        val parsed = parseLicense(licenseText)
        if (!verifySignature(context, parsed)) return Result(false, "firma criptografica invalida", 0)

        val app = parsed.payload.optString("app", APP_ID)
        if (app != APP_ID) return Result(false, "licencia emitida para otra app", 0)

        val hwid = parsed.payload.optString("hwid", "")
        if (hwid.isNotEmpty() && hwid != deviceId) return Result(false, "licencia emitida para otro dispositivo", 0)

        val expiresAt = expiresAt(parsed.payload)
        if (expiresAt > 0 && System.currentTimeMillis() > expiresAt) return Result(false, "licencia expirada", expiresAt)

        val db = parsed.payload.optJSONObject("license_db")
            ?: return Result(false, "licencia sin configuracion Supabase", expiresAt)
        if (!db.optString("provider", "").equals("supabase", ignoreCase = true))
            return Result(false, "licencia sin configuracion Supabase", expiresAt)

        val supabaseUrl = db.optString("url", "").trimEnd('/')
        val anonKey    = db.optString("anon_key", "")
        if (supabaseUrl.isEmpty() || anonKey.isEmpty())
            return Result(false, "Supabase URL o anon key no configurados", expiresAt)

        verifySupabase(parsed, deviceId, supabaseUrl, anonKey, expiresAt)
    } catch (e: Exception) {
        Result(false, "No se pudo validar licencia: ${e.message}", 0)
    }

    // ── Parsing ───────────────────────────────────────────────────────────────

    private fun parseLicense(text: String): ParsedLicense {
        val normalized = normalize(text)
        if (!normalized.startsWith(PREFIX)) throw IllegalArgumentException("prefijo invalido")

        var body = normalized.substring(PREFIX.length).trim()
        if (body.startsWith(":") || body.startsWith(".")) body = body.substring(1).trim()

        val lines = body.split(Regex("\\n+"))
        val (payloadSegment, signatureSegment) = if (lines.size >= 2) {
            lines[0].trim() to lines[1].trim()
        } else {
            val parts = body.split(".")
            if (parts.size >= 2) parts[0].trim() to parts[1].trim()
            else throw IllegalArgumentException("formato invalido")
        }
        if (payloadSegment.isEmpty() || signatureSegment.isEmpty()) throw IllegalArgumentException("formato invalido")

        val payloadBytes = Base64.getUrlDecoder().decode(payloadSegment)
        val signature    = Base64.getUrlDecoder().decode(signatureSegment)
        val payload      = JSONObject(String(payloadBytes, StandardCharsets.UTF_8))
        return ParsedLicense(normalized, payloadSegment, signature, payload)
    }

    private fun normalize(text: String?): String =
        (text ?: "").replace("\r\n", "\n").replace("\r", "\n").trim()

    // ── Signature ─────────────────────────────────────────────────────────────

    private fun verifySignature(context: Context, parsed: ParsedLicense): Boolean {
        val verifier = Signature.getInstance("SHA256withRSA")
        verifier.initVerify(loadPublicKey(context))
        verifier.update(parsed.payloadSegment.toByteArray(StandardCharsets.UTF_8))
        return verifier.verify(parsed.signature)
    }

    private fun loadPublicKey(context: Context): PublicKey {
        val pem = context.assets.open("license-public-key.pem").bufferedReader().use { it.readText() }
        val clean = pem
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace(Regex("\\s"), "")
        if (clean.isEmpty() || clean.contains("REPLACE"))
            throw IllegalStateException("clave publica no configurada en assets/license-public-key.pem")
        val encoded = Base64.getDecoder().decode(clean)
        return KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(encoded))
    }

    // ── Expiry ────────────────────────────────────────────────────────────────

    private fun expiresAt(payload: JSONObject): Long =
        if (!payload.has("expires_at") || payload.isNull("expires_at")) 0L
        else payload.optLong("expires_at", 0L)

    // ── Supabase online check ─────────────────────────────────────────────────

    private fun verifySupabase(
        parsed: ParsedLicense,
        deviceId: String,
        supabaseUrl: String,
        anonKey: String,
        localExpiresAt: Long
    ): Result {
        var connection: HttpURLConnection? = null
        return try {
            val url = URL("$supabaseUrl/rest/v1/rpc/verify_license_public")
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 8_000
                readTimeout    = 8_000
                doOutput = true
                setRequestProperty("content-type", "application/json")
                setRequestProperty("apikey", anonKey)
                setRequestProperty("Authorization", "Bearer $anonKey")
            }
            val body = JSONObject().apply {
                put("p_id",           parsed.payload.optString("id", ""))
                put("p_hwid",         deviceId)
                put("p_license_hash", sha256(parsed.normalized))
            }.toString().toByteArray(StandardCharsets.UTF_8)
            connection.outputStream.use { it.write(body) }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val responseBody = readBody(stream)
            if (status !in 200..299) return Result(false, "Supabase HTTP $status: $responseBody", localExpiresAt)

            val response: JSONObject = if (responseBody.trim().startsWith("["))
                JSONArray(responseBody).optJSONObject(0)
                    ?: return Result(false, "respuesta Supabase vacia", localExpiresAt)
            else JSONObject(responseBody)

            val active    = response.optBoolean("active", false)
            val reason    = response.optString("reason", if (active) "ok" else "licencia no activa")
            val expiresAt = if (response.has("expires_at") && !response.isNull("expires_at"))
                response.optLong("expires_at", localExpiresAt) else localExpiresAt
            Result(active, reason, expiresAt)
        } catch (e: Exception) {
            Result(false, "No se pudo validar online: ${e.message}", localExpiresAt)
        } finally {
            connection?.disconnect()
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private fun readBody(stream: InputStream?): String {
        stream ?: return ""
        return BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
    }

    private fun sha256(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(text.toByteArray(StandardCharsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }
}
