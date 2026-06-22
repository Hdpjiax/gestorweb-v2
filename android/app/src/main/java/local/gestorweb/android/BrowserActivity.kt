package local.gestorweb.android

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
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
import com.google.android.material.bottomsheet.BottomSheetDialog

class BrowserActivity : AppCompatActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private val direct  = java.util.concurrent.Executor { it.run() }

    private lateinit var webView:        WebView
    private lateinit var etAddress:      EditText
    private lateinit var progressBar:    ProgressBar
    private lateinit var btnBack:        Button
    private lateinit var btnForward:     Button
    private lateinit var tvSecurityIcon: TextView

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
                        overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right)
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

        setContentView(R.layout.activity_browser)

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

        val pill = findViewById<TextView>(R.id.tvBrowserModePill)
        pill.text = p.privacyMode.uppercase()
        pill.setBackgroundResource(
            if (p.privacyMode == ProfileStore.MODE_STRICT) R.drawable.bg_pill_danger
            else R.drawable.bg_pill_accent
        )

        // Botones
        findViewById<Button>(R.id.btnCloseBrowser).setOnClickListener {
            finish()
            overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right)
        }
        btnBack.setOnClickListener    { if (webView.canGoBack())    webView.goBack() }
        btnForward.setOnClickListener { if (webView.canGoForward()) webView.goForward() }
        findViewById<Button>(R.id.btnRefresh).setOnClickListener { webView.reload() }

        // ── menú "más" ──────────────────────────────────────────────────────
        findViewById<Button>(R.id.btnMore).setOnClickListener { showMoreMenu() }

        etAddress.setOnEditorActionListener { _, _, _ -> navigate(etAddress.text.toString()); true }

        webView.setBackgroundColor(Color.rgb(10, 14, 22))
        configureWebView(p)
        applyProxyAndOpen(p)
        handler.postDelayed(licenseCheck, 60_000)
    }

    // ── bottom sheet menu ─────────────────────────────────────────────────────

    private fun showMoreMenu() {
        val sheet = BottomSheetDialog(this)
        val view  = layoutInflater.inflate(R.layout.sheet_browser_menu, null)
        sheet.setContentView(view)

        // Compartir URL
        view.findViewById<LinearLayout>(R.id.menuItemShare).setOnClickListener {
            val url = etAddress.text.toString()
            startActivity(Intent.createChooser(
                Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, url)
                }, getString(R.string.menu_share)
            ))
            sheet.dismiss()
        }

        // Copiar URL
        view.findViewById<LinearLayout>(R.id.menuItemCopy).setOnClickListener {
            val url = etAddress.text.toString()
            (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                .setPrimaryClip(ClipData.newPlainText("URL", url))
            Toast.makeText(this, getString(R.string.msg_url_copied), Toast.LENGTH_SHORT).show()
            sheet.dismiss()
        }

        // Limpiar caché y cookies del perfil
        view.findViewById<LinearLayout>(R.id.menuItemClearData).setOnClickListener {
            webView.clearCache(true)
            webView.clearHistory()
            CookieManager.getInstance().removeAllCookies(null)
            CookieManager.getInstance().flush()
            Toast.makeText(this, getString(R.string.msg_cache_cleared), Toast.LENGTH_SHORT).show()
            sheet.dismiss()
        }

        // Abrir en navegador externo
        view.findViewById<LinearLayout>(R.id.menuItemOpenExternal).setOnClickListener {
            val url = etAddress.text.toString()
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            } catch (e: Exception) {
                Toast.makeText(this, getString(R.string.msg_no_browser), Toast.LENGTH_SHORT).show()
            }
            sheet.dismiss()
        }

        sheet.show()
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
                btnBack.alpha    = if (webView.canGoBack())    1.0f else 0.4f
                btnForward.alpha = if (webView.canGoForward()) 1.0f else 0.4f
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false
            override fun onPageFinished(view: WebView, url: String) {
                etAddress.setText(url)
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
