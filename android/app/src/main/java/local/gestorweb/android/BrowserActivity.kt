package local.gestorweb.android

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.*
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.ProxyConfig
import androidx.webkit.ProxyController
import androidx.webkit.WebViewFeature

class BrowserActivity : AppCompatActivity() {

    private val BG     = Color.rgb(7,  10, 16)
    private val PANEL  = Color.rgb(15, 23, 36)
    private val PANEL2 = Color.rgb(20, 31, 48)
    private val BORDER = Color.rgb(42, 57, 83)
    private val TEXT   = Color.rgb(238, 244, 252)
    private val MUTED  = Color.rgb(143, 156, 178)
    private val ACCENT = Color.rgb(124, 92, 252)

    private val handler = Handler(Looper.getMainLooper())
    private val direct: java.util.concurrent.Executor = java.util.concurrent.Executor { it.run() }

    private lateinit var webView: WebView
    private lateinit var address: EditText
    private lateinit var profile: ProfileStore.Profile
    private lateinit var licenses: LicenseStore

    private val licenseCheck: Runnable = object : Runnable {
        override fun run() {
            Thread {
                val result = LicenseClient.verify(this@BrowserActivity, licenses.license(), licenses.deviceId())
                runOnUiThread {
                    if (!result.active) {
                        licenses.clearLicense()
                        startActivity(Intent(this@BrowserActivity, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
                        finish()
                    } else {
                        handler.postDelayed(this, 60_000)
                    }
                }
            }.start()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        licenses = LicenseStore(this)
        val profileId = intent.getStringExtra("profileId")
        val found = ProfileStore(this).list().firstOrNull { it.id == profileId }
        if (found == null || licenses.license().isEmpty()) { finish(); return }
        profile = found

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(BG)
            setPadding(dp(8), dp(8), dp(8), dp(8))
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), dp(8), dp(10), dp(8))
            background = rounded(PANEL, dp(18), BORDER)
            addView(text(profile.name, 16, TEXT, true))
            addView(text(
                "Modo ${profile.privacyMode}" + if (profile.proxy.isEmpty()) " · directo" else " · proxy activo",
                12, MUTED, false
            ))
        }
        root.addView(header, LinearLayout.LayoutParams(-1, -2))

        val toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(8), 0, dp(8))
        }
        val back = smallButton("‹").also { it.setOnClickListener { if (webView.canGoBack()) webView.goBack() } }
        toolbar.addView(back, LinearLayout.LayoutParams(dp(48), dp(48)))
        val refresh = smallButton("↻").also { it.setOnClickListener { webView.reload() } }
        toolbar.addView(refresh, LinearLayout.LayoutParams(dp(48), dp(48)).also { it.setMargins(dp(6), 0, dp(6), 0) })
        address = EditText(this).apply {
            isSingleLine = true
            setTextColor(TEXT)
            setHintTextColor(MUTED)
            background = rounded(PANEL2, dp(14), BORDER)
            setPadding(dp(12), 0, dp(12), 0)
            setOnEditorActionListener { _, _, _ -> navigate(text.toString()); true }
        }
        toolbar.addView(address, LinearLayout.LayoutParams(0, dp(48), 1f))
        root.addView(toolbar, LinearLayout.LayoutParams(-1, -2))

        webView = WebView(this).apply { setBackgroundColor(Color.rgb(16, 20, 28)) }
        configureWebView()
        root.addView(webView, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
        applyProxyAndOpen()
        handler.postDelayed(licenseCheck, 60_000)
    }

    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportMultipleWindows(true)
            setGeolocationEnabled(false)
            @Suppress("DEPRECATION") saveFormData = false
            mixedContentMode = if (profile.privacyMode == ProfileStore.MODE_COMPAT)
                WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE else WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = if (profile.privacyMode == ProfileStore.MODE_STRICT)
                WebSettings.LOAD_NO_CACHE else WebSettings.LOAD_DEFAULT
            if (profile.userAgent.isNotEmpty()) userAgentString = profile.userAgent
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(profile.privacyMode != ProfileStore.MODE_STRICT)
            setAcceptThirdPartyCookies(webView, profile.privacyMode == ProfileStore.MODE_COMPAT)
        }
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false
            override fun onPageFinished(view: WebView, url: String) { address.setText(url) }
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) { handler.cancel() }
        }
    }

    private fun applyProxyAndOpen() {
        val raw = profile.proxy
        if (raw.isEmpty() || !WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) { navigate(profile.url); return }
        val proxyUri = if (raw.contains("://")) raw else "http://$raw"
        val config = ProxyConfig.Builder().addProxyRule(proxyUri).addDirect().build()
        ProxyController.getInstance().setProxyOverride(config, direct) { navigate(profile.url) }
    }

    private fun navigate(raw: String?) {
        var value = raw?.trim() ?: ""
        if (value.isEmpty()) value = "about:blank"
        if (value != "about:blank" && Uri.parse(value).scheme == null) value = "https://$value"
        address.setText(value)
        webView.loadUrl(value)
    }

    private fun text(value: String, size: Int, color: Int, bold: Boolean): TextView =
        TextView(this).apply {
            text = value; textSize = size.toFloat(); setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
        }

    private fun smallButton(label: String): Button = Button(this).apply {
        text = label; setTextColor(Color.WHITE); textSize = 20f
        typeface = Typeface.DEFAULT_BOLD
        background = rounded(ACCENT, dp(14), 0)
    }

    private fun rounded(color: Int, radius: Int, strokeColor: Int): GradientDrawable =
        GradientDrawable().apply {
            setColor(color); cornerRadius = radius.toFloat()
            if (strokeColor != 0) setStroke(dp(1), strokeColor)
        }

    override fun onDestroy() {
        handler.removeCallbacks(licenseCheck)
        webView.stopLoading(); webView.destroy()
        if (WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE))
            ProxyController.getInstance().clearProxyOverride(direct) {}
        super.onDestroy()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()
}
