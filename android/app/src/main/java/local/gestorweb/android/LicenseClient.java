package local.gestorweb.android;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

final class LicenseClient {
    private static final String PREFIX = "GW-LIC-V1";
    private static final String APP_ID = "gestor-web";

    static final class Result {
        final boolean active;
        final String reason;
        final long expiresAt;
        Result(boolean active, String reason, long expiresAt) {
            this.active = active; this.reason = reason; this.expiresAt = expiresAt;
        }
    }

    private static final class ParsedLicense {
        final String normalized;
        final String payloadSegment;
        final byte[] signature;
        final JSONObject payload;
        ParsedLicense(String normalized, String payloadSegment, byte[] signature, JSONObject payload) {
            this.normalized = normalized;
            this.payloadSegment = payloadSegment;
            this.signature = signature;
            this.payload = payload;
        }
    }

    static Result verify(Context context, String licenseText, String deviceId) {
        try {
            ParsedLicense parsed = parseLicense(licenseText);
            if (!verifySignature(context, parsed)) return new Result(false, "firma criptografica invalida", 0);

            String app = parsed.payload.optString("app", APP_ID);
            if (!APP_ID.equals(app)) return new Result(false, "licencia emitida para otra app", 0);

            String hwid = parsed.payload.optString("hwid", "");
            if (!hwid.isEmpty() && !hwid.equals(deviceId)) return new Result(false, "licencia emitida para otro dispositivo", 0);

            long expiresAt = expiresAt(parsed.payload);
            if (expiresAt > 0 && System.currentTimeMillis() > expiresAt) return new Result(false, "licencia expirada", expiresAt);

            JSONObject db = parsed.payload.optJSONObject("license_db");
            if (db == null || !"supabase".equalsIgnoreCase(db.optString("provider", ""))) {
                return new Result(false, "licencia sin configuracion Supabase", expiresAt);
            }

            String supabaseUrl = db.optString("url", "").replaceAll("/+$", "");
            String anonKey = db.optString("anon_key", "");
            if (supabaseUrl.isEmpty() || anonKey.isEmpty()) return new Result(false, "Supabase URL o anon key no configurados", expiresAt);

            return verifySupabase(parsed, deviceId, supabaseUrl, anonKey, expiresAt);
        } catch (Exception error) {
            return new Result(false, "No se pudo validar licencia: " + error.getMessage(), 0);
        }
    }

    private static ParsedLicense parseLicense(String text) throws Exception {
        String normalized = normalizeLicenseText(text);
        if (!normalized.startsWith(PREFIX)) throw new IllegalArgumentException("prefijo invalido");

        String body = normalized.substring(PREFIX.length()).trim();
        if (body.startsWith(":") || body.startsWith(".")) body = body.substring(1).trim();

        String payloadSegment = "";
        String signatureSegment = "";
        String[] lines = body.split("\\n+");
        if (lines.length >= 2) {
            payloadSegment = lines[0].trim();
            signatureSegment = lines[1].trim();
        } else {
            String[] parts = body.split("\\.");
            if (parts.length >= 2) {
                payloadSegment = parts[0].trim();
                signatureSegment = parts[1].trim();
            }
        }
        if (payloadSegment.isEmpty() || signatureSegment.isEmpty()) throw new IllegalArgumentException("formato invalido");

        byte[] payloadBytes = Base64.getUrlDecoder().decode(payloadSegment);
        byte[] signature = Base64.getUrlDecoder().decode(signatureSegment);
        JSONObject payload = new JSONObject(new String(payloadBytes, StandardCharsets.UTF_8));
        return new ParsedLicense(normalized, payloadSegment, signature, payload);
    }

    private static String normalizeLicenseText(String text) {
        return String.valueOf(text == null ? "" : text).replace("\r\n", "\n").replace("\r", "\n").trim();
    }

    private static boolean verifySignature(Context context, ParsedLicense parsed) throws Exception {
        Signature verifier = Signature.getInstance("SHA256withRSA");
        verifier.initVerify(loadPublicKey(context));
        verifier.update(parsed.payloadSegment.getBytes(StandardCharsets.UTF_8));
        return verifier.verify(parsed.signature);
    }

    private static PublicKey loadPublicKey(Context context) throws Exception {
        StringBuilder pem = new StringBuilder();
        try (InputStream input = context.getAssets().open("license-public-key.pem");
             BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) pem.append(line).append('\n');
        }
        String clean = pem.toString()
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replaceAll("\\s", "");
        if (clean.isEmpty() || clean.contains("REPLACE")) throw new IllegalStateException("clave publica no configurada en assets/license-public-key.pem");
        byte[] encoded = Base64.getDecoder().decode(clean);
        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(encoded));
    }

    private static long expiresAt(JSONObject payload) {
        if (!payload.has("expires_at") || payload.isNull("expires_at")) return 0;
        return payload.optLong("expires_at", 0);
    }

    private static Result verifySupabase(ParsedLicense parsed, String deviceId, String supabaseUrl, String anonKey, long localExpiresAt) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(supabaseUrl + "/rest/v1/rpc/verify_license_public");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setDoOutput(true);
            connection.setRequestProperty("content-type", "application/json");
            connection.setRequestProperty("apikey", anonKey);
            connection.setRequestProperty("Authorization", "Bearer " + anonKey);

            JSONObject request = new JSONObject();
            request.put("p_id", parsed.payload.optString("id", ""));
            request.put("p_hwid", deviceId);
            request.put("p_license_hash", sha256(parsed.normalized));
            try (OutputStream output = connection.getOutputStream()) {
                output.write(request.toString().getBytes(StandardCharsets.UTF_8));
            }

            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
            String body = readBody(stream);
            if (status < 200 || status >= 300) return new Result(false, "Supabase HTTP " + status + ": " + body, localExpiresAt);

            JSONObject response;
            if (body.trim().startsWith("[")) response = new JSONArray(body).optJSONObject(0);
            else response = new JSONObject(body);
            if (response == null) return new Result(false, "respuesta Supabase vacia", localExpiresAt);

            boolean active = response.optBoolean("active", false);
            String reason = response.optString("reason", active ? "ok" : "licencia no activa");
            long expiresAt = response.has("expires_at") && !response.isNull("expires_at") ? response.optLong("expires_at", localExpiresAt) : localExpiresAt;
            return new Result(active, reason, expiresAt);
        } catch (Exception error) {
            return new Result(false, "No se pudo validar online: " + error.getMessage(), localExpiresAt);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static String readBody(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        }
        return body.toString();
    }

    private static String sha256(String text) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte value : digest) hex.append(String.format("%02x", value));
        return hex.toString();
    }
}
