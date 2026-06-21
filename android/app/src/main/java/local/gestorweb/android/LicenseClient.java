package local.gestorweb.android;

import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class LicenseClient {
    static final class Result {
        final boolean active;
        final String reason;
        final long expiresAt;
        Result(boolean active, String reason, long expiresAt) {
            this.active = active; this.reason = reason; this.expiresAt = expiresAt;
        }
    }

    static Result verify(String licenseText, String deviceId) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(BuildConfig.LICENSE_SERVER_URL.replaceAll("/+$", "") + "/v1/verify");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setDoOutput(true);
            connection.setRequestProperty("content-type", "application/json");
            JSONObject request = new JSONObject();
            request.put("app", "gestor-web");
            request.put("hwid", deviceId);
            request.put("platform", "android");
            request.put("licenseText", licenseText);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(request.toString().getBytes(StandardCharsets.UTF_8));
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line; while ((line = reader.readLine()) != null) body.append(line);
            }
            JSONObject response = new JSONObject(body.toString());
            return new Result(response.optBoolean("active", false), response.optString("reason", "licencia no activa"), response.optLong("expiresAt", 0));
        } catch (Exception error) {
            return new Result(false, "No se pudo validar online: " + error.getMessage(), 0);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
