package local.gestorweb.android

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.*
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    // ── colours (mirrored from res/values/colors.xml for programmatic use) ──
    private val BG      get() = color(R.color.gw_bg)
    private val PANEL   get() = color(R.color.gw_panel)
    private val PANEL2  get() = color(R.color.gw_panel_2)
    private val BORDER  get() = color(R.color.gw_border)
    private val TEXT    get() = color(R.color.gw_text)
    private val MUTED   get() = color(R.color.gw_muted)
    private val ACCENT  get() = color(R.color.gw_accent)
    private val ACCENT2 get() = color(R.color.gw_accent_2)
    private val DANGER  get() = color(R.color.gw_danger)
    private val SUCCESS get() = color(R.color.gw_success)

    private lateinit var licenses: LicenseStore
    private lateinit var profiles: ProfileStore

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        licenses = LicenseStore(this)
        profiles = ProfileStore(this)
        validateAndRender()
    }

    override fun onResume() {
        super.onResume()
        if (::licenses.isInitialized && licenses.license().isNotEmpty()) validateAndRender()
    }

    // ── core flow ────────────────────────────────────────────────────────────

    private fun validateAndRender() {
        val key = licenses.license()
        if (key.isEmpty()) { renderActivation(""); return }
        renderLoading()
        Thread {
            val result = LicenseClient.verify(this, key, licenses.deviceId())
            runOnUiThread {
                if (result.active) renderDashboard()
                else { licenses.clearLicense(); renderActivation(result.reason) }
            }
        }.start()
    }

    // ── screens ──────────────────────────────────────────────────────────────

    private fun renderLoading() {
        val root = baseRoot().apply {
            gravity = Gravity.CENTER
            addView(label(getString(R.string.label_loading_title), 28, TEXT, true))
            addView(spacer(8))
            addView(label(getString(R.string.label_loading_desc), 15, MUTED, false))
        }
        setContentView(root)
    }

    private fun renderActivation(error: String) {
        val root = baseRoot().apply {
            addView(label(getString(R.string.label_brand), 12, ACCENT2, true))
            addView(spacer(4))
            addView(label(getString(R.string.label_activation_title), 30, TEXT, true))
            addView(spacer(4))
            addView(label(getString(R.string.label_activation_desc), 14, MUTED, false))

            // Device ID card
            addView(card().apply {
                addView(sectionLabel(getString(R.string.label_device_id_title)))
                addView(spacer(6))
                addView(label(licenses.deviceId(), 14, TEXT, true).also { it.isTextSelectable = true })
                addView(spacer(6))
                addView(ghostButton(getString(R.string.btn_copy_hwid)).also { btn ->
                    btn.setOnClickListener {
                        clipboard(getString(R.string.clipboard_hwid_label), licenses.deviceId())
                    }
                })
            })

            // Licence form card
            addView(card().apply {
                addView(label(getString(R.string.label_license_title), 20, TEXT, true))
                addView(spacer(4))
                addView(label(getString(R.string.label_license_desc), 13, MUTED, false))
                val licInput = EditText(this@MainActivity).apply {
                    hint = getString(R.string.hint_license)
                    setHintTextColor(MUTED)
                    setTextColor(TEXT)
                    inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
                    minLines = 4
                    background = rounded(PANEL2, dp(14), BORDER)
                    setPadding(dp(14), dp(10), dp(14), dp(10))
                }
                addView(licInput, lp(matchParent = true, height = dp(130), topMargin = dp(8)))
                if (error.isNotEmpty()) {
                    addView(spacer(6))
                    addView(label(error, 13, DANGER, false))
                }
                addView(primaryButton(getString(R.string.btn_activate)).also { btn ->
                    btn.setOnClickListener {
                        val text = licInput.text.toString().trim()
                        if (text.isNotEmpty()) {
                            licenses.saveLicense(text)
                            validateAndRender()
                        }
                    }
                })
            })
        }
        scroll(root)
    }

    private fun renderDashboard() {
        val list = profiles.list()
        val root = baseRoot().apply {
            addView(label(getString(R.string.label_dashboard_brand), 11, ACCENT2, true))
            addView(spacer(4))
            addView(label(getString(R.string.label_dashboard_title), 30, TEXT, true))
            addView(spacer(4))
            addView(label(getString(R.string.label_dashboard_desc), 13, MUTED, false))
            addView(spacer(6))

            // Stats row
            addView(row().apply {
                addView(statCard(getString(R.string.label_stat_profiles), list.size.toString()),
                    lp(weight = 1f, rightMargin = dp(6)))
                addView(statCard(getString(R.string.label_stat_proxy), profiles.countWithProxy().toString()),
                    lp(weight = 1f))
            })

            // Licence card
            addView(card().apply {
                addView(row().apply {
                    addView(label(getString(R.string.label_license_active), 19, TEXT, true), lp(weight = 1f))
                    addView(pill(getString(R.string.pill_online), SUCCESS))
                })
                addView(spacer(4))
                addView(label(getString(R.string.label_hwid_prefix) + licenses.deviceId(), 12, MUTED, false))
                addView(spacer(4))
                addView(ghostButton(getString(R.string.btn_copy_hwid)).also { btn ->
                    btn.setOnClickListener { clipboard(getString(R.string.clipboard_hwid_label), licenses.deviceId()) }
                })
            })

            // New profile card
            addView(card().apply {
                addView(label(getString(R.string.label_new_profile), 20, TEXT, true))
                addView(spacer(4))
                addView(label(getString(R.string.label_new_profile_desc), 13, MUTED, false))
                val nameInput  = input(getString(R.string.hint_profile_name));  addView(nameInput)
                val urlInput   = input(getString(R.string.hint_profile_url));   addView(urlInput)
                val proxyInput = input(getString(R.string.hint_profile_proxy)); addView(proxyInput)
                val uaInput    = input(getString(R.string.hint_profile_ua));    addView(uaInput)
                addView(sectionLabel(getString(R.string.label_mode)))
                val modeSpinner = modeSpinner(); addView(modeSpinner)
                addView(primaryButton(getString(R.string.btn_create_profile)).also { btn ->
                    btn.setOnClickListener {
                        profiles.add(
                            nameInput.text.toString().trim().ifEmpty { getString(R.string.label_default_profile_name) },
                            urlInput.text.toString().trim(),
                            proxyInput.text.toString().trim(),
                            uaInput.text.toString().trim(),
                            modeSpinner.selectedItem.toString()
                        )
                        renderDashboard()
                    }
                })
            })

            // Saved profiles card
            addView(card().apply {
                addView(label(getString(R.string.label_profiles_title), 20, TEXT, true))
                if (list.isEmpty()) {
                    addView(spacer(8))
                    addView(emptyState(getString(R.string.label_profiles_empty)))
                } else {
                    list.forEach { addView(profileCard(it)) }
                }
            })

            // Info / deactivate card
            addView(card().apply {
                addView(label(getString(R.string.label_android_limits_title), 20, TEXT, true))
                addView(spacer(6))
                addView(label(getString(R.string.label_android_limits_1), 13, MUTED, false))
                addView(spacer(4))
                addView(label(getString(R.string.label_android_limits_2), 13, MUTED, false))
                addView(spacer(4))
                addView(ghostButton(getString(R.string.btn_deactivate)).also { btn ->
                    btn.setOnClickListener { licenses.clearLicense(); renderActivation("") }
                })
            })
        }
        scroll(root)
    }

    // ── component builders ───────────────────────────────────────────────────

    private fun baseRoot() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(20), dp(16), dp(24))
        setBackgroundColor(BG)
    }

    private fun scroll(content: LinearLayout) {
        setContentView(ScrollView(this).apply { addView(content) })
    }

    private fun card() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(16), dp(16), dp(16))
        background = rounded(PANEL, dp(18), BORDER)
        layoutParams = lp(topMargin = dp(12))
    }

    private fun statCard(title: String, value: String) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(14), dp(12), dp(14), dp(14))
        background = rounded(PANEL, dp(16), BORDER)
        addView(label(title, 11, MUTED, true))
        addView(spacer(4))
        addView(label(value, 28, TEXT, true))
    }

    private fun profileCard(profile: ProfileStore.Profile) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(14), dp(14), dp(14), dp(14))
        background = rounded(PANEL2, dp(16), BORDER)
        layoutParams = lp(topMargin = dp(10))

        val modeColor = if (profile.privacyMode == ProfileStore.MODE_STRICT) DANGER else ACCENT
        addView(row().apply {
            addView(label(profile.name, 17, TEXT, true), lp(weight = 1f))
            addView(pill(profile.privacyMode.uppercase(), modeColor))
        })
        addView(spacer(4))
        addView(label(profile.url, 12, MUTED, false))
        addView(label(
            if (profile.proxy.isEmpty()) getString(R.string.label_direct)
            else getString(R.string.label_proxy_prefix) + profile.proxy,
            12, MUTED, false
        ))
        if (profile.userAgent.isNotEmpty()) addView(label(getString(R.string.label_ua_custom), 12, MUTED, false))
        addView(spacer(8))
        addView(row().apply {
            addView(primaryButton(getString(R.string.btn_open_profile)).also { btn ->
                btn.setOnClickListener {
                    startActivity(Intent(this@MainActivity, BrowserActivity::class.java)
                        .putExtra("profileId", profile.id))
                }
            }, lp(weight = 1f, height = dp(48)))
            addView(ghostButton(getString(R.string.btn_delete_profile)).also { btn ->
                btn.setOnClickListener { profiles.remove(profile.id); renderDashboard() }
            }, lp(weight = 1f, height = dp(48), leftMargin = dp(8)))
        })
    }

    private fun emptyState(message: String) = TextView(this).apply {
        text = message
        setTextColor(MUTED)
        textSize = 14f
        gravity = Gravity.CENTER
        setPadding(dp(8), dp(16), dp(8), dp(16))
    }

    private fun label(value: String, size: Int, color: Int, bold: Boolean) = TextView(this).apply {
        text = value
        textSize = size.toFloat()
        setTextColor(color)
        if (bold) typeface = Typeface.DEFAULT_BOLD
    }

    private fun sectionLabel(value: String) = label(value, 12, MUTED, true).apply {
        setPadding(0, dp(10), 0, dp(2))
    }

    private fun input(hint: String) = EditText(this).apply {
        this.hint = hint
        setHintTextColor(MUTED)
        setTextColor(TEXT)
        isSingleLine = true
        inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        background = rounded(PANEL2, dp(14), BORDER)
        setPadding(dp(14), dp(10), dp(14), dp(10))
        layoutParams = lp(topMargin = dp(8), height = dp(52))
    }

    private fun primaryButton(text: String) = Button(this).apply {
        this.text = text
        setTextColor(Color.WHITE)
        typeface = Typeface.DEFAULT_BOLD
        background = rounded(ACCENT, dp(14), 0)
        layoutParams = lp(topMargin = dp(10), height = dp(52))
    }

    private fun ghostButton(text: String) = Button(this).apply {
        this.text = text
        setTextColor(TEXT)
        typeface = Typeface.DEFAULT_BOLD
        background = rounded(PANEL2, dp(14), BORDER)
        layoutParams = lp(topMargin = dp(10), height = dp(52))
    }

    private fun modeSpinner() = Spinner(this).apply {
        val modes = arrayOf(ProfileStore.MODE_COMPAT, ProfileStore.MODE_PRIVATE, ProfileStore.MODE_STRICT)
        adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_item, modes).also {
            it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
        background = rounded(PANEL2, dp(14), BORDER)
        setPadding(dp(10), 0, dp(10), 0)
        layoutParams = lp(topMargin = dp(8), height = dp(52))
    }

    private fun pill(text: String, color: Int) = TextView(this).apply {
        this.text = text
        setTextColor(Color.WHITE)
        textSize = 11f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setPadding(dp(10), dp(5), dp(10), dp(5))
        background = rounded(color, dp(20), 0)
    }

    private fun row() = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
    }

    private fun spacer(dpVal: Int) = android.view.View(this).apply {
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(dpVal))
    }

    private fun rounded(color: Int, radius: Int, strokeColor: Int) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = radius.toFloat()
        if (strokeColor != 0) setStroke(dp(1), strokeColor)
    }

    private fun lp(
        matchParent: Boolean = true,
        height: Int = LinearLayout.LayoutParams.WRAP_CONTENT,
        weight: Float = 0f,
        topMargin: Int = 0,
        leftMargin: Int = 0,
        rightMargin: Int = 0
    ) = LinearLayout.LayoutParams(
        if (matchParent) LinearLayout.LayoutParams.MATCH_PARENT else LinearLayout.LayoutParams.WRAP_CONTENT,
        height,
        weight
    ).also { it.setMargins(leftMargin, topMargin, rightMargin, 0) }

    private fun color(res: Int) = getColor(res)
    private fun clipboard(label: String, text: String) {
        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
            .setPrimaryClip(ClipData.newPlainText(label, text))
    }

    private fun dp(value: Int) = Math.round(value * resources.displayMetrics.density)
}
