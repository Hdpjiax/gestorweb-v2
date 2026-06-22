package local.gestorweb.android

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.*
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.ProxyConfig
import androidx.webkit.ProxyController
import androidx.webkit.WebViewFeature

class BrowserActivity : AppCompatActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private val direct  = java.util.concurrent.Executor { it.run() }

    // XML view refs
    private lateinit var webView:          WebView
    private lateinit var etAddress:        EditText
    private lateinit var progressBar:      ProgressBar
    private lateinit var btnBack:          Button
    private lateinit var btnForward:       Button
    private lateinit var tvSecurityIcon:   TextView

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

        // Inflate layout
        setContentView(R.layout.activity_browser)

        // Bind views
        webView        = findViewById(R.id.webView)
        etAddress      = findViewById(R.id.etAddress)
        progressBar    = findViewById(R.id.browserProgress)
        btnBack        = findViewById(R.id.btnBack)
        btnForward     = findViewById(R.id.btnForward)
        tvSecurityIcon = findViewById(R.id.tvSecurityIcon)

        // Title bar
        findViewById<TextView>(R.id.tvBrowserProfileName).text = p.name
        val modeStr = getString(R.string.label_mode_prefix) + p.privacyMode +
            if (p.proxy.isEmpty()) getString(R.string.label_direct_suffix)
            else getString(R.string.label_proxy_suffix)
        findViewById<TextView>(R.id.tvBrowserProfileMode).text = modeStr

        // Mode pill color
        val pill = findViewById<TextView>(R.id.tvBrowserModePill)
        pill.text = p.privacyMode.uppercase()
        pill.setBackgroundResource(
            if (p.privacyMode == ProfileStore.MODE_STRICT) R.drawable.bg_pill_danger
            else R.drawable.bg_pill_accent
        )

        // Close button
        findViewById<Button>(R.id.btnCloseBrowser).setOnClickListener { finish() }

        // Toolbar actions
        btnBack.setOnClickListener    { if (webView.canGoBack())    webView.goBack() }
        btnForward.setOnClickListener { if (webView.canGoForward()) webView.goForward() }
        findViewById<Button>(R.id.btnRefresh).setOnClickListener { webView.reload() }
        findViewById<Button>(R.id.btnMore).setOnClickListener {
            // TODO: expandable menu (share, copy URL, clear cache)
            Toast.makeText(this, "Próximamente", Toast.LENGTH_SHORT).show()
        }

        etAddress.setOnEditorActionListener { _, _, _ -> navigate(etAddress.text.toString()); true }

        webView.setBackgroundColor(Color.rgb(10, 14, 22))
        configureWebView(p)
        applyProxyAndOpen(p)
        handler.postDelayed(licenseCheck, 60_000)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(p: ProfileStore.Profile) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled   = true
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
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress   = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
                // Update back / forward state
                btnBack.alpha    = if (webView.canGoBack())    1.0f else 0.4f
                btnForward.alpha = if (webView.canGoForward()) 1.0f else 0.4f
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false
            override fun onPageFinished(view: WebView, url: String) {
                etAddress.setText(url)
                // Security icon
                tvSecurityIcon.text = if (url.startsWith("https://"))
                    getString(R.string.label_secure) else getString(R.string.label_insecure)
                btnBack.alpha    = if (view.canGoBack())    1.0f else 0.4f
                btnForward.alpha = if (view.canGoForward()) 1.0f else 0.4f
            }
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.cancel()
            }
        }
    }

    private fun applyProxyAndOpen(p: ProfileStore.Profile) {
        if (p.proxy.isEmpty() || !WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) {
            navigate(p.url); return
        }
        val proxy  = if ("://" in p.proxy) p.proxy else "http://${p.proxy}"
        val config = ProxyConfig.Builder().addProxyRule(proxy).addDirect().build()
        ProxyController.getInstance().setProxyOverride(config, direct) { navigate(p.url) }
    }

    private fun navigate(raw: String?) {
        var value = raw?.trim()?.ifEmpty { "about:blank" } ?: "about:blank"
        if (value != "about:blank" && Uri.parse(value).scheme == null) value = "https://$value"
        etAddress.setText(value)
        webView.loadUrl(value)
    }

    override fun onDestroy() {
        handler.removeCallbacks(licenseCheck)
        webView.stopLoading(); webView.destroy()
        if (WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE))
            ProxyController.getInstance().clearProxyOverride(direct) {}
        super.onDestroy()
    }
}
