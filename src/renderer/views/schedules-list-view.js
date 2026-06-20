import { esc } from "../helpers.js";
import { state } from "../state.js";
import { renderSchedulesEmpty } from "./schedules-empty-view.js";

function profileName(profileMap, schedule) {
  return esc(profileMap[schedule.profile_id]?.name || "(borrado)");
}

function scheduleTime(schedule) {
  return schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleTimeString() : "-";
}

export function renderSchedulesList(profileMap) {
  if (!state.schedules.length) return renderSchedulesEmpty();

  return state.schedules.map((schedule) => `
    <div class="row-grid schedule-grid">
      <div>${profileName(profileMap, schedule)}</div>
      <div class="muted">cada ${schedule.every_minutes}min</div>
      <div class="muted">${esc(schedule.action)}${schedule.duration_minutes ? ` · ${schedule.duration_minutes}min` : ""}</div>
      <div class="mono dim">${scheduleTime(schedule)}</div>
      <button class="pill ${schedule.enabled ? "live" : "dim"}" data-action="toggle-schedule" data-id="${schedule.id}">${schedule.enabled ? "on" : "off"}</button>
      <button class="icon-btn" data-action="remove-schedule" data-id="${schedule.id}">x</button>
    </div>
  `).join("");
}
