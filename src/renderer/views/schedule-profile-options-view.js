import { esc, attr } from "../helpers.js";
import { state } from "../state.js";

export function renderScheduleProfileOptions() {
  return state.profiles
    .map((profile) => `<option value="${attr(profile.id)}">${esc(profile.name)}</option>`)
    .join("");
}
