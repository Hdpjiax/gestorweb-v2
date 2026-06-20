import { esc } from "../helpers.js";

export function inspectorScoreTier(score) {
  if (score >= 95) return "AISLADO";
  if (score >= 75) return "ALTO";
  if (score >= 50) return "MEDIO";
  return "BAJO";
}

export function inspectorScoreClass(score) {
  if (score >= 95) return "live";
  if (score >= 75) return "warn";
  return "danger";
}

export function renderInspectorHeader(profile, score) {
  const tier = inspectorScoreTier(score);
  return `
    <div class="inspector-head">
      <div class="between">
        <h2 class="title">${esc(profile.name)}</h2>
        ${profile.group_tag ? `<span class="pill accent">${esc(profile.group_tag)}</span>` : ""}
      </div>
      <div class="small-note mono">${esc(profile.url || "sin URL")}</div>
      <div class="inspector-score">
        <div class="score-bar"><div class="score-fill" style="width:${score}%"></div></div>
        <div class="score-labels"><span class="${inspectorScoreClass(score)}">${tier}</span><span class="mono">${score}%</span></div>
      </div>
    </div>
  `;
}
