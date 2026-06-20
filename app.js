(function () {
  const STORAGE_KEY = "gestor-web-rebuild:v1";
  const root = document.getElementById("app");
  const native = window.api || null;

  const templates = [
    { id: "win_firefox_mx", label: "Windows / Firefox 135 (MX)", locale: "es-MX", timezone: "America/Monterrey", os: "Windows", browser: "Firefox", width: 1920, height: 1080 },
    { id: "win_firefox_es", label: "Windows / Firefox 135 (ES)", locale: "es-ES", timezone: "Europe/Madrid", os: "Windows", browser: "Firefox", width: 1536, height: 864 },
    { id: "win_chrome_mx", label: "Windows / Chrome (MX)", locale: "es-MX", timezone: "America/Monterrey", os: "Windows", browser: "Chrome", width: 1920, height: 1080 },
    { id: "win_chrome_es", label: "Windows / Chrome (ES)", locale: "es-ES", timezone: "Europe/Madrid", os: "Windows", browser: "Chrome", width: 1536, height: 864 },
    { id: "mac_safari_es", label: "macOS / Safari (ES)", locale: "es-ES", timezone: "Europe/Madrid", os: "macOS", browser: "Safari", width: 1440, height: 900 },
    { id: "android_chrome", label: "Android / Chrome (movil)", locale: "es-MX", timezone: "America/Mexico_City", os: "Android", browser: "Chrome Mobile", width: 412, height: 915 },
    { id: "iphone_safari", label: "iPhone / Safari (movil)", locale: "es-MX", timezone: "America/Mexico_City", os: "iOS", browser: "Mobile Safari", width: 390, height: 844 },
    { id: "anonymous", label: "Anonymous (Tor-like)", locale: "en-US", timezone: "UTC", os: "Windows", browser: "Firefox", width: 1366, height: 768 }
  ];

  const timezones = ["America/Monterrey", "America/Mexico_City", "America/Bogota", "Europe/Madrid", "America/New_York", "Europe/London", "UTC"];
  const locales = ["es-MX", "es-ES", "es-CO", "en-US", "en-GB"];
  const resolutions = ["1280x720", "1366x768", "1536x864", "1920x1080", "412x915 (movil)", "390x844 (iPhone)"];

  const ICONS = {
    browse: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    all: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    live: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    monitor: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    network: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    proxies: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    schedules: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    history: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>`,
    stats: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    plus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    cookie: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>`,
    clone: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    openExt: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    chevron: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    shield: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    zap: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    globe: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    cpu: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    fingerprint: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2"/></svg>`,
    audio: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`,
    refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    filter: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    upload: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    key: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    activity: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    server: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
    database: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    wifi: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    dns: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    bot: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    lab: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l3 7-6 11-6-11 3-7z"/></svg>`
  };

  const navItems = [
    ["browse", "browse", "Navegador embebido (Ctrl+0)"],
    ["all", "all", "Todos los perfiles (Ctrl+1)"],
    ["live", "live", "Perfiles en vivo (Ctrl+2)"],
    ["monitor", "monitor", "Monitor en vivo (Ctrl+8)"],
    ["network", "network", "Network / Repeater (Ctrl+9)"],
    ["proxies", "proxies", "Pool de proxies (Ctrl+3)"],
    ["schedules", "schedules", "Tareas programadas (Ctrl+4)"],
    ["history", "history", "Historial (Ctrl+5)"],
    ["stats", "stats", "Estadisticas (Ctrl+6)"],
    ["settings", "settings", "Ajustes (Ctrl+7)"]
  ];

  const titles = {
    browse: ["navegador", "embebido"],
    all: ["perfiles", "todos"],
    live: ["perfiles", "en vivo"],
    monitor: ["streaming", "monitor en vivo"],
    network: ["analisis", "network repeater decoder"],
    proxies: ["red", "pool de proxies"],
    schedules: ["automatizacion", "tareas programadas"],
    history: ["eventos", "historial"],
    stats: ["analytics", "estadisticas"],
    settings: ["sistema", "ajustes"]
  };

  const privacyFlags = [
    ["compat_mode", "Modo compatibilidad"],
    ["block_trackers", "Bloquear trackers"],
    ["strip_tracking_params", "Quitar UTM/fbclid/gclid"],
    ["sanitize_headers", "Limpiar client hints"],
    ["strict_referer", "No-referrer"],
    ["webrtc_block", "Bloquear WebRTC"],
    ["doh_enabled", "DNS over HTTPS"],
    ["force_https", "Force HTTPS"],
    ["harden_all", "Spoof extremo"],
    ["in_memory", "Solo en memoria"],
    ["auto_wipe_close", "Auto-wipe al cerrar"],
    ["tor_mode", "Tor mode"]
  ];

  const quickLinks = [
    ["check.torproject.org", "https://check.torproject.org/", "TOR"],
    ["creepjs", "https://abrahamjuliot.github.io/creepjs/", "FP"],
    ["bot.sannysoft", "https://bot.sannysoft.com/", "FP"],
    ["browserleaks", "https://browserleaks.com/", "FP"],
    ["ipleak.net", "https://ipleak.net/", "IP"],
    ["duckduckgo", "https://duckduckgo.com/", "SEARCH"]
  ];

  const ui = {
    newProfile: false,
    profileAdvanced: false,
    welcome: false,
    proxyAdding: false,
    proxyBulk: false,
    scheduleAdding: false,
    command: false,
    commandQuery: "",
    inspectorTab: "fp",
    cookieProfileId: null,
    cookieSearch: "",
    browserProfileId: "",
    browserUrl: "",
    repeaterOutput: ""
  };

  const defaults = {
    license: null,
    onboardingSeen: false,
    view: "all",
    selectedId: null,
    filters: { search: "", group: "", proxyState: "all" },
    profiles: [],
    proxies: [],
    schedules: [],
    events: [],
    liveIds: [],
    browserTabs: [],
    activeTabId: null,
    netEntries: [],
    settings: { theme: "midnight", chromiumReady: false, torReady: false, vaultToken: shortId(24) }
  };

  let state = normalize(clone(defaults));

  async function load() {
    if (native?.app?.loadState) {
      const stored = await native.app.loadState();
      if (stored) return { ...clone(defaults), ...stored };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...clone(defaults), ...JSON.parse(raw) } : clone(defaults);
    } catch {
      return clone(defaults);
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    native?.app?.saveState?.(state).catch(() => {});
  }

  function normalize(next) {
    next.filters ||= { search: "", group: "", proxyState: "all" };
    next.profiles ||= [];
    next.proxies ||= [];
    next.schedules ||= [];
    next.events ||= [];
    next.liveIds ||= [];
    next.browserTabs ||= [];
    next.settings ||= clone(defaults.settings);
    if (next.profiles.length && !next.selectedId) next.selectedId = next.profiles[0].id;
    if (next.selectedId && !next.profiles.some((p) => p.id === next.selectedId)) next.selectedId = next.profiles[0]?.id || null;
    next.proxies = next.proxies.map((proxy) => ({ ...proxy, in_use: next.profiles.some((p) => p.proxy_id === proxy.id) }));
    return next;
  }

  function update(fn) {
    fn(state);
    state = normalize(state);
    save();
    render();
  }

  function rerender() {
    render();
  }

  function shortId(size = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    const cryptoObj = window.crypto || null;
    for (let i = 0; i < size; i++) {
      const n = cryptoObj ? cryptoObj.getRandomValues(new Uint8Array(1))[0] : Math.floor(Math.random() * 255);
      out += chars[n % chars.length];
    }
    return out;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${shortId(5).toLowerCase()}`;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function attr(value) {
    return esc(value).replaceAll("'", "&#39;");
  }

  function liveSet() {
    return new Set(state.liveIds);
  }

  function logEvent(kind, profileId, payload = "") {
    state.events.unshift({ id: uid("evt"), kind, profile_id: profileId || null, payload, ts: Date.now() });
    state.events = state.events.slice(0, 250);
  }

  function profileById(id) {
    return state.profiles.find((p) => p.id === id) || null;
  }

  function proxyById(id) {
    return state.proxies.find((p) => p.id === id) || null;
  }

  function filteredProfiles() {
    const q = state.filters.search.trim().toLowerCase();
    const live = liveSet();
    return state.profiles.filter((p) => {
      const haystack = `${p.name} ${p.group_tag || ""} ${p.url || ""}`.toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (state.filters.group && p.group_tag !== state.filters.group) return false;
      if (state.filters.proxyState === "with" && !p.proxy_id && !p.tor_mode) return false;
      if (state.filters.proxyState === "without" && (p.proxy_id || p.tor_mode)) return false;
      if (state.view === "live" && !live.has(p.id)) return false;
      return true;
    });
  }

  function render() {
    root.innerHTML = state.license?.active ? renderShell() : renderLicense();
    bind();
  }

  function renderLicense() {
    const hwid = localStorage.getItem("gestor-web-rebuild:hwid") || `GW-${shortId(4)}-${shortId(4)}-${shortId(4)}`;
    localStorage.setItem("gestor-web-rebuild:hwid", hwid);
    return `
      <div class="screen">
        <form id="licenseForm" class="license-card">
          <div class="card-head">
            <h1 class="title">Activacion</h1>
            <div class="subtitle">Esta copia necesita una licencia para arrancar</div>
          </div>
          <div class="card-body stack">
            <div>
              <label class="label">1. Tu HWID</label>
              <div class="between">
                <input class="input mono" value="${attr(hwid)}" readonly />
                <button class="btn btn-primary" type="button" data-action="copy-hwid" data-hwid="${attr(hwid)}">copiar HWID</button>
              </div>
              <div class="small-note">ID corto: ${esc(hwid.replaceAll("-", "").slice(-12))}</div>
              <div class="small-note">Envia tu HWID al vendedor. El emitira un .gw firmado.</div>
            </div>
            <div>
              <label class="label">2. Activar licencia</label>
              <textarea id="licenseText" class="textarea mono" placeholder="GW-XXXX-XXXX-XXXX o contenido del .gw (GW-LIC-V1...)"></textarea>
            </div>
            <div class="between">
              <button class="btn btn-ghost" type="button" data-action="import-license">importar archivo .gw</button>
              <button class="btn btn-primary" type="submit">activar</button>
            </div>
          </div>
          <div class="card-foot between">
            <span>Estado: sin licencia</span>
            <span>HWID generado de CPU + placa + UUID + disco + MAC</span>
          </div>
        </form>
      </div>
    `;
  }

  function renderShell() {
    const showInspector = state.view === "all" || state.view === "live";
    return `
      <div class="app-shell ${showInspector ? "" : "no-inspector"}">
        ${renderSidebar()}
        <div class="workspace">
          ${renderTopbar()}
          <main class="content">${renderView()}</main>
        </div>
        ${showInspector ? renderInspector() : ""}
      </div>
      ${ui.newProfile ? renderNewProfileModal() : ""}
      ${ui.welcome ? renderWelcomeModal() : ""}
      ${ui.command ? renderCommandPalette() : ""}
      ${ui.cookieProfileId ? renderCookieEditor(ui.cookieProfileId) : ""}
    `;
  }

  function renderSidebar() {
    const free = state.proxies.filter((p) => !p.in_use && p.healthy).length;
    const savings = state.profiles.length ? Math.round(((state.profiles.length - state.liveIds.length) / state.profiles.length) * 100) : 0;
    return `
      <aside class="sidebar">
        <button class="nav-btn create-btn" title="Crear nuevo perfil (Ctrl+N)" data-action="new-profile">${ICONS.plus}</button>
        ${navItems.map(([id, key, label]) => `<button class="nav-btn ${state.view === id ? "active" : ""}" title="${attr(label)}" data-action="set-view" data-view="${id}">${ICONS[key] || key}</button>`).join("")}
        <div class="sidebar-foot">
          <div title="${free} proxies libres"><div class="mono muted">${free}</div><div>libres</div></div>
          <div title="${savings}% perfiles en reposo"><div class="mono live">-${savings}%</div><div>ahorro</div></div>
          <button class="icon-btn" title="Paleta (Ctrl+K)" data-action="open-command">${ICONS.search}</button>
        </div>
      </aside>
    `;
  }

  function renderTopbar() {
    const [crumb, title] = titles[state.view] || titles.all;
    const total = state.view === "proxies" ? state.proxies.length : state.view === "live" ? state.liveIds.length : state.view === "all" ? filteredProfiles().length : state.profiles.length;
    const profileChrome = state.view === "all" || state.view === "live";
    const groups = [...new Set(state.profiles.map((p) => p.group_tag).filter(Boolean))];
    return `
      <header class="topbar">
        <div>
          <div class="crumb"><span>${esc(crumb)}</span> / <strong>${esc(title)}</strong></div>
          <div class="total">${total} total</div>
        </div>
        <div class="top-actions">
          ${profileChrome ? `
            <input id="searchInput" class="input" style="width: 260px" placeholder="buscar  (/ Ctrl+K)" value="${attr(state.filters.search)}" />
            ${groups.length ? `<select id="groupFilter" class="select" style="width: 160px"><option value="">Todos los grupos</option>${groups.map((g) => `<option value="${attr(g)}" ${state.filters.group === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>` : ""}
            <select id="proxyFilter" class="select" style="width: 150px">
              <option value="all" ${state.filters.proxyState === "all" ? "selected" : ""}>Cualquier proxy</option>
              <option value="with" ${state.filters.proxyState === "with" ? "selected" : ""}>Con proxy</option>
              <option value="without" ${state.filters.proxyState === "without" ? "selected" : ""}>Sin proxy</option>
            </select>
          ` : ""}
          <span class="pill dim">v1.3.0</span>
          <span class="pill accent">${esc(state.license.shortId)}</span>
          <span class="pill live"><span class="dot"></span>modo ahorro activo</span>
          <button class="btn btn-primary" data-action="new-profile">+ nuevo perfil</button>
        </div>
      </header>
    `;
  }

  function renderView() {
    if (state.view === "browse") return renderBrowseView();
    if (state.view === "all" || state.view === "live") return renderProfileView();
    if (state.view === "proxies") return renderProxiesView();
    if (state.view === "schedules") return renderSchedulesView();
    if (state.view === "history") return renderHistoryView();
    if (state.view === "stats") return renderStatsView();
    if (state.view === "settings") return renderSettingsView();
    if (state.view === "monitor") return renderMonitorView();
    if (state.view === "network") return renderNetworkView();
    return renderProfileView();
  }

  function renderProfileView() {
    const rows = filteredProfiles();
    if (!rows.length) {
      return `<div class="empty"><div><div class="empty-title">${state.profiles.length ? "Nada coincide" : "Sin perfiles todavia"}</div><div>${state.profiles.length ? "Limpia el filtro con Esc" : "Pulsa + nuevo perfil o Ctrl+N"}</div></div></div>`;
    }
    return `
      <section class="section">
        <div class="table-head row-grid"><div></div><div></div><div>Perfil</div><div>Estado</div><div>Proxy</div><div>Warmup</div><div></div></div>
        ${rows.map(renderProfileRow).join("")}
      </section>
    `;
  }

  function renderProfileRow(p) {
    const isLive = liveSet().has(p.id);
    const proxy = p.proxy_id ? proxyById(p.proxy_id) : null;
    const fp = p.fingerprint || {};
    return `
      <div class="row-grid ${state.selectedId === p.id ? "selected" : ""}" data-action="select-profile" data-id="${p.id}">
        <input type="checkbox" aria-label="seleccionar perfil" />
        <div class="pill ${/Mobile|Android|iPhone/i.test(fp.userAgent || "") ? "accent" : "dim"}">${/Mobile|Android|iPhone/i.test(fp.userAgent || "") ? "MOB" : "WEB"}</div>
        <div>
          <div class="between"><strong>${esc(p.name)}</strong>${p.group_tag ? `<span class="pill accent">${esc(p.group_tag)}</span>` : ""}</div>
          <div class="small-note mono">${esc(p.url || "sin URL")}</div>
        </div>
        <div>${isLive ? `<span class="pill live"><span class="dot"></span>en vivo</span>` : `<span class="pill dim">inactivo</span>`}</div>
        <div class="small-note mono">${p.tor_mode ? "tor -> 127.0.0.1:9050" : proxy ? `${esc(proxy.scheme)}://${esc(proxy.host)}:${esc(proxy.port)}` : "sin proxy"}</div>
        <div><div class="progress"><span style="width:${p.warmup || 0}%"></span></div><div class="small-note">${p.warmup || 0}%</div></div>
        <div class="flex right gap-1">
          <button class="icon-btn-sm" title="Editor de cookies" data-action="open-cookies" data-id="${p.id}">${ICONS.cookie}</button>
          <button class="icon-btn-sm" title="Clonar perfil" data-action="clone-profile" data-id="${p.id}">${ICONS.clone}</button>
          <button class="icon-btn-sm" title="Abrir ruta del perfil" data-action="open-profile-path" data-id="${p.id}">${ICONS.folder}</button>
          <button class="icon-btn-sm danger" title="Eliminar perfil" data-action="delete-profile" data-id="${p.id}">${ICONS.trash}</button>
          <button class="btn btn-ghost" data-action="${isLive ? "close-profile" : "open-profile"}" data-id="${p.id}">${isLive ? ICONS.stop : ICONS.play}</button>
        </div>
      </div>
    `;
  }

  function renderInspector() {
    const profile = profileById(state.selectedId);
    if (!profile) return `<aside class="inspector"><div class="inspector-empty"><div class="label">Inspector</div><div>Selecciona un perfil para ver y editar.</div></div></aside>`;
    const isLive = liveSet().has(profile.id);
    const fp = profile.fingerprint || {};
    const checks = buildChecks(profile, fp, isLive);
    const score = Math.round(checks.reduce((sum, c) => sum + (c.status === "ok" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / checks.length * 100);
    const tier = score >= 95 ? "AISLADO" : score >= 75 ? "ALTO" : score >= 50 ? "MEDIO" : "BAJO";
    const tabs = [
      ["fp", ICONS.fingerprint, "Fingerprint"],
      ["privacy", ICONS.shield, "Privacy"],
      ["auth", ICONS.key, "Auth"],
      ["notes", ICONS.database, "Notas"],
      ["logs", ICONS.activity, "Logs"],
      ["macros", ICONS.play, "Macros"]
    ];
    return `
      <aside class="inspector">
        <div class="inspector-head">
          <div class="between"><h2 class="title">${esc(profile.name)}</h2>${profile.group_tag ? `<span class="pill accent">${esc(profile.group_tag)}</span>` : ""}</div>
          <div class="small-note mono">${esc(profile.url || "sin URL")}</div>
          <div class="inspector-score">
            <div class="score-bar"><div class="score-fill" style="width:${score}%"></div></div>
            <div class="score-labels"><span class="${score >= 95 ? "live" : score >= 75 ? "warn" : "danger"}">${tier}</span><span class="mono">${score}%</span></div>
          </div>
        </div>
        <div class="tabs">${tabs.map(([id, icon, label]) => `<button class="tab ${ui.inspectorTab === id ? "active" : ""}" data-action="set-inspector-tab" data-tab="${id}">${icon}<span>${label}</span></button>`).join("")}</div>
        <div class="inspector-body">${renderInspectorTab(profile)}</div>
        <div class="inspector-actions">
          <div class="action-row">
            ${toggleButton(profile, "headless", ICONS.server, "headless")}
            ${toggleButton(profile, "har_enabled", ICONS.database, "HAR")}
            ${toggleButton(profile, "webrtc_block", ICONS.wifi, "anti-leak")}
            ${toggleButton(profile, "doh_enabled", ICONS.dns, "DoH")}
            ${toggleButton(profile, "force_https", ICONS.lock, "HTTPS")}
            ${toggleButton(profile, "in_memory", ICONS.cpu, "RAM")}
          </div>
          <div class="action-row">
            ${toggleButton(profile, "block_trackers", ICONS.shield, "trackers")}
            ${toggleButton(profile, "strip_tracking_params", ICONS.link, "UTM")}
            ${toggleButton(profile, "sanitize_headers", ICONS.globe, "hints")}
            ${toggleButton(profile, "strict_referer", ICONS.eye, "referer")}
            ${toggleButton(profile, "harden_all", ICONS.zap, "spoof")}
            ${toggleButton(profile, "auto_wipe_close", ICONS.refresh, "wipe")}
          </div>
          <div class="action-row">
            <button class="btn btn-primary flex" data-action="assign-proxy" data-id="${profile.id}">${ICONS.globe}<span>asignar proxy</span></button>
            <button class="btn btn-ghost flex" data-action="open-cookies" data-id="${profile.id}">${ICONS.cookie}<span>cookies</span></button>
            <button class="btn btn-ghost flex" data-action="wipe-profile" data-id="${profile.id}">${ICONS.trash}<span>wipe</span></button>
          </div>
          <div class="audit-row">
            <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="creepjs">${ICONS.bot}<span>creepjs</span></button>
            <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="sannysoft">${ICONS.lab}<span>sannysoft</span></button>
            <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="pixelscan">${ICONS.fingerprint}<span>pixelscan</span></button>
          </div>
          <div class="warning-note">${ICONS.warning} Lo que NO se puede mitigar en esta capa: TLS JA3 fingerprint, HTTP/2, behavioral biometrics y stylometry. Para anonimato real usa Tor Browser o Tails OS.</div>
        </div>
      </aside>
    `;
  }

  function toggleButton(profile, key, icon, label) {
    return `<button class="toggle-btn ${profile[key] ? "on" : ""}" data-action="toggle-profile-flag" data-id="${profile.id}" data-key="${key}" title="${label}">${icon}<span class="toggle-label">${label}</span><span class="toggle-state">${profile[key] ? "on" : "off"}</span></button>`;
  }

  function renderInspectorTab(profile) {
    if (ui.inspectorTab === "fp") return renderFingerprintTab(profile);
    if (ui.inspectorTab === "privacy") return renderPrivacyTab(profile);
    if (ui.inspectorTab === "auth") return renderAuthTab(profile);
    if (ui.inspectorTab === "notes") return renderNotesTab(profile);
    if (ui.inspectorTab === "logs") return renderLogsTab(profile);
    if (ui.inspectorTab === "macros") return renderMacrosTab(profile);
    return renderFingerprintTab(profile);
  }

  function renderFingerprintTab(profile) {
    const isLive = liveSet().has(profile.id);
    const fp = profile.fingerprint || {};
    const checks = buildChecks(profile, fp, isLive);
    const ok = checks.filter((c) => c.status === "ok").length;
    const warn = checks.filter((c) => c.status === "warn").length;
    const fail = checks.filter((c) => c.status === "fail").length;
    const score = Math.round(checks.reduce((sum, c) => sum + (c.status === "ok" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / checks.length * 100);
    const tier = score >= 95 ? "AISLADO" : score >= 75 ? "ALTO" : score >= 50 ? "MEDIO" : "BAJO";
    return `
      <div class="fp-tab">
        <div class="fp-header">
          <div class="fp-info">
            <div class="fp-item"><span class="fp-label">${ICONS.fingerprint} Canvas</span><span class="fp-value mono">${esc(fp.canvas || "unico")}</span></div>
            <div class="fp-item"><span class="fp-label">${ICONS.audio} Audio</span><span class="fp-value mono">${esc(fp.audio || "unico")}</span></div>
            <div class="fp-item"><span class="fp-label">${ICONS.globe} User-Agent</span><span class="fp-value mono warn">${esc(fp.userAgent?.slice(0, 60) || "sin UA")}</span></div>
            <div class="fp-item"><span class="fp-label">${ICONS.cpu} WebGL</span><span class="fp-value mono">${esc(fp.webgl?.slice(0, 50) || "sin WebGL")}</span></div>
            <div class="fp-item"><span class="fp-label">${ICONS.dns} Timezone</span><span class="fp-value mono">${esc(fp.timezone || "UTC")}</span></div>
            <div class="fp-item"><span class="fp-label">${ICONS.shield} Resolucion</span><span class="fp-value mono">${fp.resolution?.width || 1280}x${fp.resolution?.height || 720}</span></div>
            <div class="fp-item"><span class="fp-label">${ICONS.globe} Locale</span><span class="fp-value mono">${esc(fp.locale || "es-MX")}</span></div>
            <div class="fp-item"><span class="fp-label">${ICONS.cpu} Hardware</span><span class="fp-value mono">${fp.cores || 4} cores · ${fp.memoryGB || 8}GB</span></div>
          </div>
          <button class="btn btn-ghost" data-action="refresh-fingerprint" data-id="${profile.id}">${ICONS.refresh} recalcular</button>
        </div>
        <div class="check-list">${checks.map((c) => `<div class="check-row"><span class="check-icon ${c.status === "ok" ? "ok" : c.status === "warn" ? "warn" : "fail"}">${c.status === "ok" ? ICONS.check : c.status === "warn" ? ICONS.warning : ICONS.close}</span><span>${esc(c.label)}</span><span class="mono ${c.status}">${esc(c.value)}</span></div>`).join("")}</div>
        <details class="raw-data"><summary>${ICONS.database} datos crudos del fingerprint</summary><pre class="small-note mono">${esc(JSON.stringify(fp, null, 2))}</pre></details>
      </div>
    `;
  }

  function buildChecks(profile, fp, isLive) {
    return [
      [ICONS.fingerprint + " Canvas hash", profile.gw_engine || profile.harden_all ? "ok" : "warn", profile.gw_engine || profile.harden_all ? "noise inyectado" : "sin ruido"],
      [ICONS.audio + " Audio hash", profile.gw_engine || profile.harden_all ? "ok" : "warn", profile.gw_engine || profile.harden_all ? "noise inyectado" : "sin ruido"],
      [ICONS.globe + " User Agent", fp.userAgent ? "ok" : "fail", fp.userAgent ? "unico" : "fallback"],
      [ICONS.cpu + " WebGL renderer", fp.webgl ? "ok" : "warn", fp.webgl ? "spoofed" : "default"],
      [ICONS.dns + " Timezone", fp.timezone ? "ok" : "warn", city(fp.timezone)],
      [ICONS.shield + " Resolucion", fp.resolution ? "ok" : "warn", `${fp.resolution?.width || 1280}x${fp.resolution?.height || 720}`],
      [profile.tor_mode ? ICONS.lock + " Tor SOCKS5" : ICONS.wifi + " Proxy", profile.tor_mode || profile.proxy_id ? "ok" : "warn", profile.tor_mode ? "tor 127.0.0.1:9050" : profile.proxy_id ? "asignado" : "sin proxy"],
      [ICONS.cpu + " WebRTC leak", profile.webrtc_block ? "ok" : "warn", profile.webrtc_block ? "bloqueado" : "expuesto"],
      [ICONS.shield + " Bloqueo trackers", profile.block_trackers ? "ok" : "warn", profile.block_trackers ? "~80 dominios" : "off"],
      [ICONS.globe + " Client hints", profile.sanitize_headers ? "ok" : "warn", profile.sanitize_headers ? "limpios" : "expuestos"],
      [ICONS.eye + " No-referrer", profile.strict_referer ? "ok" : "warn", profile.strict_referer ? "activado" : "off"],
      [ICONS.lock + " Force HTTPS", profile.force_https ? "ok" : "warn", profile.force_https ? "activado" : "off"],
      [ICONS.dns + " DNS over HTTPS", profile.doh_enabled ? "ok" : "warn", profile.doh_enabled ? "cloudflare" : "off"],
      [ICONS.zap + " Spoof extremo", profile.harden_all ? "ok" : "warn", profile.harden_all ? "activado" : "off"],
      [ICONS.cpu + " Solo en memoria", profile.in_memory ? "ok" : "warn", profile.in_memory ? "RAM only" : "disco"],
      [ICONS.refresh + " Auto-wipe", profile.auto_wipe_close ? "ok" : "warn", profile.auto_wipe_close ? "al cerrar" : "off"],
      [ICONS.play + " Sesion", isLive ? "ok" : "warn", isLive ? "aislada" : "inactiva"],
      [ICONS.cpu + " Compat mode", !profile.compat_mode ? "ok" : "warn", !profile.compat_mode ? "spoofs full" : "reducido"]
    ].map(([label, status, value]) => ({ label: label.replace(/<\/?svg[^>]*>/g, "").trim(), status, value }));
  }

  function city(tz) {
    return String(tz || "UTC").split("/").pop().replaceAll("_", " ");
  }

  function renderPrivacyTab(profile) {
    const score = privacyScore(profile);
    const tier = score >= 90 ? "Anonymous" : score >= 70 ? "Hardened" : score >= 40 ? "Standard" : "Bajo";
    const flags = [
      [ICONS.shield, "block_trackers", "Bloquear trackers", "~80 dominios"],
      [ICONS.link, "strip_tracking_params", "Quitar UTM/fbclid/gclid", "strip-tracking"],
      [ICONS.globe, "sanitize_headers", "Limpiar client hints", "no-clienthints"],
      [ICONS.eye, "strict_referer", "No-referrer", "no-referrer header"],
      [ICONS.wifi, "webrtc_block", "Bloquear WebRTC", "anti-leak"],
      [ICONS.dns, "doh_enabled", "DNS over HTTPS", "cloudflare-dns"],
      [ICONS.lock, "force_https", "Force HTTPS", "https-only"],
      [ICONS.zap, "harden_all", "Spoof extremo", "spoof-extremo"],
      [ICONS.cpu, "in_memory", "Solo en memoria", "RAM-only"],
      [ICONS.refresh, "auto_wipe_close", "Auto-wipe al cerrar", "auto-wipe"],
      [ICONS.lock, "tor_mode", "Tor mode", "SOCKS5 127.0.0.1:9050"]
    ];
    return `
      <div class="section privacy-stack">
        <div class="privacy-header" data-action="toggle-profile-flag" data-id="${profile.id}" data-key="gw_engine">
          ${ICONS.shield}<span>Motor Firefox / Camoufox (indetectable)</span><span class="pill ${profile.gw_engine ? "live" : "dim"}">${profile.gw_engine ? "on" : "off"}</span>
        </div>
        ${profile.gw_engine ? `<div class="callout"><strong class="live">Modo Firefox 135 activo.</strong> User-Agent, locale, pantalla, WebGL, canvas/audio y headers se aplican antes de cargar la pagina.</div>` : ""}
        ${profile.compat_mode ? `<div class="callout"><strong class="live">Modo compatibilidad activo.</strong> Spoofs agresivos desactivados para captchas, pagos y banking.</div>` : ""}
        ${profile.tor_mode ? `<div class="tor-notice">${ICONS.warning}<span>Anonymous requiere Tor en 127.0.0.1:9050. Asegurate de que TOR este corriendo.</span></div>` : ""}
        <div class="metric">
          <div class="between"><strong class="accent" style="font-size:30px">${score}</strong><span class="dim">/ 100</span><span class="pill accent">${tier}</span></div>
          <div class="progress" style="margin-top:10px"><span style="width:${score}%"></span></div>
        </div>
        <div class="label">Aplicar preset</div>
        <div class="preset-grid">${["none", "standard", "hardened", "anonymous"].map((preset) => `<button class="preset-btn ${profile.privacy_preset === preset ? "active" : ""}" data-action="apply-preset" data-id="${profile.id}" data-preset="${preset}">${preset}</button>`).join("")}</div>
        <div class="privacy-flags">${flags.map(([icon, key, label, sub]) => `
          <div class="privacy-flag ${profile[key] ? "on" : ""}" data-action="toggle-profile-flag" data-id="${profile.id}" data-key="${key}">
            <div class="flag-icon">${ICONS.check}</div>
            <span>${esc(label)}</span>
            <span class="flag-state">${profile[key] ? sub : "off"}</span>
          </div>
        `).join("")}</div>
      </div>
    `;
  }

  function privacyScore(profile) {
    const keys = ["block_trackers", "strip_tracking_params", "sanitize_headers", "strict_referer", "webrtc_block", "doh_enabled", "force_https", "harden_all", "in_memory", "auto_wipe_close", "tor_mode"];
    const base = profile.gw_engine ? 20 : 5;
    const compatPenalty = profile.compat_mode ? -15 : 0;
    return Math.max(0, Math.min(100, base + keys.reduce((sum, key) => sum + (profile[key] ? 8 : 0), 0) + compatPenalty));
  }

  function renderAuthTab(profile) {
    const proxy = profile.proxy_id ? proxyById(profile.proxy_id) : null;
    const isLive = liveSet().has(profile.id);
    return `
      <div class="section stack">
        <div><label class="label">Proxy actual</label><div class="between"><div class="input mono">${profile.tor_mode ? "tor -> 127.0.0.1:9050" : proxy ? `${esc(proxy.scheme)}://${esc(proxy.host)}:${esc(proxy.port)}` : "sin proxy"}</div>${profile.tor_mode ? `<span class="pill accent">tor</span>` : proxy ? `<button class="btn btn-ghost" data-action="remove-proxy" data-id="${profile.id}">quitar</button>` : `<button class="btn btn-primary" data-action="assign-proxy" data-id="${profile.id}">asignar</button>`}</div></div>
        <button class="btn btn-ghost" data-action="open-cookies" data-id="${profile.id}" ${isLive ? "" : "disabled"}>${isLive ? "editor de cookies" : "requiere abrir el perfil"}</button>
        <form id="totpForm" class="stack-sm" data-id="${profile.id}">
          <label class="label">2FA / TOTP</label>
          <input class="input mono" name="totp" placeholder="secret base32" value="${attr(profile.totp_secret || "")}" />
          <div class="flex"><button class="btn btn-primary" type="submit">guardar TOTP</button>${profile.totp_secret ? `<button class="btn btn-ghost" type="button" data-action="copy-totp" data-id="${profile.id}">copiar codigo actual</button>` : ""}</div>
        </form>
      </div>
    `;
  }

  function renderNotesTab(profile) {
    return `
      <form id="notesForm" class="section stack" data-id="${profile.id}">
        <div><label class="label">Nombre</label><input class="input" name="name" value="${attr(profile.name)}" /></div>
        <div><label class="label">URL inicial</label><input class="input" name="url" value="${attr(profile.url || "")}" /></div>
        <div><label class="label">Grupo / tag</label><input class="input" name="group_tag" value="${attr(profile.group_tag || "")}" /></div>
        <div><label class="label">Notas</label><textarea class="textarea mono" name="notes" placeholder="# Login\n- usuario: x">${esc(profile.notes || "")}</textarea></div>
        <button class="btn btn-primary" type="submit">guardar notas</button>
      </form>
    `;
  }

  function renderLogsTab(profile) {
    const logs = state.events.filter((e) => e.profile_id === profile.id).slice(0, 40);
    return `<div class="section stack-sm mono small-note">${logs.length ? logs.map((e) => `<div>[${new Date(e.ts).toLocaleTimeString()}] ${esc(e.kind)} ${esc(e.payload)}</div>`).join("") : "sin actividad"}</div>`;
  }

  function renderMacrosTab(profile) {
    const macros = profile.macros || [];
    return `
      <div class="section stack">
        <div class="between"><span class="small-note">${macros.length} macros</span><button class="btn btn-primary" data-action="add-macro" data-id="${profile.id}">nueva</button></div>
        <button class="btn btn-ghost" data-action="warmup" data-id="${profile.id}">warmup / navegacion humanizada</button>
        ${macros.length ? macros.map((m) => `<div class="metric between"><div><strong>${esc(m.name)}</strong><div class="small-note">${m.steps.length} pasos</div></div><button class="btn btn-ghost" data-action="run-macro" data-id="${profile.id}" data-macro="${m.id}">ejecutar</button></div>`).join("") : `<div class="small-note">Sin macros. Puedes crear un JSON o generar un warmup.</div>`}
      </div>
    `;
  }

  function renderNewProfileModal() {
    return `
      <div class="modal-backdrop" data-action="close-modal">
        <form id="newProfileForm" class="modal-card" data-modal-card>
          <div class="modal-head between"><div><div class="title">Nuevo perfil</div><div class="subtitle">Sesion aislada con fingerprint propio</div></div><button class="icon-btn" type="button" data-action="close-modal">x</button></div>
          <div class="modal-body stack">
            <div class="grid-2"><div><label class="label">Nombre *</label><input class="input" name="name" required autofocus /></div><div><label class="label">Grupo / tag</label><input class="input" name="group_tag" /></div></div>
            <div><label class="label">URL inicial</label><input class="input" name="url" placeholder="shein.com.mx" /></div>
            <div><label class="label">Plantilla de fingerprint</label><select class="select" name="template_id"><option value="win_firefox_mx">Windows / Firefox 135 (MX)</option>${templates.filter((t) => t.id !== "win_firefox_mx").map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join("")}</select></div>
            <div><label class="label">Proxy</label><select class="select" name="proxy_id"><option value="">Sin proxy</option>${state.proxies.map((p) => `<option value="${p.id}">${esc(p.label || `${p.host}:${p.port}`)} ${p.healthy ? "+" : "-"}</option>`).join("")}</select></div>
            <div><label class="label">Privacidad</label>${radioSegments("privacy", ["none", "standard", "hardened", "anonymous"], "standard", 4)}<div class="small-note" id="privacy-subtitle">tracker-block · strip-utm · no-clienthints · DoH</div></div>
            <div><label class="label">Motor</label>${radioSegments("engine", ["Firefox / Camoufox (indetectable)", "Chromium (compatibilidad)"], "Firefox / Camoufox (indetectable)", 2)}<div class="small-note" id="engine-subtitle">spoofing a nivel de motor estilo Dolphin, maxima indetectabilidad, recomendado para pagos</div></div>
            <div><label class="label">Modo</label>${radioSegments("mode", ["normal", "compatibilidad"], "normal", 2)}<div class="small-note" id="mode-subtitle">spoofs agresivos ON · maximo anti-fingerprint · captchas duros pueden fallar</div></div>
            <button class="btn btn-ghost" type="button" data-action="toggle-profile-advanced">${ui.profileAdvanced ? "ocultar" : "mostrar"} avanzado</button>
            ${ui.profileAdvanced ? renderProfileAdvancedFields() : ""}
          </div>
          <div class="modal-foot between"><button class="btn btn-ghost" type="button" data-action="close-modal">cancelar</button><button class="btn btn-primary" type="submit">crear perfil</button></div>
        </form>
      </div>
    `;
  }

  function renderProfileAdvancedFields() {
    return `
      <div class="metric stack">
        <div class="grid-3">
          <div><label class="label">Resolucion</label><select class="select" name="resolution">${resolutions.map((r) => `<option value="${r}" ${r === "1920x1080" ? "selected" : ""}>${r}</option>`).join("")}</select></div>
          <div><label class="label">Timezone</label><select class="select" name="timezone">${timezones.map((t) => `<option value="${t}" ${t === "America/Monterrey" ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div><label class="label">Idioma</label><select class="select" name="locale">${locales.map((l) => `<option value="${l}" ${l === "es-MX" ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        </div>
        <div><label class="label">2FA / TOTP secret</label><input class="input mono" name="totp_secret" /></div>
        <div class="grid-3">
          <label class="metric"><input type="checkbox" name="headless" /> headless</label>
          <label class="metric"><input type="checkbox" name="har_enabled" /> grabar HAR</label>
          <label class="metric"><input type="checkbox" name="webrtc_block" checked /> bloquear WebRTC</label>
        </div>
      </div>
    `;
  }

  function radioSegments(name, values, selected, cols) {
    return `<div class="segmented cols-${cols}">${values.map((value) => `<label><input type="radio" name="${name}" value="${attr(value)}" ${value === selected ? "checked" : ""} /><span class="segment">${esc(value)}</span></label>`).join("")}</div>`;
  }

  function renderWelcomeModal() {
    const step = ui.welcomeStep || 0;
    const slides = [
      ["Que es Gestor Web", "Es un gestor de perfiles web con identidades aisladas. Cada perfil tiene su propio fingerprint, cookies, almacenamiento y proxy. Sirve para gestionar varias cuentas online sin que se correlacionen entre si."],
      ["Privacidad por perfil", "Standard: tracker block + headers limpios + DoH. Hardened: strict referer + spoof extremo + auto-wipe. Anonymous: Tor + memoria pura."],
      ["Sobre los proxies", "Si quieres cambiar la IP por perfil, agrega proxies en la seccion Proxies (Ctrl+3). Soporta SOCKS5 y HTTP/HTTPS con autenticacion."],
      ["Cosas que debes saber", "DevTools puede estar bloqueado en produccion. Atajos: Ctrl+N nuevo perfil · Ctrl+K paleta · Ctrl+0 navegador · Ctrl+1-9 vistas."]
    ];
    return `
      <div class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-head between"><div class="title">Bienvenido a Gestor Web</div><button class="icon-btn" data-action="close-welcome">x</button></div>
          <div class="modal-body stack"><h2>${esc(slides[step][0])}</h2><p class="muted" style="line-height:1.7">${esc(slides[step][1])}</p><div class="flex">${slides.map((_, i) => `<span class="dot" style="background:${i === step ? "var(--accent)" : "var(--bg-border)"}"></span>`).join("")}</div></div>
          <div class="modal-foot between"><button class="btn btn-ghost" data-action="welcome-prev" ${step === 0 ? "disabled" : ""}>atras</button><div class="flex"><button class="btn btn-ghost" data-action="close-welcome">cerrar</button>${step < slides.length - 1 ? `<button class="btn btn-primary" data-action="welcome-next">siguiente</button>` : `<button class="btn btn-primary" data-action="welcome-create">crear mi primer perfil</button>`}</div></div>
        </div>
      </div>
    `;
  }

  function renderProxiesView() {
    return `
      <section class="section stack">
        <div class="between"><div class="muted">${state.proxies.length} proxies en el pool</div><div class="flex"><button class="btn btn-ghost" data-action="health-check">health check</button><button class="btn btn-ghost" data-action="toggle-proxy-bulk">bulk import</button><button class="btn btn-primary" data-action="toggle-proxy-add">+ anadir proxy</button></div></div>
        ${ui.proxyBulk ? renderProxyBulk() : ""}
        ${ui.proxyAdding ? renderProxyAdd() : ""}
        <div class="table-head proxy-grid"><div>Endpoint</div><div>Esquema</div><div>Latencia</div><div>Estado</div><div>En uso</div><div></div></div>
        <div class="stack-sm">${state.proxies.length ? state.proxies.map(renderProxyRow).join("") : `<div class="empty"><div>No hay proxies. Anade uno.</div></div>`}</div>
      </section>
    `;
  }

  function renderProxyBulk() {
    return `<form id="proxyBulkForm" class="metric stack"><div class="grid-2"><select class="select" name="scheme"><option>http</option><option>https</option><option>socks5</option></select></div><textarea class="textarea mono" name="bulk" placeholder="Un proxy por linea. Formatos:\nscheme://user:pass@host:port\nhost:port\nhost:port:user:pass\nuser:pass@host:port"></textarea><div class="between"><button class="btn btn-ghost" type="button" data-action="toggle-proxy-bulk">cancelar</button><button class="btn btn-primary" type="submit">importar</button></div></form>`;
  }

  function renderProxyAdd() {
    return `<form id="proxyAddForm" class="metric stack"><div class="grid-3"><div><label class="label">esquema</label><select class="select" name="scheme"><option>http</option><option>https</option><option>socks5</option></select></div><div><label class="label">host</label><input class="input" name="host" required placeholder="1.2.3.4" /></div><div><label class="label">puerto</label><input class="input" name="port" required placeholder="8080" /></div></div><div class="grid-3"><div><label class="label">user</label><input class="input" name="username" /></div><div><label class="label">pass</label><input class="input" name="password" type="password" /></div><div><label class="label">label</label><input class="input" name="label" /></div></div><div class="between"><button class="btn btn-ghost" type="button" data-action="toggle-proxy-add">x</button><button class="btn btn-primary" type="submit">guardar</button></div></form>`;
  }

  function renderProxyRow(p) {
    return `<div class="row-grid proxy-grid"><div class="mono">${p.label ? `<span class="dim">${esc(p.label)}</span> ` : ""}${esc(p.host)}:${esc(p.port)}</div><div class="muted">${esc(p.scheme)}</div><div class="mono muted">${p.latency_ms != null ? `${p.latency_ms}ms` : "-"}</div><div><span class="pill ${p.healthy ? "live" : "dim"}"><span class="dot"></span>${p.healthy ? "ok" : "caido"}</span></div><div class="muted">${p.in_use ? "asignado" : "libre"}</div><button class="icon-btn" data-action="remove-proxy-row" data-id="${p.id}">x</button></div>`;
  }

  function renderSchedulesView() {
    const byProfile = Object.fromEntries(state.profiles.map((p) => [p.id, p]));
    return `
      <section class="section stack">
        <div class="between"><div class="muted">${state.schedules.length} tareas</div><button class="btn btn-primary" data-action="toggle-schedule-add">+ nueva tarea</button></div>
        ${ui.scheduleAdding ? renderScheduleAdd() : ""}
        <div class="stack-sm">${state.schedules.length ? state.schedules.map((s) => `<div class="row-grid schedule-grid"><div>${esc(byProfile[s.profile_id]?.name || "(borrado)")}</div><div class="muted">cada ${s.every_minutes}min</div><div class="muted">${esc(s.action)}${s.duration_minutes ? ` · ${s.duration_minutes}min` : ""}</div><div class="mono dim">${s.next_run_at ? new Date(s.next_run_at).toLocaleTimeString() : "-"}</div><button class="pill ${s.enabled ? "live" : "dim"}" data-action="toggle-schedule" data-id="${s.id}">${s.enabled ? "on" : "off"}</button><button class="icon-btn" data-action="remove-schedule" data-id="${s.id}">x</button></div>`).join("") : `<div class="empty"><div>No hay tareas.</div></div>`}</div>
      </section>
    `;
  }

  function renderScheduleAdd() {
    return `<form id="scheduleForm" class="metric stack"><div class="grid-4"><div><label class="label">Perfil</label><select class="select" name="profile_id" required><option value="">elegir...</option>${state.profiles.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div><div><label class="label">Cada (min)</label><input class="input" type="number" name="every" value="60" /></div><div><label class="label">Accion</label><select class="select" name="action"><option value="open">abrir</option><option value="open_close">abrir y cerrar</option><option value="wipe">limpiar cookies</option><option value="rotate_proxy">rotar proxy</option></select></div><div><label class="label">Duracion</label><input class="input" type="number" name="duration" value="5" /></div></div><div class="between"><button class="btn btn-ghost" type="button" data-action="toggle-schedule-add">x</button><button class="btn btn-primary" type="submit">guardar</button></div></form>`;
  }

  function renderStatsView() {
    const opens = state.events.filter((e) => e.kind === "opened").length;
    const closes = state.events.filter((e) => e.kind === "closed").length;
    const groups = new Set(state.profiles.map((p) => p.group_tag).filter(Boolean)).size;
    const healthy = state.proxies.filter((p) => p.healthy).length;
    const latencies = state.proxies.filter((p) => p.latency_ms != null).map((p) => p.latency_ms);
    const mean = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const days = lastSevenDays();
    return `<section class="section stack"><div class="stat-grid">${statCard("Perfiles", state.profiles.length, `${state.liveIds.length} en vivo`)}${statCard("Grupos", groups, "distintos")}${statCard("Proxies OK", `${healthy}/${state.proxies.length}`, `${mean}ms media`)}${statCard("Aperturas", opens, `${closes} cierres`)}</div><div class="metric"><h3>Actividad ultimos 7 dias</h3><div class="bars">${days.map((d) => `<div class="bar-col"><div class="bar" style="height:${d.pct}%"></div><div>${d.label}</div><div>${d.n}</div></div>`).join("")}</div></div><div class="metric"><h3>Top 5 mas usados</h3>${topProfilesHtml()}</div></section>`;
  }

  function statCard(label, value, sub) {
    return `<div class="metric"><div class="label">${label}</div><div style="font-size:28px;font-weight:700">${value}</div><div class="small-note">${sub}</div></div>`;
  }

  function lastSevenDays() {
    const buckets = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const n = state.events.filter((e) => new Date(e.ts).toISOString().slice(0, 10) === key).length;
      buckets.push({ label: key.slice(5), n });
    }
    const max = Math.max(1, ...buckets.map((b) => b.n));
    return buckets.map((b) => ({ ...b, pct: Math.max(4, (b.n / max) * 100) }));
  }

  function topProfilesHtml() {
    const counts = {};
    state.events.forEach((e) => { if (e.kind === "opened" && e.profile_id) counts[e.profile_id] = (counts[e.profile_id] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!top.length) return `<div class="small-note">sin datos</div>`;
    const max = Math.max(...top.map(([, n]) => n));
    return `<div class="stack-sm">${top.map(([id, n]) => `<div class="between"><span>${esc(profileById(id)?.name || "-")}</span><div class="progress" style="flex:1"><span style="width:${(n / max) * 100}%"></span></div><span class="mono dim">${n}</span></div>`).join("")}</div>`;
  }

  function renderHistoryView() {
    return `<section class="section stack"><div class="muted">Ultimos ${state.events.length} eventos</div>${state.events.length ? state.events.map((e) => `<div class="metric schedule-grid"><div class="mono dim">${new Date(e.ts).toLocaleString()}</div><div class="accent">${esc(e.kind)}</div><div>${esc(profileById(e.profile_id)?.name || "-")}</div><div class="mono dim">${esc(e.payload || "")}</div><div></div><div></div></div>`).join("") : `<div class="empty"><div>sin eventos</div></div>`}</section>`;
  }

  function renderMonitorView() {
    const lives = state.profiles.filter((p) => state.liveIds.includes(p.id));
    if (!lives.length) return `<div class="empty"><div><div class="empty-title">Sin perfiles activos</div><div>Abre uno o varios perfiles y vuelve aqui</div></div></div>`;
    return `<section class="section"><div class="grid-3">${lives.map((p) => `<div class="metric stack-sm"><div class="between"><strong>${esc(p.name)}</strong><span class="pill live">en vivo</span></div><div class="small-note mono">${esc(p.url || "about:blank")}</div><div class="progress"><span style="width:${p.warmup || 0}%"></span></div><button class="btn btn-primary" data-action="focus-profile" data-id="${p.id}">enfocar</button></div>`).join("")}</div></section>`;
  }

  function renderNetworkView() {
    if (!state.liveIds.length) return `<div class="empty"><div><div class="empty-title">Sin perfiles activos</div><div>Abre un perfil para capturar trafico</div></div></div>`;
    return `<section class="section stack"><form id="repeaterForm" class="metric stack"><div class="grid-3"><select class="select" name="method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select><input class="input" name="url" placeholder="https://api.ejemplo.com" /><button class="btn btn-primary" type="submit">enviar</button></div><textarea class="textarea mono" name="headers" placeholder="Headers (key: value)"></textarea><textarea class="textarea mono" name="body" placeholder="Body"></textarea></form><div class="metric"><div class="label">Response</div><pre class="mono small-note">${esc(ui.repeaterOutput || "...")}</pre></div><div class="stack-sm">${state.netEntries.map((n) => `<div class="metric between"><span class="mono">${esc(n.method)} ${esc(n.url)}</span><span class="pill ${n.status < 400 ? "live" : "danger"}">${n.status}</span></div>`).join("")}</div></section>`;
  }

  function renderBrowseView() {
    const active = state.browserTabs.find((t) => t.id === state.activeTabId) || null;
    return `
      <div class="browser">
        <div class="browser-tabs">${state.browserTabs.map((t) => `<div class="browser-tab-wrap ${t.id === state.activeTabId ? "active" : ""}"><button class="browser-tab" data-action="activate-browser-tab" data-id="${t.id}">${esc(t.title || t.url)}</button><button class="tab-close" data-action="close-browser-tab" data-id="${t.id}">${ICONS.close}</button></div>`).join("")}<button class="btn btn-primary" data-action="browser-new-tab">+ nueva pestana</button></div>
        <div class="browser-toolbar">
          <button class="btn btn-ghost" data-action="browser-back">atras</button><button class="btn btn-ghost" data-action="browser-reload">recargar</button>
          <select id="browserProfile" class="select" style="max-width:220px"><option value="">elige perfil...</option>${state.profiles.map((p) => `<option value="${p.id}" ${ui.browserProfileId === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
          <input id="browserUrl" class="input mono" placeholder="abre una pestana" value="${attr(ui.browserUrl || active?.url || "")}" />
          <button class="btn btn-primary" data-action="browser-go">ir</button>
          <span class="pill accent">TOR</span>
        </div>
        <div class="browser-stage">${active ? renderBrowserActive(active) : renderBrowserEmpty()}</div>
      </div>
    `;
  }

  function renderBrowserEmpty() {
    return `<div style="max-width:680px;width:100%;text-align:center"><h2>Navegador embebido</h2><p class="muted">Abre una pestana eligiendo perfil</p><button class="btn btn-primary" data-action="browser-new-tab">+ nueva pestana (Ctrl+T)</button><div class="label" style="margin-top:28px">Sitios utiles</div><div class="quick-grid">${quickLinks.map(([label, url, tag]) => `<button class="quick-link" data-action="quick-open" data-url="${attr(url)}"><span class="pill accent">${tag}</span><div style="margin-top:8px">${esc(label)}</div></button>`).join("")}</div></div>`;
  }

  function renderBrowserActive(tab) {
    const profile = profileById(tab.profileId);
    if (native) {
      const userAgent = profile?.fingerprint?.userAgent || firefoxUserAgent();
      return `<div class="webview-shell"><webview class="webview-frame" data-tab-id="${tab.id}" src="${attr(tab.url)}" partition="persist:gw-${attr(tab.profileId)}" useragent="${attr(userAgent)}" allowpopups></webview></div>`;
    }
    return `<div class="panel-card" style="width:min(900px,100%);padding:28px;text-align:center"><div class="pill live">sesion aislada</div><h2>${esc(tab.title || tab.url)}</h2><p class="muted mono">${esc(tab.url)}</p><p class="small-note">Abre con Electron para usar webview real y particiones persistentes por perfil.</p><div class="flex right" style="justify-content:center;margin-top:18px"><button class="btn btn-primary" data-action="open-external" data-url="${attr(tab.url)}">abrir externo</button><button class="btn btn-ghost" data-action="open-detection" data-id="${profile?.id || ""}" data-kind="creepjs">test deteccion</button></div><div class="small-note" style="margin-top:18px">Perfil: ${esc(profile?.name || "sin perfil")}</div></div>`;
  }

  function renderSettingsView() {
    return `<section class="section stack"><div class="metric stack"><h3>Ajustes</h3><div class="grid-3"><div><label class="label">Tema</label><input class="input" value="midnight" readonly /></div><div><label class="label">Electron</label><span class="pill ${native ? "live" : "warn"}">${native ? "nativo" : "browser"}</span></div><div><label class="label">Tor</label><span class="pill ${state.settings.torReady ? "live" : "warn"}">${state.settings.torReady ? "detectado" : "no detectado"}</span></div></div><div class="flex"><button class="btn btn-ghost" data-action="toggle-chromium">marcar Chromium</button><button class="btn btn-ghost" data-action="toggle-tor">detectar Tor</button><button class="btn btn-ghost" data-action="open-data-dir">abrir datos</button><button class="btn btn-primary" data-action="export-vault">exportar vault</button><button class="btn btn-ghost" data-action="import-vault">importar vault</button><button class="btn btn-ghost btn-danger" data-action="reset-data">reset data</button></div><div class="small-note mono">Token vault: ${esc(state.settings.vaultToken)}</div></div><div class="metric small-note">Modo Electron: persistencia en disco, webview real por perfil, particiones aisladas, cookies reales, proxy por sesion, headers privacy, repeater HTTP y TOTP nativo.</div></section>`;
  }

  function renderCommandPalette() {
    const commands = [
      ...navItems.map(([id, , label]) => ({ group: "Navegacion", label, run: `view:${id}`, hint: id })),
      { group: "Accion", label: "Crear nuevo perfil", run: "new-profile", hint: "Ctrl+N" },
      ...state.profiles.map((p) => ({ group: "Perfil", label: `Abrir ${p.name}`, run: `open:${p.id}`, hint: state.liveIds.includes(p.id) ? "en vivo" : "inactivo" }))
    ].filter((c) => c.label.toLowerCase().includes(ui.commandQuery.toLowerCase()));
    return `<div class="modal-backdrop"><div class="palette"><input id="commandInput" class="input" style="border:0;border-radius:0;padding:18px" placeholder="buscar comando o perfil..." value="${attr(ui.commandQuery)}" />${commands.slice(0, 12).map((c) => `<button class="palette-row" data-action="run-command" data-run="${attr(c.run)}"><span class="dim">${esc(c.group)}</span><span>${esc(c.label)}</span><span class="mono dim">${esc(c.hint)}</span></button>`).join("")}</div></div>`;
  }

  function renderCookieEditor(profileId) {
    const profile = profileById(profileId);
    const allCookies = profile?.cookies || [];
    const q = (ui.cookieSearch || "").toLowerCase();
    const cookies = q ? allCookies.filter((c) => `${c.domain || ""}${c.name || ""}${c.value || ""}`.toLowerCase().includes(q)) : allCookies;
    return `<div class="modal-backdrop"><div class="modal-card wide" style="max-width:900px"><div class="modal-head between"><div><div class="title">Editor de Cookies</div><div class="subtitle">${cookies.length}${q !== "" ? ` de ${allCookies.length}` : ""} cookies · ${esc(profile?.name || "")}</div></div><button class="icon-btn" data-action="close-cookies">x</button></div><div class="modal-body stack"><div class="flex" style="gap:8px;flex-wrap:wrap;margin-bottom:12px"><input class="input" placeholder="buscar cookies..." value="${attr(ui.cookieSearch || "")}" data-action="set-cookie-search" style="flex:1;min-width:200px"/><button class="btn btn-ghost" data-action="import-cookies" data-id="${profileId}">importar JSON</button><button class="btn btn-ghost" data-action="save-cookies" data-id="${profileId}">guardar</button><button class="btn btn-ghost btn-danger" data-action="clear-cookies" data-id="${profileId}">limpiar todo</button></div>${cookies.length ? `<div style="max-height:400px;overflow:auto;border:1px solid var(--bg-border);border-radius:8px"><table style="width:100%;border-collapse:collapse" class="mono small-note"><thead><tr style="position:sticky;top:0;background:var(--bg-panel)"><th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Dominio</th><th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Nombre</th><th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Valor</th><th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border);width:100px">Expira</th><th style="width:40px"></th></tr></thead><tbody>${cookies.map((c) => `<tr style="border-bottom:1px solid var(--bg-border)"><td style="padding:6px 8px">${esc(c.domain)}</td><td style="padding:6px 8px">${esc(c.name)}</td><td style="padding:6px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.value)}</td><td style="padding:6px 8px;color:var(--muted)">${esc(c.expires || "session")}</td><td style="padding:6px 8px;text-align:center"><button class="btn btn-ghost btn-danger" style="padding:2px 6px;font-size:11px" data-action="delete-cookie" data-id="${profileId}" data-domain="${attr(c.domain)}" data-name="${attr(c.name)}">x</button></td></tr>`).join("")}</tbody></table></div>` : `<div style="text-align:center;padding:40px;color:var(--muted)">${q ? "sin resultados" : "sin cookies"}</div>`}<details style="margin-top:12px"><summary style="cursor:pointer;color:var(--muted);font-size:12px">ver JSON</summary><textarea class="textarea mono" style="margin-top:8px;height:160px;font-size:11px">${esc(JSON.stringify(allCookies, null, 2))}</textarea></details></div></div></div>`;
  }

  function bind() {
    root.onclick = handleClick;
    const licenseForm = document.getElementById("licenseForm");
    if (licenseForm) licenseForm.onsubmit = activateLicense;
    const profileForm = document.getElementById("newProfileForm");
    if (profileForm) profileForm.onsubmit = createProfile;
    const proxyAdd = document.getElementById("proxyAddForm");
    if (proxyAdd) proxyAdd.onsubmit = addProxy;
    const proxyBulk = document.getElementById("proxyBulkForm");
    if (proxyBulk) proxyBulk.onsubmit = bulkImportProxies;
    const schedule = document.getElementById("scheduleForm");
    if (schedule) schedule.onsubmit = addSchedule;
    const notes = document.getElementById("notesForm");
    if (notes) notes.onsubmit = saveNotes;
    const totp = document.getElementById("totpForm");
    if (totp) totp.onsubmit = saveTotp;
    const repeater = document.getElementById("repeaterForm");
    if (repeater) repeater.onsubmit = sendRepeater;
    bindInput("searchInput", (el) => update((s) => { s.filters.search = el.value; }));
    bindInput("proxyFilter", (el) => update((s) => { s.filters.proxyState = el.value; }));
    bindInput("groupFilter", (el) => update((s) => { s.filters.group = el.value; }));
    bindInput("browserProfile", (el) => { ui.browserProfileId = el.value; });
    bindInput("browserUrl", (el) => { ui.browserUrl = el.value; });
    const commandInput = document.getElementById("commandInput");
    if (commandInput) {
      commandInput.focus();
      commandInput.oninput = () => { ui.commandQuery = commandInput.value; rerender(); };
    }
    bindWebviews();
    bindModalSubtitles();
  }

  function bindModalSubtitles() {
    const modal = document.getElementById("newProfileForm");
    if (!modal) return;
    const subtitleMap = {
      privacy: {
        none: "sin capas extra",
        standard: "tracker-block · strip-utm · no-clienthints · DoH",
        hardened: "tracker-block · strip-utm · no-clienthints · no-referrer · DoH · spoof-extremo · auto-wipe",
        anonymous: "tracker-block · strip-utm · no-clienthints · no-referrer · DoH · spoof-extremo · memoria · auto-wipe · TOR en 127.0.0.1:9050"
      },
      engine: {
        "Firefox / Camoufox (indetectable)": "spoofing a nivel de motor estilo Dolphin, maxima indetectabilidad, recomendado para pagos",
        "Chromium (compatibilidad)": "motor clasico con spoof por JS en ventana Electron"
      },
      mode: {
        normal: "spoofs agresivos ON · maximo anti-fingerprint · captchas duros pueden fallar",
        compatibilidad: "reduce agresividad de spoofs para mejorar compatibilidad"
      }
    };
    const getSubtitle = (name) => {
      const checked = modal.querySelector(`input[name="${name}"]:checked`);
      if (!checked) return "";
      const val = checked.value;
      return subtitleMap[name]?.[val] || "";
    };
    const updatePrivacySubtitle = () => {
      const el = document.getElementById("privacy-subtitle");
      if (el) el.textContent = getSubtitle("privacy");
    };
    const updateEngineSubtitle = () => {
      const el = document.getElementById("engine-subtitle");
      if (el) el.textContent = getSubtitle("engine");
    };
    const updateModeSubtitle = () => {
      const el = document.getElementById("mode-subtitle");
      if (el) el.textContent = getSubtitle("mode");
    };
    modal.addEventListener("change", (e) => {
      if (e.target.name === "privacy") updatePrivacySubtitle();
      if (e.target.name === "engine") updateEngineSubtitle();
      if (e.target.name === "mode") updateModeSubtitle();
    });
  }

  function bindWebviews() {
    document.querySelectorAll("webview[data-tab-id]").forEach((webview) => {
      const tabId = webview.dataset.tabId;
      webview.addEventListener("did-navigate", (event) => updateBrowserTab(tabId, { url: event.url }));
      webview.addEventListener("did-navigate-in-page", (event) => updateBrowserTab(tabId, { url: event.url }));
      webview.addEventListener("page-title-updated", (event) => updateBrowserTab(tabId, { title: event.title }));
      webview.addEventListener("did-fail-load", (event) => {
        if (event.errorCode === -3) return;
        state.netEntries.unshift({ id: uid("net"), method: "WEBVIEW", url: event.validatedURL || webview.src, status: event.errorCode, ts: Date.now() });
        state.netEntries = state.netEntries.slice(0, 50);
        save();
      });
    });
  }

  function updateBrowserTab(tabId, patch) {
    const tab = state.browserTabs.find((item) => item.id === tabId);
    if (!tab) return;
    Object.assign(tab, patch);
    if (tab.id === state.activeTabId && patch.url) ui.browserUrl = patch.url;
    save();
    const input = document.getElementById("browserUrl");
    if (input && tab.id === state.activeTabId && patch.url) input.value = patch.url;
  }

  function bindInput(id, fn) {
    const el = document.getElementById(id);
    if (el) el.onchange = () => fn(el);
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "close-modal" && target.classList.contains("modal-backdrop") && event.target.closest("[data-modal-card]")) return;
    const id = target.dataset.id;
    if (action !== "select-profile") event.stopPropagation();

    const actions = {
      "copy-hwid": () => navigator.clipboard?.writeText(target.dataset.hwid),
      "import-license": () => alert("Importador .gw pendiente. Pega la licencia en el textarea para activar esta replica."),
      "set-view": () => update((s) => { s.view = target.dataset.view; }),
      "new-profile": () => { ui.newProfile = true; ui.profileAdvanced = false; rerender(); },
      "close-modal": () => { ui.newProfile = false; rerender(); },
      "toggle-profile-advanced": () => { ui.profileAdvanced = !ui.profileAdvanced; rerender(); },
      "select-profile": () => update((s) => { s.selectedId = id; }),
      "open-profile": () => openProfile(id, { openWindow: true, focusBrowser: true, createTab: true }),
      "close-profile": () => closeProfile(id),
      "focus-profile": () => focusProfile(id),
      "clone-profile": () => cloneProfile(id),
      "wipe-profile": () => wipeProfile(id),
      "delete-profile": () => deleteProfile(id),
      "open-profile-path": () => openProfilePath(id),
      "toggle-profile-flag": () => toggleProfileFlag(id, target.dataset.key),
      "apply-preset": () => applyPreset(id, target.dataset.preset),
      "assign-proxy": () => assignProxy(id),
      "remove-proxy": () => update((s) => { profileById(id).proxy_id = null; logEvent("rotate_proxy", id, "proxy removido"); }),
      "set-inspector-tab": () => { ui.inspectorTab = target.dataset.tab; rerender(); },
      "refresh-fingerprint": () => update((s) => { profileById(id).fingerprint.noiseSeed = Math.floor(Math.random() * 1e9); }),
      "open-detection": () => openDetection(id, target.dataset.kind),
      "open-cookies": () => openCookies(id),
      "close-cookies": () => { ui.cookieProfileId = null; ui.cookieSearch = ""; rerender(); },
      "add-cookie": () => addCookie(id),
      "clear-cookies": () => clearCookies(id),
      "delete-cookie": () => deleteCookie(id, { domain: target.dataset.domain, name: target.dataset.name }),
      "save-cookies": () => saveCookies(id),
      "import-cookies": () => {
        const text = prompt("Pega las cookies en formato JSON array:");
        if (text) importCookies(id, text);
      },
      "set-cookie-search": () => { ui.cookieSearch = target.value; rerender(); },
      "copy-totp": () => copyTotp(id),
      "add-macro": () => addMacro(id),
      "warmup": () => warmup(id),
      "run-macro": () => runMacro(id, target.dataset.macro),
      "toggle-proxy-add": () => { ui.proxyAdding = !ui.proxyAdding; rerender(); },
      "toggle-proxy-bulk": () => { ui.proxyBulk = !ui.proxyBulk; rerender(); },
      "health-check": () => healthCheck(),
      "remove-proxy-row": () => removeProxy(id),
      "toggle-schedule-add": () => { ui.scheduleAdding = !ui.scheduleAdding; rerender(); },
      "toggle-schedule": () => update((s) => { const item = s.schedules.find((x) => x.id === id); if (item) item.enabled = !item.enabled; }),
      "remove-schedule": () => update((s) => { s.schedules = s.schedules.filter((x) => x.id !== id); }),
      "welcome-prev": () => { ui.welcomeStep = Math.max(0, (ui.welcomeStep || 0) - 1); rerender(); },
      "welcome-next": () => { ui.welcomeStep = Math.min(3, (ui.welcomeStep || 0) + 1); rerender(); },
      "close-welcome": () => closeWelcome(false),
      "welcome-create": () => closeWelcome(true),
      "open-command": () => { ui.command = true; ui.commandQuery = ""; rerender(); },
      "run-command": () => runCommand(target.dataset.run),
      "browser-new-tab": () => browserNewTab(),
      "close-browser-tab": () => { const id = target.dataset.id; update((s) => { s.browserTabs = s.browserTabs.filter((t) => t.id !== id); if (s.activeTabId === id) s.activeTabId = s.browserTabs[0]?.id || null; }); },
      "browser-go": () => browserGo(),
      "quick-open": () => { ui.browserUrl = target.dataset.url; browserGo(); },
      "activate-browser-tab": () => update((s) => { s.activeTabId = target.dataset.id; }),
      "open-external": () => native?.app?.openExternal ? native.app.openExternal(target.dataset.url) : window.open(target.dataset.url, "_blank", "noopener"),
      "browser-back": () => activeWebview()?.goBack(),
      "browser-reload": () => activeWebview()?.reload(),
      "toggle-chromium": () => update((s) => { s.settings.chromiumReady = true; logEvent("chromium_installed", null, "simulado"); }),
      "toggle-tor": () => detectTor(),
      "open-data-dir": () => native?.app?.openDataDir?.(),
      "export-vault": () => exportVault(),
      "import-vault": () => importVault(),
      "reset-data": () => resetData()
    };
    actions[action]?.();
  }

  async function activateLicense(event) {
    event.preventDefault();
    const text = document.getElementById("licenseText").value.trim();
    if (!text) return alert("Pega una key o contenido .gw para activar esta replica.");
    const nativeStatus = native?.license?.claimByKey ? await native.license.claimByKey(text) : { active: true };
    if (!nativeStatus.active) return alert("Licencia invalida para este HWID.");
    ui.welcome = true;
    update((s) => {
      s.license = { active: true, text, shortId: shortId(12), hwid: nativeStatus.hwid || null, activatedAt: Date.now() };
    });
  }

  function createProfile(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const privacy = data.get("privacy") || "standard";
    const preset = presetValues(privacy);
    const template = templates.find((t) => t.id === data.get("template_id")) || templates[0];
    const resolution = String(data.get("resolution") || `${template.width}x${template.height}`).replace(/\s.+$/, "");
    const [width, height] = resolution.split("x").map((n) => parseInt(n, 10));
    const profile = {
      id: uid("prof"),
      name,
      url: normalizeUrl(String(data.get("url") || "").trim()),
      group_tag: String(data.get("group_tag") || "").trim() || null,
      proxy_id: data.get("proxy_id") || null,
      privacy_preset: privacy,
      gw_engine: data.get("engine") !== "Chromium (compatibilidad)",
      compat_mode: data.get("mode") === "compatibilidad",
      headless: data.get("headless") === "on",
      har_enabled: data.get("har_enabled") === "on",
      webrtc_block: data.get("webrtc_block") === "on" || !ui.profileAdvanced,
      totp_secret: String(data.get("totp_secret") || "").trim() || null,
      notes: "",
      cookies: [],
      macros: [],
      warmup: 0,
      open_count: 0,
      created_at: Date.now(),
      fingerprint: makeFingerprint(template, {
        width: width || template.width,
        height: height || template.height,
        timezone: data.get("timezone") || template.timezone,
        locale: data.get("locale") || template.locale
      }),
      ...preset
    };
    update((s) => {
      s.profiles.unshift(profile);
      s.selectedId = profile.id;
      logEvent("created", profile.id, profile.url || "sin URL");
    });
    ui.newProfile = false;
  }

  function makeFingerprint(template, overrides) {
    const browser = template.browser.includes("Safari") ? "Safari/17.4" : template.browser.includes("Firefox") ? "Firefox/135.0" : "Chrome/124.0";
    const platform = template.os === "macOS" ? "MacIntel" : template.os === "Android" ? "Linux armv8" : template.os === "iOS" ? "iPhone" : "Win32";
    const ua = template.os === "iOS"
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"
      : template.os === "Android"
        ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36"
        : template.browser === "Firefox"
          ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0"
          : `Mozilla/5.0 (${template.os === "macOS" ? "Macintosh; Intel Mac OS X 14_4" : "Windows NT 10.0; Win64; x64"}) AppleWebKit/537.36 ${browser} Safari/537.36`;
    const gpus = [
      "ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (Intel, Intel(R) Iris Xe Graphics Direct3D11 vs_5_0 ps_5_0), or similar"
    ];
    const gpu = gpus[Math.floor(Math.random() * gpus.length)];
    return {
      os: template.os,
      browser: template.browser,
      platform,
      userAgent: ua,
      webgl: gpu,
      canvas: `gw-${shortId(10).toLowerCase()}`,
      audio: `gw-${shortId(10).toLowerCase()}`,
      timezone: overrides.timezone,
      locale: overrides.locale,
      cores: [2, 4, 6, 8, 12, 16][Math.floor(Math.random() * 6)],
      memoryGB: [4, 8, 16, 32][Math.floor(Math.random() * 4)],
      noiseSeed: Math.floor(Math.random() * 1e9),
      resolution: { width: overrides.width, height: overrides.height }
    };
  }

  function presetValues(preset) {
    const off = { block_trackers: false, strip_tracking_params: false, sanitize_headers: false, strict_referer: false, in_memory: false, auto_wipe_close: false, tor_mode: false, doh_enabled: false, harden_all: false, force_https: false };
    if (preset === "none") return off;
    if (preset === "standard") return { ...off, block_trackers: true, strip_tracking_params: true, sanitize_headers: true, doh_enabled: true, webrtc_block: true };
    if (preset === "hardened") return { ...off, block_trackers: true, strip_tracking_params: true, sanitize_headers: true, strict_referer: true, auto_wipe_close: true, doh_enabled: true, harden_all: true, webrtc_block: true };
    return { ...off, block_trackers: true, strip_tracking_params: true, sanitize_headers: true, strict_referer: true, in_memory: true, auto_wipe_close: true, tor_mode: true, doh_enabled: true, harden_all: true, webrtc_block: true };
  }

  function normalizeUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }

  function safeHost(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url || "nueva pestana";
    }
  }

  function firefoxUserAgent() {
    return "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0";
  }

  function forceFirefoxFingerprint(profile) {
    profile.fingerprint ||= {};
    profile.fingerprint.os = "Windows";
    profile.fingerprint.browser = "Firefox";
    profile.fingerprint.platform = "Win32";
    profile.fingerprint.userAgent = firefoxUserAgent();
    const gpus = [
      "ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0), or similar",
      "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0), or similar"
    ];
    profile.fingerprint.webgl = profile.fingerprint.webgl || gpus[Math.floor(Math.random() * gpus.length)];
    profile.fingerprint.locale ||= "es-MX";
    profile.fingerprint.timezone ||= "America/Mexico_City";
    profile.fingerprint.resolution ||= { width: 1920, height: 1080 };
    profile.fingerprint.cores ||= [4, 8, 16][Math.floor(Math.random() * 3)];
    profile.fingerprint.memoryGB ||= [8, 16, 32][Math.floor(Math.random() * 3)];
  }

  async function openProfile(id, options = {}) {
    const profile = profileById(id);
    if (!profile) return;
    if (profile.gw_engine) forceFirefoxFingerprint(profile);
    const proxy = profile.proxy_id ? proxyById(profile.proxy_id) : null;

    if (options.openWindow && native?.profiles?.openWindow) {
      const result = await native.profiles.openWindow(profile, proxy, profile.url || null);
      if (result?.ok) {
        update((s) => {
          if (!s.liveIds.includes(id)) s.liveIds.push(id);
          const p = profileById(id);
          if (p) {
            p.open_count = (p.open_count || 0) + 1;
            p.warmup = Math.max(p.warmup || 0, Math.floor(20 + Math.random() * 35));
            p._windowMode = result.mode || "electron";
          }
          logEvent("opened", id, `ventana externa (${result.mode || "window"})`);
        });
        return;
      }
    }

    if (native?.browse?.prepareSession && profile) await native.browse.prepareSession(profile, proxy);
    update((s) => {
      if (!s.liveIds.includes(id)) s.liveIds.push(id);
      const p = profileById(id);
      if (p) {
        p.open_count = (p.open_count || 0) + 1;
        p.warmup = Math.max(p.warmup || 0, Math.floor(20 + Math.random() * 35));
      }
      if (options.createTab && p) {
        const startUrl = p.url || (p.tor_mode ? "https://check.torproject.org/" : "https://duckduckgo.com/");
        let tab = s.browserTabs.find((item) => item.profileId === id && item.url === startUrl);
        if (!tab) {
          tab = { id: uid("tab"), profileId: id, url: startUrl, title: safeHost(startUrl) };
          s.browserTabs.push(tab);
        }
        s.activeTabId = tab.id;
        ui.browserProfileId = id;
        ui.browserUrl = startUrl;
      }
      if (options.focusBrowser) s.view = "browse";
      logEvent("opened", id, pLabel(id));
    });
  }

  async function focusProfile(id) {
    if (native?.profiles?.focusWindow) await native.profiles.focusWindow(id);
  }

  async function closeProfile(id) {
    if (native?.profiles?.closeWindow) await native.profiles.closeWindow(id);
    const profile = profileById(id);
    if (native?.cookies?.clear && (profile?.in_memory || profile?.auto_wipe_close)) await native.cookies.clear(id);
    update((s) => {
      s.liveIds = s.liveIds.filter((x) => x !== id);
      s.browserTabs = s.browserTabs.filter((t) => t.profileId !== id);
      if (s.activeTabId && !s.browserTabs.find((t) => t.id === s.activeTabId)) s.activeTabId = s.browserTabs[0]?.id || null;
      const p = profileById(id);
      if (p?._windowMode) delete p._windowMode;
      if (p?.in_memory || p?.auto_wipe_close) p.cookies = [];
      if (p?.auto_wipe_close) logEvent("auto_wiped_on_close", id);
      logEvent("closed", id, pLabel(id));
    });
  }

  function cloneProfile(id) {
    const source = profileById(id);
    if (!source) return;
    update((s) => {
      const copy = clone(source);
      copy.id = uid("prof");
      copy.name = `${source.name} copia`;
      copy.created_at = Date.now();
      copy.open_count = 0;
      copy.warmup = 0;
      copy.fingerprint.canvas = `gw-${shortId(10).toLowerCase()}`;
      copy.fingerprint.audio = `gw-${shortId(10).toLowerCase()}`;
      s.profiles.unshift(copy);
      s.selectedId = copy.id;
      logEvent("created", copy.id, "clonado");
    });
  }

  async function wipeProfile(id) {
    if (!confirm("Borrar cookies/cache?")) return;
    if (native?.cookies?.clear) await native.cookies.clear(id);
    update((s) => {
      const p = profileById(id);
      if (p) p.cookies = [];
      logEvent("wiped", id, "cookies/cache");
    });
  }

  async function deleteProfile(id) {
    const name = profileById(id)?.name || "este perfil";
    if (!confirm(`Eliminar "${name}"? Esta accion no se puede deshacer.`)) return;
    if (native?.profiles?.closeWindow) await native.profiles.closeWindow(id);
    update((s) => {
      s.profiles = s.profiles.filter((p) => p.id !== id);
      s.liveIds = s.liveIds.filter((x) => x !== id);
      s.browserTabs = s.browserTabs.filter((t) => t.profileId !== id);
      if (s.selectedId === id) s.selectedId = s.profiles[0]?.id || null;
      logEvent("deleted", id, name);
    });
  }

  function openProfilePath(id) {
    if (native?.profiles?.openPath) {
      native.profiles.openPath(id);
    } else if (native?.app?.openExternal) {
      native.app.openExternal(`file://${profileById(id)?.fingerprint?.profileDir || ""}`);
    }
    logEvent("opened", id, "profile path");
  }

  function toggleProfileFlag(id, key) {
    update(() => {
      const p = profileById(id);
      if (p) p[key] = !p[key];
    });
  }

  function applyPreset(id, preset) {
    update(() => {
      const p = profileById(id);
      if (p) Object.assign(p, presetValues(preset), { privacy_preset: preset });
      logEvent("preset", id, preset);
    });
  }

  function assignProxy(id) {
    update((s) => {
      const p = profileById(id);
      if (!p) return;
      const used = new Set(s.profiles.map((x) => x.proxy_id).filter(Boolean));
      const free = s.proxies.find((x) => x.healthy && !used.has(x.id)) || s.proxies.find((x) => !used.has(x.id));
      if (!free) return alert("No hay proxies libres");
      p.proxy_id = free.id;
      logEvent("rotate_proxy", id, `${free.host}:${free.port}`);
    });
  }

  function addProxy(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    update((s) => {
      s.proxies.unshift({
        id: uid("proxy"),
        scheme: data.get("scheme"),
        host: String(data.get("host") || "").trim(),
        port: parseInt(data.get("port"), 10),
        username: String(data.get("username") || "").trim() || null,
        password: String(data.get("password") || "").trim() || null,
        label: String(data.get("label") || "").trim() || null,
        healthy: false,
        latency_ms: null,
        last_error: "sin test"
      });
      logEvent("proxy_added", null, data.get("host"));
    });
    ui.proxyAdding = false;
  }

  function bulkImportProxies(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const scheme = data.get("scheme") || "http";
    const lines = String(data.get("bulk") || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    let added = 0;
    update((s) => {
      for (const line of lines) {
        const parsed = parseProxyLine(line, scheme);
        if (!parsed) continue;
        s.proxies.unshift({ id: uid("proxy"), healthy: false, latency_ms: null, last_error: "sin test", ...parsed });
        added++;
      }
      logEvent("proxy_bulk_import", null, `${added} agregados`);
    });
    ui.proxyBulk = false;
    alert(`${added} agregados, ${Math.max(0, lines.length - added)} errores`);
  }

  function parseProxyLine(line, defaultScheme) {
    try {
      if (line.includes("://")) {
        const u = new URL(line);
        return { scheme: u.protocol.replace(":", ""), host: u.hostname, port: parseInt(u.port, 10), username: u.username || null, password: u.password || null, label: null };
      }
      if (line.includes("@")) {
        const [auth, hostPort] = line.split("@");
        const [username, password] = auth.split(":");
        const [host, port] = hostPort.split(":");
        return { scheme: defaultScheme, host, port: parseInt(port, 10), username, password, label: null };
      }
      const parts = line.split(":");
      if (parts.length === 2) return { scheme: defaultScheme, host: parts[0], port: parseInt(parts[1], 10), username: null, password: null, label: null };
      if (parts.length === 4) return { scheme: defaultScheme, host: parts[0], port: parseInt(parts[1], 10), username: parts[2], password: parts[3], label: null };
    } catch {
      return null;
    }
    return null;
  }

  async function healthCheck() {
    if (native?.proxies?.checkAll) {
      const checked = await native.proxies.checkAll(state.proxies);
      update((s) => {
        s.proxies = checked;
        logEvent("health_check", null, `${s.proxies.length} proxies`);
      });
      return;
    }
    update((s) => {
      s.proxies = s.proxies.map((p) => ({ ...p, healthy: Math.random() > 0.18, latency_ms: Math.floor(80 + Math.random() * 900), last_error: null }));
      logEvent("health_check", null, `${s.proxies.length} proxies`);
    });
  }

  function removeProxy(id) {
    update((s) => {
      s.proxies = s.proxies.filter((p) => p.id !== id);
      s.profiles.forEach((p) => { if (p.proxy_id === id) p.proxy_id = null; });
      logEvent("proxy_removed", null, id);
    });
  }

  function addSchedule(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    update((s) => {
      s.schedules.unshift({
        id: uid("task"),
        profile_id: data.get("profile_id"),
        every_minutes: parseInt(data.get("every"), 10) || 60,
        action: data.get("action"),
        duration_minutes: parseInt(data.get("duration"), 10) || null,
        enabled: true,
        next_run_at: Date.now() + (parseInt(data.get("every"), 10) || 60) * 60 * 1000
      });
      logEvent("schedule_added", data.get("profile_id"), data.get("action"));
    });
    ui.scheduleAdding = false;
  }

  function saveNotes(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = event.currentTarget.dataset.id;
    update(() => {
      const p = profileById(id);
      if (!p) return;
      p.name = String(data.get("name") || p.name);
      p.url = normalizeUrl(String(data.get("url") || ""));
      p.group_tag = String(data.get("group_tag") || "").trim() || null;
      p.notes = String(data.get("notes") || "");
      logEvent("updated", id, "notas");
    });
  }

  function saveTotp(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.id;
    const secret = String(new FormData(event.currentTarget).get("totp") || "").trim().replace(/\s+/g, "").toUpperCase();
    if (secret && !/^[A-Z2-7]+=*$/.test(secret)) return alert("TOTP secret invalido. Debe ser base32.");
    update(() => {
      const p = profileById(id);
      if (p) p.totp_secret = secret || null;
    });
  }

  async function copyTotp(id) {
    const secret = profileById(id)?.totp_secret;
    if (!secret) return;
    if (!native?.totp?.code) return alert("TOTP real disponible al abrir con Electron.");
    const result = await native.totp.code(secret);
    await navigator.clipboard?.writeText(result.code);
    alert(`Codigo ${result.code} copiado. Expira en ${result.secondsLeft}s.`);
  }

  async function openCookies(id) {
    ui.cookieSearch = "";
    if (native?.cookies?.get) {
      const cookies = await native.cookies.get(id);
      const profile = profileById(id);
      if (profile) profile.cookies = cookies;
      save();
    }
    ui.cookieProfileId = id;
    rerender();
  }

  async function addCookie(id) {
    const cookie = { domain: new URL(profileById(id)?.url || "https://example.com").hostname, name: `gw_${shortId(4).toLowerCase()}`, value: shortId(16), expires: "session" };
    if (native?.cookies?.set) await native.cookies.set(id, [cookie]);
    update(() => {
      const p = profileById(id);
      if (!p) return;
      p.cookies ||= [];
      p.cookies.push(cookie);
      logEvent("cookies_imported", id, "demo");
    });
  }

  async function clearCookies(id) {
    if (native?.cookies?.clear) await native.cookies.clear(id);
    update(() => {
      const p = profileById(id);
      if (p) p.cookies = [];
      logEvent("cookies_cleared", id);
    });
  }

  async function deleteCookie(profileId, cookie) {
    if (native?.cookies?.delete) {
      const updated = await native.cookies.delete(profileId, cookie);
      update(() => {
        const p = profileById(profileId);
        if (p) p.cookies = updated;
      });
    } else {
      update(() => {
        const p = profileById(profileId);
        if (p) p.cookies = (p.cookies || []).filter((c) => !(c.domain === cookie.domain && c.name === cookie.name));
      });
    }
  }

  async function saveCookies(profileId) {
    const p = profileById(profileId);
    if (!p?.cookies) return;
    if (native?.cookies?.set) {
      const updated = await native.cookies.set(profileId, p.cookies);
      p.cookies = updated;
    }
    save();
    logEvent("cookies_saved", profileId, `${p.cookies.length} cookies`);
  }

  async function importCookies(profileId, text) {
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) return;
      const cleaned = arr.map((c) => ({ domain: c.domain || "", name: c.name || `gw_${shortId(4)}`, value: String(c.value || ""), path: c.path || "/", expires: c.expires || "session", secure: c.secure !== false }));
      if (native?.cookies?.set) {
        const updated = await native.cookies.set(profileId, cleaned);
        update(() => { const p = profileById(profileId); if (p) p.cookies = updated; });
      } else {
        update(() => { const p = profileById(profileId); if (p) p.cookies = cleaned; });
      }
      logEvent("cookies_imported", profileId, `${cleaned.length} cookies`);
    } catch {}
  }

  function activeWebview() {
    return document.querySelector(`webview[data-tab-id="${CSS.escape(state.activeTabId || "")}"]`);
  }

  function addMacro(id) {
    const name = prompt("Nombre de macro", "warmup basico");
    if (!name) return;
    update(() => {
      const p = profileById(id);
      if (!p) return;
      p.macros ||= [];
      p.macros.push({ id: uid("macro"), name, steps: [{ kind: "goto", url: p.url || "https://duckduckgo.com" }, { kind: "wait", ms: 1200 }, { kind: "scroll", y: 650 }] });
      logEvent("macro_added", id, name);
    });
  }

  function warmup(id) {
    update(() => {
      const p = profileById(id);
      if (!p) return;
      p.warmup = Math.min(100, (p.warmup || 0) + Math.floor(25 + Math.random() * 35));
      logEvent("macro_run", id, "warmup");
    });
  }

  function runMacro(id, macroId) {
    update(() => {
      const p = profileById(id);
      const macro = p?.macros?.find((m) => m.id === macroId);
      logEvent("macro_run", id, macro?.name || macroId);
    });
  }

  async function openDetection(id, kind) {
    const urls = {
      creepjs: "https://abrahamjuliot.github.io/creepjs/",
      sannysoft: "https://bot.sannysoft.com/",
      pixelscan: "https://pixelscan.net/fingerprint-check"
    };
    const profile = profileById(id);
    if (profile && !state.liveIds.includes(id)) await openProfile(id);
    ui.browserProfileId = id;
    ui.browserUrl = urls[kind] || urls.creepjs;
    await browserGo();
  }

  async function browserNewTab() {
    const profileId = ui.browserProfileId || state.selectedId || state.profiles[0]?.id;
    if (!profileId) return alert("Crea un perfil primero (Ctrl+N)");
    ui.browserProfileId = profileId;
    const profile = profileById(profileId);
    ui.browserUrl = profile?.url || "https://duckduckgo.com/";
    await browserGo();
  }

  async function browserGo() {
    const prevProfileId = state.browserTabs.find((t) => t.id === state.activeTabId)?.profileId;
    const profileId = ui.browserProfileId || state.selectedId;
    if (!profileId) return alert("elige perfil...");
    let url = normalizeUrl(ui.browserUrl || profileById(profileId)?.url || "https://duckduckgo.com/");
    if (url.includes(" ") || !url.includes(".")) url = `https://duckduckgo.com/?q=${encodeURIComponent(ui.browserUrl)}`;
    const profile = profileById(profileId);
    if (profile?.gw_engine) forceFirefoxFingerprint(profile);
    if (profile) {
      if (native?.browse?.prepareSession) {
        if (prevProfileId && prevProfileId !== profileId) {
          if (native?.cookies?.clear) await native.cookies.clear(prevProfileId);
          await native.browse.freshenMemory?.(prevProfileId);
        }
        await native.browse.prepareSession(profile, profile.proxy_id ? proxyById(profile.proxy_id) : null);
      }
    }
    update((s) => {
      if (!s.liveIds.includes(profileId)) s.liveIds.push(profileId);
      if (prevProfileId && prevProfileId !== profileId) {
        s.browserTabs = s.browserTabs.filter((t) => t.profileId !== profileId);
      }
      const tab = { id: uid("tab"), profileId, url, title: safeHost(url) };
      s.browserTabs.push(tab);
      s.activeTabId = tab.id;
      s.view = "browse";
      logEvent("opened", profileId, url);
    });
  }

  async function sendRepeater(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const method = data.get("method");
    const url = data.get("url") || "https://example.com";
    const headers = Object.fromEntries(String(data.get("headers") || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const index = line.indexOf(":");
      return index === -1 ? [line, ""] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }));
    const response = native?.repeater?.send
      ? await native.repeater.send({ method, url, headers, body: data.get("body") || "" })
      : { status: Math.random() > 0.15 ? 200 : 403, headers: {}, body: "simulated", ms: 0 };
    ui.repeaterOutput = JSON.stringify(response, null, 2);
    update((s) => {
      s.netEntries.unshift({ id: uid("net"), method, url, status: response.status, ts: Date.now() });
      s.netEntries = s.netEntries.slice(0, 50);
    });
  }

  async function detectTor() {
    const result = native?.tor?.detect ? await native.tor.detect() : { healthy: true, latency_ms: 0 };
    update((s) => {
      s.settings.torReady = !!result.healthy;
      logEvent(result.healthy ? "tor_detected" : "tor_missing", null, result.healthy ? `127.0.0.1:9050 ${result.latency_ms || 0}ms` : (result.last_error || "no detectado"));
    });
  }

  async function exportVault() {
    if (native?.vault?.exportFile) {
      const result = await native.vault.exportFile(state);
      if (!result.canceled) alert(`Vault exportado: ${result.filePath}`);
      return;
    }
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gestor-web-vault.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importVault() {
    if (native?.vault?.importFile) {
      const result = await native.vault.importFile();
      if (!result.canceled && result.state) {
        state = normalize({ ...clone(defaults), ...result.state });
        save();
        render();
      }
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        state = normalize({ ...clone(defaults), ...JSON.parse(await file.text()) });
        save();
        render();
      } catch (error) {
        alert(`JSON invalido: ${error.message}`);
      }
    };
    input.click();
  }

  function resetData() {
    if (!confirm("Resetear datos de esta replica?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = normalize(clone(defaults));
    ui.welcome = false;
    render();
  }

  function closeWelcome(create) {
    update((s) => { s.onboardingSeen = true; });
    ui.welcome = false;
    if (create) ui.newProfile = true;
    rerender();
  }

  function runCommand(run) {
    ui.command = false;
    ui.commandQuery = "";
    if (run === "new-profile") { ui.newProfile = true; rerender(); return; }
    if (run.startsWith("view:")) update((s) => { s.view = run.slice(5); });
    if (run.startsWith("open:")) openProfile(run.slice(5));
  }

  function pLabel(id) {
    return profileById(id)?.name || id;
  }

  let schedulerStarted = false;

  function startScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;
    setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const task of state.schedules) {
        if (!task.enabled || !task.next_run_at || task.next_run_at > now) continue;
        const profile = profileById(task.profile_id);
        if (!profile) continue;
        if (task.action === "open" || task.action === "open_close") {
          if (!state.liveIds.includes(profile.id)) state.liveIds.push(profile.id);
          profile.open_count = (profile.open_count || 0) + 1;
          logEvent("opened", profile.id, `tarea ${task.id}`);
        }
        if (task.action === "wipe") {
          profile.cookies = [];
          native?.cookies?.clear?.(profile.id).catch(() => {});
          logEvent("wiped", profile.id, `tarea ${task.id}`);
        }
        if (task.action === "rotate_proxy") {
          const used = new Set(state.profiles.map((item) => item.proxy_id).filter(Boolean));
          const free = state.proxies.find((proxy) => proxy.healthy && !used.has(proxy.id));
          if (free) profile.proxy_id = free.id;
          logEvent("rotate_proxy", profile.id, `tarea ${task.id}`);
        }
        if (task.action === "open_close" && task.duration_minutes) {
          setTimeout(() => closeProfile(profile.id), task.duration_minutes * 60 * 1000);
        }
        task.next_run_at = now + task.every_minutes * 60 * 1000;
        changed = true;
      }
      if (changed) {
        state = normalize(state);
        save();
        render();
      }
    }, 30000);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.key === "Escape") {
      if (ui.newProfile || ui.command || ui.cookieProfileId) {
        ui.newProfile = false;
        ui.command = false;
        ui.cookieProfileId = null;
        rerender();
      } else {
        update((s) => { s.filters = { search: "", group: "", proxyState: "all" }; });
      }
    }
    if (event.ctrlKey && key === "n") { event.preventDefault(); ui.newProfile = true; rerender(); }
    if (event.ctrlKey && key === "k") { event.preventDefault(); ui.command = true; ui.commandQuery = ""; rerender(); }
    if (event.ctrlKey && key === "t") { event.preventDefault(); browserNewTab(); }
    if (event.ctrlKey && /^[0-9]$/.test(key)) {
      event.preventDefault();
      const map = { "0": "browse", "1": "all", "2": "live", "3": "proxies", "4": "schedules", "5": "history", "6": "stats", "7": "settings", "8": "monitor", "9": "network" };
      update((s) => { s.view = map[key] || s.view; });
    }
  });

  async function bootstrap() {
    try {
      state = normalize(await load());
      if (native?.license?.hwid && !localStorage.getItem("gestor-web-rebuild:hwid")) {
        localStorage.setItem("gestor-web-rebuild:hwid", await native.license.hwid());
      }
    } catch (error) {
      console.error(error);
      state = normalize(clone(defaults));
    }
    ui.welcome = !!state.license && !state.onboardingSeen;
    startScheduler();
    render();
  }

  bootstrap();
})();
