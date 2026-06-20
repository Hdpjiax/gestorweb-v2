const STYLE_ID = "browser-soft-fonts";

if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    body.native-browser-mode .browser,
    body.native-browser-mode .browser * {
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      text-shadow: none !important;
      letter-spacing: 0 !important;
    }

    body.native-browser-mode .browser {
      font-weight: 400 !important;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }

    body.native-browser-mode .browser-brand-left strong,
    body.native-browser-mode .browser-stage h2 {
      font-weight: 600 !important;
    }

    body.native-browser-mode .browser-brandbar,
    body.native-browser-mode .browser-brandbar small,
    body.native-browser-mode .browser-toolbar .btn,
    body.native-browser-mode .browser-tool,
    body.native-browser-mode .browser-toolbar #browserProfile,
    body.native-browser-mode .browser-toolbar #browserUrl,
    body.native-browser-mode .browser-profile-chip,
    body.native-browser-mode .quick-link,
    body.native-browser-mode .browser-picker-card,
    body.native-browser-mode .browser-picker-card input,
    body.native-browser-mode .browser-picker-list button,
    body.native-browser-mode .browser-picker-list small {
      font-weight: 400 !important;
    }

    body.native-browser-mode .browser-toolbar #browserUrl {
      font-size: 13px !important;
      line-height: 30px !important;
    }

    body.native-browser-mode .browser-tab {
      font-size: 13px !important;
      font-weight: 500 !important;
    }

    body.native-browser-mode .browser-tab-wrap.active .browser-tab,
    body.native-browser-mode .browser-picker-list strong,
    body.native-browser-mode .browser-brand-right .save-pill {
      font-weight: 600 !important;
    }

    body.native-browser-mode .browser-toolbar .btn[data-action=browser-back]::before,
    body.native-browser-mode .browser-tabs > .btn::before {
      font-weight: 300 !important;
    }

    body.native-browser-mode .quick-link {
      font-size: 12px !important;
    }
  `;
  document.head.appendChild(style);
}
