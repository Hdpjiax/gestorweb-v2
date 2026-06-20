import { attr, esc } from "../helpers.js";

export function renderInspectorNotesTab(profile) {
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
