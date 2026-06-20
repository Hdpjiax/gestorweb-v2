import { ICONS } from "../icons.js";
import { toggleButton } from "./profile-row-view.js";

export function renderInspectorActions(profile) {
  return `
    <div class="action-row">
      ${toggleButton(profile, "headless",             ICONS.server,   "headless")}
      ${toggleButton(profile, "har_enabled",           ICONS.database, "HAR")}
      ${toggleButton(profile, "webrtc_block",          ICONS.wifi,     "anti-leak")}
      ${toggleButton(profile, "doh_enabled",           ICONS.dns,      "DoH")}
      ${toggleButton(profile, "force_https",           ICONS.lock,     "HTTPS")}
      ${toggleButton(profile, "in_memory",             ICONS.cpu,      "RAM")}
    </div>
    <div class="action-row">
      ${toggleButton(profile, "block_trackers",        ICONS.shield,   "trackers")}
      ${toggleButton(profile, "strip_tracking_params", ICONS.link,     "UTM")}
      ${toggleButton(profile, "sanitize_headers",      ICONS.globe,    "hints")}
      ${toggleButton(profile, "strict_referer",        ICONS.eye,      "referer")}
      ${toggleButton(profile, "harden_all",            ICONS.zap,      "spoof")}
      ${toggleButton(profile, "auto_wipe_close",       ICONS.refresh,  "wipe")}
    </div>
    <div class="action-row">
      <button class="btn btn-primary flex" data-action="assign-proxy"  data-id="${profile.id}">${ICONS.globe}<span>asignar proxy</span></button>
      <button class="btn btn-ghost flex"   data-action="open-cookies"  data-id="${profile.id}">${ICONS.cookie}<span>cookies</span></button>
      <button class="btn btn-ghost flex"   data-action="wipe-profile"  data-id="${profile.id}">${ICONS.trash}<span>wipe</span></button>
    </div>
    <div class="audit-row">
      <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="creepjs">${ICONS.bot}<span>creepjs</span></button>
      <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="sannysoft">${ICONS.lab}<span>sannysoft</span></button>
      <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="pixelscan">${ICONS.fingerprint}<span>pixelscan</span></button>
    </div>
    <div class="warning-note">
      ${ICONS.warning} Lo que NO se puede mitigar en esta capa: TLS JA3 fingerprint, HTTP/2, behavioral biometrics y stylometry.
      Para anonimato real usa Tor Browser o Tails OS.
    </div>
  `;
}
