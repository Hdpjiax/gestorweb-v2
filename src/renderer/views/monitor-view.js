import { esc, attr } from "../helpers.js";
import { state, ui } from "../state.js";

function renderMonitorEmpty() {
  return `
    <div class="empty">
      <div>
        <div class="empty-title">Sin perfiles activos</div>
        <div>Abre uno o varios perfiles y vuelve aqui</div>
      </div>
    </div>
  `;
}

function renderLiveProfileCard(profile) {
  return `
    <div class="metric live-monitor-card stack-sm">
      <div class="between"><strong>${esc(profile.name)}</strong><span class="pill live">en vivo</span></div>
      <div class="live-preview-frame" data-action="focus-profile" data-id="${attr(profile.id)}">
        <img data-profile-preview="${attr(profile.id)}" ${ui.profilePreviews[profile.id] ? `src="${attr(ui.profilePreviews[profile.id])}"` : ""} alt="Vista en vivo de ${attr(profile.name)}" />
        <span>capturando vista...</span>
      </div>
      <div class="small-note mono">${esc(profile.url || "about:blank")}</div>
      <div class="progress"><span style="width:${profile.warmup || 0}%"></span></div>
      <button class="btn btn-primary" data-action="focus-profile" data-id="${profile.id}">enfocar</button>
    </div>
  `;
}

export function renderMonitorView() {
  const liveProfiles = state.profiles.filter((profile) => state.liveIds.includes(profile.id));
  if (!liveProfiles.length) return renderMonitorEmpty();

  return `
    <section class="section">
      <div class="grid-3">${liveProfiles.map(renderLiveProfileCard).join("")}</div>
    </section>
  `;
}
