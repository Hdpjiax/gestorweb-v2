import { esc, attr } from "../helpers.js";
import { state, ui } from "../state.js";

function headersText(headers) {
  return Object.entries(headers || {}).map(([name, value]) => `${name}: ${value}`).join("\n");
}

function methodOptions(selected) {
  return ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
    .map((method) => `<option ${method === selected ? "selected" : ""}>${method}</option>`)
    .join("");
}

function profileOptions(selected) {
  return `<option value="">conexion directa</option>${state.profiles.map((profile) => `
    <option value="${attr(profile.id)}" ${profile.id === selected ? "selected" : ""}>
      ${esc(profile.name)}${state.liveIds.includes(profile.id) ? " (activo)" : ""}
    </option>
  `).join("")}`;
}

function statusClass(entry) {
  if (entry.phase === "error" || Number(entry.status) >= 400) return "danger";
  if (entry.phase === "completed") return "live";
  return "warn";
}

export function renderNetworkEntryList() {
  if (!state.netEntries.length) {
    return `<div class="network-empty">Abre un perfil: sus solicitudes GET, POST y recursos apareceran aqui en tiempo real.</div>`;
  }
  return state.netEntries.map((entry) => {
    const duration = entry.completedAt && entry.ts ? `${entry.completedAt - entry.ts} ms` : entry.phase || "pendiente";
    return `
      <button class="network-entry ${ui.networkSelectedId === entry.id ? "selected" : ""}" type="button" data-action="load-network-entry" data-id="${attr(entry.id)}">
        <span class="network-method method-${String(entry.method || "GET").toLowerCase()}">${esc(entry.method || "GET")}</span>
        <span class="network-entry-main">
          <strong>${esc(entry.url)}</strong>
          <small>${esc(entry.profileName || entry.profileId || "directo")} · ${esc(entry.resourceType || "other")} · ${esc(duration)}</small>
        </span>
        <span class="pill ${statusClass(entry)}">${esc(entry.status || entry.phase || "...")}</span>
      </button>
    `;
  }).join("");
}

function renderSelectedDetails(entry) {
  if (!entry) return "";
  return `
    <div class="network-details grid-2">
      <div class="metric stack-sm">
        <div class="label">Request capturado</div>
        <pre class="mono small-note">${esc(headersText(entry.requestHeaders) || "sin headers")}</pre>
        ${entry.body ? `<pre class="mono network-body">${esc(entry.body)}</pre>` : ""}
      </div>
      <div class="metric stack-sm">
        <div class="label">Response capturada</div>
        <pre class="mono small-note">${esc(headersText(entry.responseHeaders) || entry.error || "esperando respuesta")}</pre>
      </div>
    </div>
  `;
}

export function renderNetworkView() {
  const selectedEntry = state.netEntries.find((entry) => entry.id === ui.networkSelectedId) || null;
  const draft = ui.repeaterDraft || (selectedEntry ? {
    profileId: selectedEntry.profileId,
    method: selectedEntry.method,
    url: selectedEntry.url,
    headers: headersText(selectedEntry.requestHeaders),
    body: selectedEntry.body || ""
  } : {});

  return `
    <section class="section network-shell stack">
      <div class="network-title between">
        <div>
          <strong>Interceptor de perfiles</strong>
          <div class="small-note">Captura en vivo · selecciona una solicitud, modificala y reenviala por la misma sesion</div>
        </div>
        <div class="flex">
          <span class="pill ${state.liveIds.length ? "live" : "dim"}">${state.liveIds.length} perfiles activos</span>
          <button class="btn btn-ghost" type="button" data-action="clear-network-log">limpiar</button>
        </div>
      </div>
      <form id="repeaterForm" class="metric stack">
        <div class="network-request-line">
          <select class="select" name="profileId" aria-label="Perfil">${profileOptions(draft.profileId || "")}</select>
          <select class="select" name="method" aria-label="Metodo">${methodOptions(draft.method || "GET")}</select>
          <input class="input mono" name="url" value="${attr(draft.url || "")}" placeholder="https://api.ejemplo.com/recurso?id=1" />
          <button class="btn btn-primary" type="submit">enviar modificado</button>
        </div>
        <div class="grid-2">
          <textarea class="textarea mono" name="headers" placeholder="Headers (key: value)">${esc(draft.headers || "")}</textarea>
          <textarea class="textarea mono" name="body" placeholder="Body POST / PUT / PATCH">${esc(draft.body || "")}</textarea>
        </div>
      </form>
      <div class="metric network-response">
        <div class="label">Respuesta del Repeater</div>
        <pre class="mono small-note">${esc(ui.repeaterOutput || "Selecciona una solicitud o crea una nueva.")}</pre>
      </div>
      ${renderSelectedDetails(selectedEntry)}
      <div class="network-log-head between">
        <strong>Solicitudes interceptadas</strong>
        <span class="small-note">${state.netEntries.length} eventos</span>
      </div>
      <div id="networkEntries" class="network-entries">${renderNetworkEntryList()}</div>
    </section>
  `;
}
