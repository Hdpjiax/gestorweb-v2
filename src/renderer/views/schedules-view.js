import { state, ui } from "../state.js";
import { renderSchedulesList } from "./schedules-list-view.js";

function profilesById() {
  return Object.fromEntries(state.profiles.map((profile) => [profile.id, profile]));
}

function renderScheduleAddPlaceholder() {
  if (!ui.scheduleAdding) return "";
  return `<div class="metric small-note">Formulario de nueva tarea pendiente de modularizar.</div>`;
}

export function renderSchedulesView() {
  return `
    <section class="section stack">
      <div class="between">
        <div class="muted">${state.schedules.length} tareas</div>
        <button class="btn btn-primary" data-action="toggle-schedule-add">+ nueva tarea</button>
      </div>
      ${renderScheduleAddPlaceholder()}
      <div class="stack-sm">${renderSchedulesList(profilesById())}</div>
    </section>
  `;
}
