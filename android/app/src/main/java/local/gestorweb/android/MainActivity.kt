package local.gestorweb.android

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var licenses: LicenseStore
    private lateinit var profiles: ProfileStore

    // ── XML view references (inflated in showDashboard) ──────────────────────
    private var tvStatProfilesValue: TextView? = null
    private var tvStatProxyValue:    TextView? = null
    private var tvHwid:              TextView? = null
    private var profileList:         LinearLayout? = null
    private var tvProfilesEmpty:     TextView? = null

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

    // ── core flow ─────────────────────────────────────────────────────────────

    private fun validateAndRender() {
        val key = licenses.license()
        if (key.isEmpty()) { showActivation(""); return }
        showLoading()
        Thread {
            val result = LicenseClient.verify(this, key, licenses.deviceId())
            runOnUiThread {
                if (result.active) showDashboard()
                else { licenses.clearLicense(); showActivation(result.reason) }
            }
        }.start()
    }

    // ── screens (inflate XML) ─────────────────────────────────────────────────

    private fun showLoading() {
        setContentView(R.layout.activity_loading)
    }

    private fun showActivation(error: String) {
        setContentView(R.layout.activity_activation)

        findViewById<TextView>(R.id.tvDeviceId).text = licenses.deviceId()

        val tvError = findViewById<TextView>(R.id.tvLicenseError)
        if (error.isNotEmpty()) {
            tvError.text = error
            tvError.visibility = View.VISIBLE
        }

        findViewById<Button>(R.id.btnCopyHwid).setOnClickListener {
            clipboard(getString(R.string.clipboard_hwid_label), licenses.deviceId())
        }

        val etLicense = findViewById<EditText>(R.id.etLicense)
        findViewById<Button>(R.id.btnActivate).setOnClickListener {
            val text = etLicense.text.toString().trim()
            if (text.isNotEmpty()) {
                licenses.saveLicense(text)
                validateAndRender()
            }
        }
    }

    private fun showDashboard() {
        setContentView(R.layout.activity_main)

        // Cache references
        tvStatProfilesValue = findViewById(R.id.tvStatProfilesValue)
        tvStatProxyValue    = findViewById(R.id.tvStatProxyValue)
        tvHwid              = findViewById(R.id.tvHwid)
        profileList         = findViewById(R.id.profileList)
        tvProfilesEmpty     = findViewById(R.id.tvProfilesEmpty)

        // Sidebar navigation
        setupSidebar()

        // Static data
        tvHwid?.text = getString(R.string.label_hwid_prefix) + licenses.deviceId()
        findViewById<Button>(R.id.btnCopyHwid).setOnClickListener {
            clipboard(getString(R.string.clipboard_hwid_label), licenses.deviceId())
        }

        // New profile form
        setupNewProfileForm()

        // Deactivate
        findViewById<Button>(R.id.btnDeactivate).setOnClickListener {
            licenses.clearLicense()
            showActivation("")
        }

        // Populate dynamic data
        refreshDashboard()
    }

    private fun refreshDashboard() {
        val list = profiles.list()
        tvStatProfilesValue?.text = list.size.toString()
        tvStatProxyValue?.text    = profiles.countWithProxy().toString()
        populateProfileList(list)
    }

    // ── sidebar ───────────────────────────────────────────────────────────────

    private fun setupSidebar() {
        val navDashboard = findViewById<View>(R.id.navDashboard)
        val navProfiles  = findViewById<View>(R.id.navProfiles)
        val navLicense   = findViewById<View>(R.id.navLicense)
        val navSettings  = findViewById<View>(R.id.navSettings)
        val scroll       = findViewById<ScrollView>(R.id.scrollContent)
        val cardNewProfile = findViewById<View>(R.id.cardNewProfile)
        val cardProfiles   = findViewById<View>(R.id.cardProfiles)
        val cardLicense    = findViewById<View>(R.id.cardLicense)
        val tvTitleBar     = findViewById<TextView>(R.id.tvTitleBarTitle)

        val allNavItems = listOf(navDashboard, navProfiles, navLicense, navSettings)

        fun selectNav(selected: View, title: String) {
            allNavItems.forEach { nav ->
                nav.background = if (nav == selected)
                    getDrawable(R.drawable.bg_nav_item_active)
                else null
                // Update icon color
                (nav as? LinearLayout)?.let { ll ->
                    val icon  = ll.getChildAt(0) as? TextView
                    val label = ll.getChildAt(1) as? TextView
                    val isActive = nav == selected
                    icon?.setTextColor(getColor(if (isActive) R.color.gw_accent else R.color.gw_text_secondary))
                    label?.setTextColor(getColor(if (isActive) R.color.gw_accent else R.color.gw_text_secondary))
                }
            }
            tvTitleBar.text = title
        }

        navDashboard.setOnClickListener {
            selectNav(navDashboard, getString(R.string.titlebar_dashboard))
            // Scroll to top, show all cards
            scroll.smoothScrollTo(0, 0)
        }

        navProfiles.setOnClickListener {
            selectNav(navProfiles, getString(R.string.nav_profiles))
            // Scroll to profiles card
            scroll.post { scroll.smoothScrollTo(0, cardProfiles.top) }
        }

        navLicense.setOnClickListener {
            selectNav(navLicense, getString(R.string.nav_license))
            scroll.post { scroll.smoothScrollTo(0, cardLicense.top) }
        }

        navSettings.setOnClickListener {
            selectNav(navSettings, getString(R.string.nav_settings))
            // Show deactivate info
            scroll.post { scroll.smoothScrollTo(0, scroll.getChildAt(0).height) }
        }
    }

    // ── new profile form ──────────────────────────────────────────────────────

    private fun setupNewProfileForm() {
        val etName  = findViewById<EditText>(R.id.etProfileName)
        val etUrl   = findViewById<EditText>(R.id.etProfileUrl)
        val etProxy = findViewById<EditText>(R.id.etProfileProxy)
        val etUa    = findViewById<EditText>(R.id.etProfileUa)
        val spinner = findViewById<Spinner>(R.id.spinnerMode)

        val modes = arrayOf(ProfileStore.MODE_COMPAT, ProfileStore.MODE_PRIVATE, ProfileStore.MODE_STRICT)
        spinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, modes).also {
            it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }

        findViewById<Button>(R.id.btnCreateProfile).setOnClickListener {
            profiles.add(
                etName.text.toString().trim().ifEmpty { getString(R.string.label_default_profile_name) },
                etUrl.text.toString().trim(),
                etProxy.text.toString().trim(),
                etUa.text.toString().trim(),
                spinner.selectedItem.toString()
            )
            etName.text.clear(); etUrl.text.clear()
            etProxy.text.clear(); etUa.text.clear()
            refreshDashboard()
            // Scroll to profiles list
            val scroll = findViewById<ScrollView>(R.id.scrollContent)
            val card   = findViewById<View>(R.id.cardProfiles)
            scroll.post { scroll.smoothScrollTo(0, card.top) }
        }
    }

    // ── profile list ──────────────────────────────────────────────────────────

    private fun populateProfileList(list: List<ProfileStore.Profile>) {
        val container = profileList ?: return
        val emptyView = tvProfilesEmpty ?: return
        container.removeAllViews()

        if (list.isEmpty()) {
            emptyView.visibility = View.VISIBLE
            return
        }
        emptyView.visibility = View.GONE

        val inflater = LayoutInflater.from(this)
        list.forEach { profile ->
            val itemView = inflater.inflate(R.layout.item_profile, container, false)

            itemView.findViewById<TextView>(R.id.tvProfileName).text = profile.name
            itemView.findViewById<TextView>(R.id.tvProfileUrl).text  = profile.url
            itemView.findViewById<TextView>(R.id.tvProfileProxy).text =
                if (profile.proxy.isEmpty()) getString(R.string.label_direct)
                else getString(R.string.label_proxy_prefix) + profile.proxy

            // Mode pill
            val pill = itemView.findViewById<TextView>(R.id.tvProfileModePill)
            pill.text = profile.privacyMode.uppercase()
            val pillBg = (pill.background as? GradientDrawable)
                ?: GradientDrawable().also { pill.background = it }
            pillBg.cornerRadius = 20f * resources.displayMetrics.density
            pillBg.setColor(getColor(
                if (profile.privacyMode == ProfileStore.MODE_STRICT) R.color.gw_danger
                else R.color.gw_accent
            ))

            // UA badge
            if (profile.userAgent.isNotEmpty())
                itemView.findViewById<TextView>(R.id.tvProfileUa).visibility = View.VISIBLE

            itemView.findViewById<Button>(R.id.btnOpenProfile).setOnClickListener {
                startActivity(Intent(this, BrowserActivity::class.java)
                    .putExtra("profileId", profile.id))
            }
            itemView.findViewById<Button>(R.id.btnDeleteProfile).setOnClickListener {
                profiles.remove(profile.id)
                refreshDashboard()
            }

            container.addView(itemView)
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun clipboard(label: String, text: String) {
        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
            .setPrimaryClip(ClipData.newPlainText(label, text))
    }
}
