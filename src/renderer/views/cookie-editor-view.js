import { esc, attr } from "../helpers.js";
import { ui } from "../state.js";
import { ICONS } from "../icons.js";
import { profileById } from "../utils.js";

export function renderCookieEditor(profileId) {
  const profile    = profileById(profileId);
  const allCookies = profile?.cookies || [];
  const q          = (ui.cookieSearch || "").toLowerCase();
  const cookies    = q
    ? allCookies.filter((c) => `${c.domain || ""}${c.name || ""}${c.value || ""}`.toLowerCase().includes(q))
    : allCookies;

  return `
    <div class="modal-backdrop">
      <div class="modal-card wide" style="max-width:900px">
        <div class="modal-head between">
          <div>
            <div class="title">Editor de Cookies</div>
            <div class="subtitle">${cookies.length}${q !== "" ? ` de ${allCookies.length}` : ""} cookies · ${esc(profile?.name || "")}</div>
          </div>
          <button class="icon-btn" data-action="close-cookies">x</button>
        </div>
        <div class="modal-body stack">
          <div class="flex" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">
            <input
              class="input"
              placeholder="buscar cookies..."
              value="${attr(ui.cookieSearch || "")}"
              data-action="set-cookie-search"
              style="flex:1;min-width:200px"
            />
            <button class="btn btn-ghost"           data-action="import-cookies" data-id="${profileId}">importar JSON</button>
            <button class="btn btn-ghost"           data-action="save-cookies"   data-id="${profileId}">guardar</button>
            <button class="btn btn-ghost btn-danger" data-action="clear-cookies"  data-id="${profileId}">limpiar todo</button>
          </div>
          ${cookies.length ? `
            <div style="max-height:400px;overflow:auto;border:1px solid var(--bg-border);border-radius:8px">
              <table style="width:100%;border-collapse:collapse" class="mono small-note">
                <thead>
                  <tr style="position:sticky;top:0;background:var(--bg-panel)">
                    <th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Dominio</th>
                    <th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Nombre</th>
                    <th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Valor</th>
                    <th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border);width:100px">Expira</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${cookies.map((c) => `
                    <tr style="border-bottom:1px solid var(--bg-border)">
                      <td style="padding:6px 8px">${esc(c.domain)}</td>
                      <td style="padding:6px 8px">${esc(c.name)}</td>
                      <td style="padding:6px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.value)}</td>
                      <td style="padding:6px 8px;color:var(--muted)">${esc(c.expires || "session")}</td>
                      <td>
                        <button
                          class="icon-btn"
                          data-action="delete-cookie"
                          data-id="${profileId}"
                          data-domain="${attr(c.domain)}"
                          data-name="${attr(c.name)}"
                        >${ICONS.trash}</button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : `<div class="empty"><div>sin cookies</div></div>`}
        </div>
      </div>
    </div>
  `;
}
