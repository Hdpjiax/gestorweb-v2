import { renderScheduleProfileOptions } from "./schedule-profile-options-view.js";
import { renderScheduleActionOptions } from "./schedule-action-options-view.js";

export function renderScheduleForm() {
  return `
    <form id="scheduleForm" class="metric stack">
      <div class="grid-4">
        <div>
          <label class="label">Perfil</label>
          <select class="select" name="profile_id" required>
            <option value="">elegir...</option>
            ${renderScheduleProfileOptions()}
          </select>
        </div>
        <div>
          <label class="label">Cada (min)</label>
          <input class="input" type="number" name="every" value="60" />
        </div>
        <div>
          <label class="label">Accion</label>
          <select class="select" name="action">${renderScheduleActionOptions()}</select>
        </div>
        <div>
          <label class="label">Duracion</label>
          <input class="input" type="number" name="duration" value="5" />
        </div>
      </div>
      <div class="between">
        <button class="btn btn-ghost" type="button" data-action="toggle-schedule-add">x</button>
        <button class="btn btn-primary" type="submit">guardar</button>
      </div>
    </form>
  `;
}
