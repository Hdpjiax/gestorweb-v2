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
import android.view.Gravity
import android.webkit.*
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.ProxyConfig
import androidx.webkit.ProxyController
import androidx.webkit.WebViewFeature

class BrowserActivity : AppCompatActivity() {

    private val BG     get() = color(R.color.gw_bg)
    private val PANEL  get() = color(R.color.gw_panel)
    private val PANEL2 get() = color(R.color.gw_panel_2)
    private val BORDER get() = color(R.color.gw_border)
    private val TEXT   get() = color(R.color.gw_text)
    private val MUTED  get() = color(R.color.gw_muted)
    private val ACCENT get() = color(R.color.gw_accent)

    private val handler = Handler(Looper.getMainLooper())
    private val direct  = java.util.concurrent.Executor { it.run() }
    private lateinit var webView: WebView
    private lateinit var address: EditText
    private lateinit var licenses: LicenseStore
    private var profile: ProfileStore.Profile? = null

    private val licenseCheck = object : Runnable {
        override fun run() {
            Thread {
                val result = LicenseClient.verify(this@BrowserActivity, licenses.license(), licenses.deviceId())
                runOnUiThread {
                    if (!result.active) {
                        licenses.clearLicense()
                        startActivity(Intent(this@BrowserActivity, MainActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
                        finish()
                    } else handler.postDelayed(this, 60_000)
                }
            }.start()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        licenses = LicenseStore(this)
        val profileId = intent.getStringExtra("profileId")
        profile = ProfileStore(this).list().firstOrNull { it.id == profileId }
        if (profile == null || licenses.license().isEmpty()) { finish(); return }
        val p = profile!!

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(BG)
            setPadding(dp(8), dp(8), dp(8), dp(8))
        }

        // Profile header
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = rounded(PANEL, dp(18), BORDER)
            addView(text(p.name, 15, TEXT, true))
            addView(text(
                getString(R.string.label_mode_prefix) + p.privacyMode +
                    if (p.proxy.isEmpty()) getString(R.string.label_direct_suffix)
                    else getString(R.string.label_proxy_suffix),
                12, MUTED, false
            ))
        }
        root.addView(header, lp(height = LinearLayout.LayoutParams.WRAP_CONTENT))

        // Toolbar
        val toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(8), 0, dp(8))
        }
        val backBtn = navButton(getString(R.string.btn_back)).also { btn ->
            btn.setOnClickListener { if (webView.canGoBack()) webView.goBack() }
        }
        val refreshBtn = navButton(getString(R.string.btn_refresh)).also { btn ->
            btn.setOnClickListener { webView.reload() }
        }
        address = EditText(this).apply {
            isSingleLine = true
            setTextColor(TEXT)
            setHintTextColor(MUTED)
            hint = "https://"
            background = rounded(PANEL2, dp(14), BORDER)
            setPadding(dp(12), 0, dp(12), 0)
            setOnEditorActionListener { _, _, _ -> navigate(text.toString()); true }
        }
        toolbar.addView(backBtn,    lp(matchParent = false, height = dp(46), width = dp(46)))
        toolbar.addView(refreshBtn, lp(matchParent = false, height = dp(46), width = dp(46), leftMargin = dp(6)))
        toolbar.addView(address,    lp(weight = 1f, height = dp(46), leftMargin = dp(6)))
        root.addView(toolbar, lp(height = LinearLayout.LayoutParams.WRAP_CONTENT))

        // WebView
        webView = WebView(this).apply { setBackgroundColor(Color.rgb(10, 14, 22)) }
        configureWebView(p)
        root.addView(webView, LinearLayout.LayoutParams(-1, 0, 1f))

        setContentView(root)
        applyProxyAndOpen(p)
        handler.postDelayed(licenseCheck, 60_000)
    }

    private fun configureWebView(p: ProfileStore.Profile) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportMultipleWindows(true)
            setGeolocationEnabled(false)
            @Suppress("DEPRECATION") saveFormData = false
            mixedContentMode = if (p.privacyMode == ProfileStore.MODE_COMPAT)
                WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE else WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = if (p.privacyMode == ProfileStore.MODE_STRICT)
                WebSettings.LOAD_NO_CACHE else WebSettings.LOAD_DEFAULT
            if (p.userAgent.isNotEmpty()) userAgentString = p.userAgent
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(p.privacyMode != ProfileStore.MODE_STRICT)
            setAcceptThirdPartyCookies(webView, p.privacyMode == ProfileStore.MODE_COMPAT)
        }
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false
            override fun onPageFinished(view: WebView, url: String) { address.setText(url) }
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.cancel()
            }
        }
    }

    private fun applyProxyAndOpen(p: ProfileStore.Profile) {
        if (p.proxy.isEmpty() || !WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) {
            navigate(p.url); return
        }
        val proxy = if ("://" in p.proxy) p.proxy else "http://${p.proxy}"
        val config = ProxyConfig.Builder().addProxyRule(proxy).addDirect().build()
        ProxyController.getInstance().setProxyOverride(config, direct) { navigate(p.url) }
    }

    private fun navigate(raw: String?) {
        var value = raw?.trim()?.ifEmpty { "about:blank" } ?: "about:blank"
        if (value != "about:blank" && Uri.parse(value).scheme == null) value = "https://$value"
        address.setText(value)
        webView.loadUrl(value)
    }

    override fun onDestroy() {
        handler.removeCallbacks(licenseCheck)
        webView.stopLoading(); webView.destroy()
        if (WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE))
            ProxyController.getInstance().clearProxyOverride(direct) {}
        super.onDestroy()
    }

    // ── view helpers ─────────────────────────────────────────────────────────

    private fun text(value: String, size: Int, color: Int, bold: Boolean) = TextView(this).apply {
        text = value; textSize = size.toFloat(); setTextColor(color)
        if (bold) typeface = Typeface.DEFAULT_BOLD
    }

    private fun navButton(label: String) = Button(this).apply {
        text = label; setTextColor(Color.WHITE); textSize = 20f
        typeface = Typeface.DEFAULT_BOLD
        background = rounded(ACCENT, dp(14), 0)
        gravity = Gravity.CENTER
    }

    private fun rounded(color: Int, radius: Int, strokeColor: Int) = GradientDrawable().apply {
        setColor(color); cornerRadius = radius.toFloat()
        if (strokeColor != 0) setStroke(dp(1), strokeColor)
    }

    private fun lp(
        matchParent: Boolean = true,
        height: Int = LinearLayout.LayoutParams.WRAP_CONTENT,
        width: Int = LinearLayout.LayoutParams.MATCH_PARENT,
        weight: Float = 0f,
        leftMargin: Int = 0
    ) = LinearLayout.LayoutParams(
        if (matchParent) LinearLayout.LayoutParams.MATCH_PARENT else width, height, weight
    ).also { it.setMargins(leftMargin, 0, 0, 0) }

    private fun color(res: Int) = getColor(res)
    private fun dp(value: Int) = Math.round(value * resources.displayMetrics.density)
}
