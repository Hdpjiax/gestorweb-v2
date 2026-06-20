import { esc } from "../helpers.js";
import { liveSet } from "../state.js";
import { ICONS } from "../icons.js";
import { buildChecks } from "../fingerprint.js";

export function renderInspectorFingerprintTab(profile) {
  const isLive = liveSet().has(profile.id);
  const fp = profile.fingerprint || {};
  const checks = buildChecks(profile, fp, isLive);

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
      <div class="check-list">${checks.map((c) => `<div class="check-row"><span class="check-icon ${c.status === "ok" ? "ok" : c.status === "warn" ? "warn" : "fail"}">${c.status === "ok" ? ICONS.check : c.status === "warn" ? ICONS.warning : ICONS.close}</span><span>${c.icon} ${esc(c.label)}</span><span class="mono ${c.status}">${esc(c.value)}</span></div>`).join("")}</div>
      <details class="raw-data"><summary>${ICONS.database} datos crudos del fingerprint</summary><pre class="small-note mono">${esc(JSON.stringify(fp, null, 2))}</pre></details>
    </div>
  `;
}
