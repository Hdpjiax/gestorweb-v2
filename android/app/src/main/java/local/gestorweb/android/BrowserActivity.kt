package local.gestorweb.android

import android.annotation.SuppressLint
import android.app.AlertDialog
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

    // ── spoof state ──────────────────────────────────────────────────────────
    private var spoofCanvas   = false
    private var spoofWebGL    = false
    private var spoofTimezone = false
    private var spoofLang     = false
    private var desktopMode   = false
    private var darkModeInject = false

    // JS inyectado al final de cada página
    private val spoofScript: String get() = buildString {
        if (spoofCanvas) append(JS_SPOOF_CANVAS)
        if (spoofWebGL)  append(JS_SPOOF_WEBGL)
        if (spoofTimezone) append(JS_SPOOF_TIMEZONE)
        if (spoofLang)   append(JS_SPOOF_LANG)
        if (darkModeInject) append(JS_DARK_MODE)
    }

    // ── license check ──────────────────────────────────────────────────────
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
        licenses  = LicenseStore(this)
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
            if (p.proxy.isEmpty()) getString(R.string.label_direct_suffix) else getString(R.string.label_proxy_suffix)
        findViewById<TextView>(R.id.tvBrowserProfileMode).text = modeStr

        val pill = findViewById<TextView>(R.id.tvBrowserModePill)
        pill.text = p.privacyMode.uppercase()
        pill.setBackgroundResource(
            if (p.privacyMode == ProfileStore.MODE_STRICT) R.drawable.bg_pill_danger
            else R.drawable.bg_pill_accent
        )

        // Nav buttons
        findViewById<Button>(R.id.btnCloseBrowser).setOnClickListener {
            finish()
            overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right)
        }
        btnBack.setOnClickListener    { if (webView.canGoBack())    webView.goBack() }
        btnForward.setOnClickListener { if (webView.canGoForward()) webView.goForward() }
        findViewById<Button>(R.id.btnRefresh).setOnClickListener { webView.reload() }
        findViewById<Button>(R.id.btnMore).setOnClickListener { showMoreMenu() }

        etAddress.setOnEditorActionListener { _, _, _ -> navigate(etAddress.text.toString()); true }

        webView.setBackgroundColor(Color.rgb(10, 14, 22))
        configureWebView(p)
        applyProxyAndOpen(p)
        handler.postDelayed(licenseCheck, 60_000)
    }

    // ── WebView setup ───────────────────────────────────────────────────────

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
                progressBar.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
                progressBar.progress   = newProgress
                btnBack.alpha    = if (webView.canGoBack())    1f else 0.4f
                btnForward.alpha = if (webView.canGoForward()) 1f else 0.4f
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false
            override fun onPageFinished(view: WebView, url: String) {
                etAddress.setText(url)
                tvSecurityIcon.text = if (url.startsWith("https://"))
                    getString(R.string.label_secure) else getString(R.string.label_insecure)
                btnBack.alpha    = if (view.canGoBack())    1f else 0.4f
                btnForward.alpha = if (view.canGoForward()) 1f else 0.4f
                // Inject spoof scripts after every page load
                val script = spoofScript
                if (script.isNotEmpty()) view.evaluateJavascript(script, null)
            }
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.cancel()
            }
        }
    }

    // ── bottom sheet menu ─────────────────────────────────────────────────────

    private fun showMoreMenu() {
        val sheet = BottomSheetDialog(this)
        val view  = layoutInflater.inflate(R.layout.sheet_browser_menu, null)
        sheet.setContentView(view)

        // Estado visual de toggles
        fun stateStr(on: Boolean) = if (on) getString(R.string.menu_state_on) else getString(R.string.menu_state_off)
        view.findViewById<TextView>(R.id.tvCanvasState).text   = stateStr(spoofCanvas)
        view.findViewById<TextView>(R.id.tvWebGLState).text    = stateStr(spoofWebGL)
        view.findViewById<TextView>(R.id.tvTimezoneState).text = stateStr(spoofTimezone)
        view.findViewById<TextView>(R.id.tvLangState).text     = stateStr(spoofLang)
        view.findViewById<TextView>(R.id.tvDesktopModeState).text = stateStr(desktopMode)
        view.findViewById<TextView>(R.id.tvDarkModeState).text    = stateStr(darkModeInject)

        // ─ Acciones básicas ─
        view.findViewById<LinearLayout>(R.id.menuItemShare).setOnClickListener {
            startActivity(Intent.createChooser(
                Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, etAddress.text.toString()) },
                getString(R.string.menu_share)
            ))
            sheet.dismiss()
        }
        view.findViewById<LinearLayout>(R.id.menuItemCopy).setOnClickListener {
            (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                .setPrimaryClip(ClipData.newPlainText("URL", etAddress.text.toString()))
            toast(R.string.msg_url_copied); sheet.dismiss()
        }
        view.findViewById<LinearLayout>(R.id.menuItemOpenExternal).setOnClickListener {
            try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(etAddress.text.toString()))) }
            catch (e: Exception) { toast(R.string.msg_no_browser) }
            sheet.dismiss()
        }

        // ─ Desktop mode ─
        view.findViewById<LinearLayout>(R.id.menuItemDesktopMode).setOnClickListener {
            desktopMode = !desktopMode
            val ua = if (desktopMode) UA_DESKTOP else (profile?.userAgent?.ifEmpty { null } ?: webView.settings.defaultUserAgent)
            webView.settings.userAgentString = ua
            webView.reload()
            toast(if (desktopMode) R.string.msg_desktop_on else R.string.msg_desktop_off)
            sheet.dismiss()
        }

        // ─ Dark mode inject ─
        view.findViewById<LinearLayout>(R.id.menuItemDarkMode).setOnClickListener {
            darkModeInject = !darkModeInject
            if (darkModeInject) webView.evaluateJavascript(JS_DARK_MODE, null)
            else webView.evaluateJavascript(JS_REMOVE_DARK, null)
            toast(if (darkModeInject) R.string.msg_dark_on else R.string.msg_dark_off)
            sheet.dismiss()
        }

        // ─ Spoof Canvas ─
        view.findViewById<LinearLayout>(R.id.menuItemSpoofCanvas).setOnClickListener {
            spoofCanvas = !spoofCanvas
            if (spoofCanvas) webView.evaluateJavascript(JS_SPOOF_CANVAS, null)
            toast(if (spoofCanvas) R.string.msg_canvas_on else R.string.msg_canvas_off)
            sheet.dismiss()
        }

        // ─ Spoof WebGL ─
        view.findViewById<LinearLayout>(R.id.menuItemSpoofWebGL).setOnClickListener {
            spoofWebGL = !spoofWebGL
            if (spoofWebGL) webView.evaluateJavascript(JS_SPOOF_WEBGL, null)
            toast(if (spoofWebGL) R.string.msg_webgl_on else R.string.msg_webgl_off)
            sheet.dismiss()
        }

        // ─ Spoof Timezone ─
        view.findViewById<LinearLayout>(R.id.menuItemSpoofTimezone).setOnClickListener {
            sheet.dismiss()
            val tzOptions = arrayOf("America/New_York", "America/Chicago", "America/Los_Angeles",
                "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
                "America/Mexico_City", "America/Bogota", "America/Sao_Paulo")
            AlertDialog.Builder(this)
                .setTitle(getString(R.string.menu_spoof_timezone))
                .setItems(tzOptions) { _, which ->
                    spoofTimezone = true
                    val tz = tzOptions[which]
                    webView.evaluateJavascript(jsTimezone(tz), null)
                    toast(getString(R.string.msg_tz_set) + " $tz")
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    spoofTimezone = false
                    webView.evaluateJavascript(JS_RESTORE_TZ, null)
                }
                .show()
        }

        // ─ Spoof Language ─
        view.findViewById<LinearLayout>(R.id.menuItemSpoofLang).setOnClickListener {
            sheet.dismiss()
            val langOptions = arrayOf(
                "en-US", "en-GB", "es-MX", "es-ES", "fr-FR",
                "de-DE", "pt-BR", "zh-CN", "ja-JP", "ru-RU", "ar-SA"
            )
            AlertDialog.Builder(this)
                .setTitle(getString(R.string.menu_spoof_lang))
                .setItems(langOptions) { _, which ->
                    spoofLang = true
                    val lang = langOptions[which]
                    webView.evaluateJavascript(jsLang(lang), null)
                    toast(getString(R.string.msg_lang_set) + " $lang")
                }
                .setNegativeButton(getString(R.string.btn_cancel)) { _, _ ->
                    spoofLang = false
                    webView.evaluateJavascript(JS_RESTORE_LANG, null)
                }
                .show()
        }

        // ─ Limpiar datos ─
        view.findViewById<LinearLayout>(R.id.menuItemClearData).setOnClickListener {
            webView.clearCache(true)
            webView.clearHistory()
            CookieManager.getInstance().removeAllCookies(null)
            CookieManager.getInstance().flush()
            toast(R.string.msg_cache_cleared)
            sheet.dismiss()
        }

        sheet.show()
    }

    // ── proxy + navigation ────────────────────────────────────────────────────

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

    // ── helpers ─────────────────────────────────────────────────────────────

    private fun toast(resId: Int) = Toast.makeText(this, resId, Toast.LENGTH_SHORT).show()
    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    // ── JS spoof scripts ─────────────────────────────────────────────────────

    companion object {

        const val UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

        // Canvas fingerprint noise
        val JS_SPOOF_CANVAS = """
            (function(){
              const orig = HTMLCanvasElement.prototype.toDataURL;
              HTMLCanvasElement.prototype.toDataURL = function(type){
                const ctx = this.getContext('2d');
                if(ctx){
                  const imgData = ctx.getImageData(0,0,this.width,this.height);
                  for(let i=0;i<imgData.data.length;i+=4){
                    imgData.data[i]   ^= (Math.random()*2)|0;
                    imgData.data[i+1] ^= (Math.random()*2)|0;
                    imgData.data[i+2] ^= (Math.random()*2)|0;
                  }
                  ctx.putImageData(imgData,0,0);
                }
                return orig.apply(this,arguments);
              };
              const origBlob = HTMLCanvasElement.prototype.toBlob;
              HTMLCanvasElement.prototype.toBlob = function(cb,type,q){
                const ctx = this.getContext('2d');
                if(ctx){
                  const imgData = ctx.getImageData(0,0,this.width,this.height);
                  for(let i=0;i<imgData.data.length;i+=4){
                    imgData.data[i]   ^= (Math.random()*2)|0;
                    imgData.data[i+1] ^= (Math.random()*2)|0;
                    imgData.data[i+2] ^= (Math.random()*2)|0;
                  }
                  ctx.putImageData(imgData,0,0);
                }
                return origBlob.apply(this,arguments);
              };
            })();
        """.trimIndent()

        // WebGL vendor / renderer spoof
        val JS_SPOOF_WEBGL = """
            (function(){
              const getParam = WebGLRenderingContext.prototype.getParameter;
              WebGLRenderingContext.prototype.getParameter = function(p){
                if(p===37445) return 'Intel Inc.';
                if(p===37446) return 'Intel Iris OpenGL Engine';
                return getParam.call(this,p);
              };
              try{
                const getParam2 = WebGL2RenderingContext.prototype.getParameter;
                WebGL2RenderingContext.prototype.getParameter = function(p){
                  if(p===37445) return 'Intel Inc.';
                  if(p===37446) return 'Intel Iris OpenGL Engine';
                  return getParam2.call(this,p);
                };
              }catch(e){}
            })();
        """.trimIndent()

        // Dark mode CSS injection
        val JS_DARK_MODE = """
            (function(){
              if(document.getElementById('__gw_dark'))return;
              const s=document.createElement('style');
              s.id='__gw_dark';
              s.textContent='html{filter:invert(1) hue-rotate(180deg)!important}'+
                'img,video,canvas,iframe{filter:invert(1) hue-rotate(180deg)!important}';
              document.head.appendChild(s);
            })();
        """.trimIndent()

        val JS_REMOVE_DARK = """
            (function(){const s=document.getElementById('__gw_dark');if(s)s.remove();})();
        """.trimIndent()

        // Restore timezone / lang (remove overrides)
        val JS_RESTORE_TZ = """
            (function(){
              try{ delete Date.prototype.getTimezoneOffset; }catch(e){}
            })();
        """.trimIndent()

        val JS_RESTORE_LANG = """
            (function(){
              try{ delete navigator.language; delete navigator.languages; }catch(e){}
            })();
        """.trimIndent()

        fun jsTimezone(tz: String) = """
            (function(){
              const tzName = '$tz';
              const origOffset = Date.prototype.getTimezoneOffset;
              try {
                const offset = -new Intl.DateTimeFormat('en',{timeZone:tzName,timeZoneName:'short'})
                  .formatToParts(new Date()).reduce((a,p)=>a,0);
                Object.defineProperty(Intl,'DateTimeFormat',{
                  value: new Proxy(Intl.DateTimeFormat,{
                    construct(t,args){
                      if(!args[1]) args[1]={};
                      args[1].timeZone = tzName;
                      return Reflect.construct(t,args);
                    }
                  })
                });
                Object.defineProperty(Date.prototype,'getTimezoneOffset',{
                  value: function(){
                    const d=new Date();
                    const utc=d.getTime()+(origOffset.call(d)*60000);
                    const tzD=new Date(new Date(utc).toLocaleString('en-US',{timeZone:tzName}));
                    return (utc - tzD.getTime()) / 60000;
                  }
                });
              }catch(e){}
            })();
        """.trimIndent()

        fun jsLang(lang: String) = """
            (function(){
              try{
                Object.defineProperty(navigator,'language', {get:()=>'$lang'});
                Object.defineProperty(navigator,'languages',{get:()=>['$lang']});
              }catch(e){}
            })();
        """.trimIndent()
    }
}
