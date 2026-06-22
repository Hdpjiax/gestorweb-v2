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

    private val BG     = Color.rgb(7,  10, 16)
    private val PANEL  = Color.rgb(15, 23, 36)
    private val PANEL2 = Color.rgb(20, 31, 48)
    private val BORDER = Color.rgb(42, 57, 83)
    private val TEXT   = Color.rgb(238, 244, 252)
    private val MUTED  = Color.rgb(143, 156, 178)
    private val ACCENT = Color.rgb(124, 92,  252)
    private val ACCENT2 = Color.rgb(38, 198, 218)
    private val DANGER = Color.rgb(255, 103, 128)

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

    // ── Validation ──────────────────────────────────────────────────────────

    private fun validateAndRender() {
        val text = licenses.license()
        if (text.isEmpty()) { renderActivation(""); return }
        renderLoading()
        Thread {
            val result = LicenseClient.verify(this, text, licenses.deviceId())
            runOnUiThread {
                if (result.active) renderDashboard()
                else { licenses.clearLicense(); renderActivation(result.reason) }
            }
        }.start()
    }

    // ── UI helpers ───────────────────────────────────────────────────────────

    private fun baseRoot(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(18), dp(16), dp(18))
        setBackgroundColor(BG)
    }

    private fun label(value: String, size: Int, color: Int, bold: Boolean): TextView =
        TextView(this).apply {
            text  = value
            textSize = size.toFloat()
            setTextColor(color)
            setPadding(0, dp(3), 0, dp(3))
            if (bold) typeface = Typeface.DEFAULT_BOLD
        }

    private fun card(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(14), dp(16), dp(14))
        background = rounded(PANEL, dp(18), BORDER)
        layoutParams = LinearLayout.LayoutParams(-1, -2).also { it.setMargins(0, dp(10), 0, 0) }
    }

    private fun rounded(color: Int, radius: Int, strokeColor: Int): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = radius.toFloat()
            if (strokeColor != 0) setStroke(dp(1), strokeColor)
        }

    private fun input(hint: String): EditText = EditText(this).apply {
        this.hint = hint
        setHintTextColor(MUTED)
        setTextColor(TEXT)
        isSingleLine = true
        inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        background = rounded(PANEL2, dp(14), BORDER)
        setPadding(dp(14), dp(10), dp(14), dp(10))
        layoutParams = LinearLayout.LayoutParams(-1, dp(52)).also { it.setMargins(0, dp(8), 0, 0) }
    }

    private fun button(label: String): Button = Button(this).apply {
        text = label
        setTextColor(Color.WHITE)
        typeface = Typeface.DEFAULT_BOLD
        background = rounded(ACCENT, dp(14), 0)
        layoutParams = LinearLayout.LayoutParams(-1, dp(52)).also { it.setMargins(0, dp(10), 0, 0) }
    }

    private fun ghostButton(label: String): Button = button(label).also {
        it.background = rounded(PANEL2, dp(14), BORDER)
    }

    private fun modeSpinner(): Spinner = Spinner(this).apply {
        val adapter = ArrayAdapter(
            this@MainActivity,
            android.R.layout.simple_spinner_item,
            arrayOf(ProfileStore.MODE_COMPAT, ProfileStore.MODE_PRIVATE, ProfileStore.MODE_STRICT)
        ).also { a -> a.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
        setAdapter(adapter)
        background = rounded(PANEL2, dp(14), BORDER)
        setPadding(dp(10), 0, dp(10), 0)
        layoutParams = LinearLayout.LayoutParams(-1, dp(52)).also { it.setMargins(0, dp(8), 0, 0) }
    }

    private fun row(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
    }

    private fun pill(text: String, color: Int): TextView = label(text, 12, Color.WHITE, true).apply {
        gravity = Gravity.CENTER
        setPadding(dp(10), dp(5), dp(10), dp(5))
        background = rounded(color, dp(20), 0)
    }

    // ── Screens ──────────────────────────────────────────────────────────────

    private fun renderLoading() {
        baseRoot().also { root ->
            root.gravity = Gravity.CENTER
            root.addView(label("Gestor Web", 28, TEXT, true))
            root.addView(label("Validando licencia y sesión segura…", 15, MUTED, false))
            setContentView(root)
        }
    }

    private fun renderActivation(error: String) {
        baseRoot().also { root ->
            root.addView(label("GESTOR WEB", 13, ACCENT2, true))
            root.addView(label("Activación Android", 32, TEXT, true))
            root.addView(label("Conecta este dispositivo al mismo sistema de licencias de escritorio.", 15, MUTED, false))

            card().also { device ->
                device.addView(label("ID de este dispositivo", 13, MUTED, true))
                device.addView(label(licenses.deviceId(), 15, TEXT, true).also { it.isTextSelectable = true })
                device.addView(ghostButton("COPIAR HWID").also { btn ->
                    btn.setOnClickListener {
                        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                            .setPrimaryClip(ClipData.newPlainText("HWID", licenses.deviceId()))
                    }
                })
                root.addView(device)
            }

            card().also { form ->
                form.addView(label("Licencia", 20, TEXT, true))
                form.addView(label("Pega la key GW-LIC-V1 generada desde el panel admin.", 13, MUTED, false))
                val license = input("Pega aquí la licencia GW-LIC-V1").also {
                    it.isSingleLine = false
                    it.minLines = 5
                }
                form.addView(license, LinearLayout.LayoutParams(-1, dp(150)))
                if (error.isNotEmpty()) form.addView(label(error, 13, DANGER, true))
                form.addView(button("ACTIVAR LICENCIA").also { btn ->
                    btn.setOnClickListener {
                        val value = license.text.toString().trim()
                        if (value.isNotEmpty()) { licenses.saveLicense(value); validateAndRender() }
                    }
                })
                root.addView(form)
            }

            setContentView(root)
        }
    }

    private fun renderDashboard() {
        val list = profiles.list()
        baseRoot().also { content ->
            content.addView(label("GESTOR WEB ANDROID", 12, ACCENT2, true))
            content.addView(label("Panel principal", 32, TEXT, true))
            content.addView(label("Perfiles, licencia y navegación desde una vista tipo dashboard.", 14, MUTED, false))

            row().also { stats ->
                stats.setPadding(0, dp(8), 0, dp(2))
                stats.addView(statCard("Perfiles", list.size.toString()), LinearLayout.LayoutParams(0, -2, 1f))
                stats.addView(statCard("Con proxy", profiles.countWithProxy().toString()), LinearLayout.LayoutParams(0, -2, 1f))
                content.addView(stats)
            }

            card().also { licCard ->
                row().also { licRow ->
                    licRow.addView(label("Licencia activa", 20, TEXT, true), LinearLayout.LayoutParams(0, -2, 1f))
                    licRow.addView(pill("ONLINE", ACCENT))
                    licCard.addView(licRow)
                }
                licCard.addView(label("HWID: ${licenses.deviceId()}", 13, MUTED, false))
                licCard.addView(ghostButton("COPIAR HWID").also { btn ->
                    btn.setOnClickListener {
                        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                            .setPrimaryClip(ClipData.newPlainText("HWID", licenses.deviceId()))
                    }
                })
                content.addView(licCard)
            }

            card().also { creator ->
                creator.addView(label("Nuevo perfil", 22, TEXT, true))
                creator.addView(label("Crea un perfil con URL, proxy, user-agent y modo de privacidad seguro.", 13, MUTED, false))
                val name  = input("Nombre del perfil").also  { creator.addView(it) }
                val url   = input("URL inicial, ej. https://example.com").also { creator.addView(it) }
                val proxy = input("Proxy opcional, ej. http://host:puerto").also { creator.addView(it) }
                val ua    = input("User-Agent opcional").also { creator.addView(it) }
                creator.addView(label("Modo", 13, MUTED, true))
                val mode = modeSpinner().also { creator.addView(it) }
                creator.addView(button("+ CREAR PERFIL").also { btn ->
                    btn.setOnClickListener {
                        profiles.add(
                            name.text.toString().trim().ifEmpty { "Perfil" },
                            url.text.toString().trim(),
                            proxy.text.toString().trim(),
                            ua.text.toString().trim(),
                            mode.selectedItem.toString()
                        )
                        renderDashboard()
                    }
                })
                content.addView(creator)
            }

            card().also { profilesCard ->
                profilesCard.addView(label("Perfiles guardados", 22, TEXT, true))
                if (list.isEmpty()) {
                    profilesCard.addView(label("Aún no tienes perfiles. Crea uno arriba para empezar.", 14, MUTED, false))
                } else {
                    list.forEach { profilesCard.addView(profileCard(it)) }
                }
                content.addView(profilesCard)
            }

            card().also { limits ->
                limits.addView(label("Funciones Android", 22, TEXT, true))
                limits.addView(label("Esta versión usa Android WebView. Comparte licencias y perfiles básicos con la lógica del sistema, pero no ejecuta Electron ni módulos internos de escritorio.", 13, MUTED, false))
                limits.addView(label("Modos disponibles: compatibilidad, privado y estricto. Son controles de privacidad/seguridad del WebView, no evasión encubierta.", 13, MUTED, false))
                limits.addView(ghostButton("DESACTIVAR LICENCIA EN ESTE EQUIPO").also { btn ->
                    btn.setOnClickListener { licenses.clearLicense(); renderActivation("") }
                })
                content.addView(limits)
            }

            setContentView(ScrollView(this).also { it.addView(content) })
        }
    }

    private fun statCard(title: String, value: String): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(12), dp(10), dp(12), dp(10))
        background = rounded(PANEL, dp(16), BORDER)
        layoutParams = LinearLayout.LayoutParams(0, -2, 1f).also { it.setMargins(0, dp(6), dp(6), dp(6)) }
        addView(label(title, 12, MUTED, true))
        addView(label(value, 26, TEXT, true))
    }

    private fun profileCard(profile: ProfileStore.Profile): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(14), dp(12), dp(14), dp(12))
        background = rounded(PANEL2, dp(16), BORDER)
        layoutParams = LinearLayout.LayoutParams(-1, -2).also { it.setMargins(0, dp(10), 0, 0) }

        row().also { header ->
            header.addView(label(profile.name, 19, TEXT, true), LinearLayout.LayoutParams(0, -2, 1f))
            val pillColor = if (profile.privacyMode == ProfileStore.MODE_STRICT) DANGER else ACCENT
            header.addView(pill(profile.privacyMode.uppercase(), pillColor))
            addView(header)
        }
        addView(label(profile.url, 13, MUTED, false))
        addView(label(if (profile.proxy.isEmpty()) "Conexión directa" else "Proxy: ${profile.proxy}", 12, MUTED, false))
        if (profile.userAgent.isNotEmpty()) addView(label("UA personalizado", 12, MUTED, false))

        row().also { actions ->
            val open = button("ABRIR").also { btn ->
                btn.setOnClickListener {
                    startActivity(Intent(this@MainActivity, BrowserActivity::class.java).also { it.putExtra("profileId", profile.id) })
                }
            }
            val remove = ghostButton("ELIMINAR").also { btn ->
                btn.setOnClickListener { profiles.remove(profile.id); renderDashboard() }
            }
            actions.addView(open, LinearLayout.LayoutParams(0, dp(52), 1f))
            actions.addView(remove, LinearLayout.LayoutParams(0, dp(52), 1f).also { it.setMargins(dp(8), dp(10), 0, 0) })
            addView(actions)
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()
}
