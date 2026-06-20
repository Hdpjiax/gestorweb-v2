import { esc, attr } from "../helpers.js";
import { state, ui } from "../state.js";

export function renderProxyBulk() {
  return `
    <form id="proxyBulkForm" class="metric stack">
      <div class="grid-2">
        <select class="select" name="scheme">
          <option>http</option>
          <option>https</option>
          <option>socks5</option>
          <option>socks4</option>
        </select>
      </div>
      <textarea
        class="textarea mono"
        name="bulk"
        placeholder="Pega JSON, CSV o texto. Formatos validos:\nhost:port\nhost:port:user:pass\nuser:pass@host:port\nscheme://user:pass@host:port\n0a4f...__cr.us;state.illinois:pass@gw.dataimpulse.com:10022\n\nCSV: host,port,username,password,scheme,label\nJSON: [{&quot;host&quot;:&quot;1.2.3.4&quot;,&quot;port&quot;:8080,&quot;username&quot;:&quot;u&quot;,&quot;password&quot;:&quot;p&quot;}]"
      ></textarea>
      <div class="between">
        <span class="small-note">Solo se agregan proxies validos. Duplicados e invalidos se omiten.</span>
        <div class="flex">
          <button class="btn btn-ghost" type="button" data-action="toggle-proxy-bulk">cancelar</button>
          <button class="btn btn-primary" type="submit">importar</button>
        </div>
      </div>
    </form>
  `;
}

export function renderProxyAdd() {
  return `
    <form id="proxyAddForm" class="metric stack">
      <div class="grid-3">
        <div>
          <label class="label">esquema</label>
          <select class="select" name="scheme">
            <option>http</option>
            <option>https</option>
            <option>socks5</option>
            <option>socks4</option>
          </select>
        </div>
        <div>
          <label class="label">host</label>
          <input class="input" name="host" required placeholder="1.2.3.4" />
        </div>
        <div>
          <label class="label">puerto</label>
          <input class="input" name="port" required placeholder="8080" />
        </div>
      </div>
      <div class="grid-3">
        <div><label class="label">user</label><input class="input" name="username" /></div>
        <div><label class="label">pass</label><input class="input" name="password" type="password" /></div>
        <div><label class="label">label</label><input class="input" name="label" /></div>
      </div>
      <div class="between">
        <button class="btn btn-ghost" type="button" data-action="toggle-proxy-add">x</button>
        <button class="btn btn-primary" type="submit">guardar</button>
      </div>
    </form>
  `;
}

export function renderProxyRow(p) {
  const hasTest = p.last_error && p.last_error !== "sin test";
  const statusClass = p.healthy ? "live" : hasTest ? "danger" : "dim";
  const rowClass    = p.healthy ? "proxy-ok" : hasTest ? "proxy-bad" : "";
  const statusLabel = p.healthy ? "ok" : hasTest ? "caido" : "sin test";

  const meta = [
    p.label    ? `<span class="proxy-tag">${esc(p.label)}</span>` : "",
    p.username || p.password ? `<span class="proxy-tag">auth</span>` : "",
  ].filter(Boolean).join("");

  const endpoint = `
    <div class="proxy-endpoint">
      <div class="mono" title="${attr(`${p.host}:${p.port}`)}">${esc(p.host)}:${esc(p.port)}</div>
      ${meta ? `<div class="proxy-meta">${meta}</div>` : ""}
    </div>
  `;

  const checkbox = `<input type="checkbox" data-action="toggle-proxy-selected" data-id="${p.id}" ${ui.selectedProxyIds.has(p.id) ? "checked" : ""} />`;
  const removeBtn = `<button class="icon-btn" data-action="remove-proxy-row" data-id="${p.id}">x</button>`;

  if (ui.testingProxyIds.has(p.id)) {
    return `
      <div class="row-grid proxy-grid proxy-row proxy-testing">
        ${checkbox}
        ${endpoint}
        <div class="muted">${esc(p.scheme)}</div>
        <div class="mono muted">...</div>
        <div><span class="pill testing"><span class="dot testing-dot"></span>testeando</span></div>
        <div class="muted">${p.in_use ? "asignado" : "libre"}</div>
        ${removeBtn}
      </div>
    `;
  }

  return `
    <div class="row-grid proxy-grid proxy-row ${rowClass}">
      ${checkbox}
      ${endpoint}
      <div class="muted">${esc(p.scheme)}</div>
      <div class="mono muted">${p.latency_ms != null ? `${p.latency_ms}ms` : "-"}</div>
      <div>
        <span class="pill ${statusClass}" title="${attr(p.last_error || statusLabel)}">
          <span class="dot"></span>${statusLabel}
        </span>
      </div>
      <div class="muted">${p.in_use ? "asignado" : "libre"}</div>
      ${removeBtn}
    </div>
  `;
}

export function renderProxiesView() {
  const selectedCount = ui.selectedProxyIds.size;
  const testedDead    = state.proxies.filter((p) => !p.healthy && p.last_error && p.last_error !== "sin test").length;
  const healthy       = state.proxies.filter((p) => p.healthy).length;
  const tested        = state.proxies.filter((p) => p.last_error && p.last_error !== "sin test").length + healthy;
  const pending       = Math.max(0, state.proxies.length - tested);
  const latencies     = state.proxies.filter((p) => p.latency_ms != null).map((p) => p.latency_ms);
  const avgLatency    = latencies.length
    ? `${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms`
    : "-";
  const allSelected   = state.proxies.length > 0 && selectedCount === state.proxies.length;

  return `
    <section class="section proxy-shell">
      <div class="proxy-hero">
        <div>
          <div class="label">Proxy pool</div>
          <h2>Red de salida</h2>
          <p class="muted">Pruebas reales por proxy con HTTP CONNECT, SOCKS5 y SOCKS4. Cada fila se actualiza cuando termina su test.</p>
        </div>
        <div class="proxy-stats">
          <div class="proxy-stat"><span>Total</span><strong>${state.proxies.length}</strong></div>
          <div class="proxy-stat live"><span>Vivos</span><strong>${healthy}</strong></div>
          <div class="proxy-stat danger"><span>Caidos</span><strong>${testedDead}</strong></div>
          <div class="proxy-stat"><span>Media</span><strong>${avgLatency}</strong></div>
        </div>
      </div>
      <div class="proxy-toolbar">
        <div class="muted">${selectedCount ? `${selectedCount} seleccionados` : `${pending} sin test`}</div>
        <div class="flex proxy-actions">
          <button class="btn btn-ghost" data-action="health-check" ${ui.proxyTesting ? "disabled" : ""}>${ui.proxyTesting ? "testeando..." : "test real"}</button>
          <button class="btn btn-ghost btn-danger" data-action="remove-dead-proxies" ${testedDead ? "" : "disabled"}>borrar caidos</button>
          <button class="btn btn-ghost btn-danger" data-action="remove-selected-proxies" ${selectedCount ? "" : "disabled"}>borrar seleccionados</button>
          <button class="btn btn-ghost btn-danger" data-action="remove-all-proxies" ${state.proxies.length ? "" : "disabled"}>borrar todos</button>
          <button class="btn btn-ghost" data-action="toggle-proxy-bulk">bulk import</button>
          <button class="btn btn-primary" data-action="toggle-proxy-add">+ anadir proxy</button>
        </div>
      </div>
      ${ui.proxyBulk   ? renderProxyBulk() : ""}
      ${ui.proxyAdding ? renderProxyAdd()  : ""}
      <div class="proxy-table-card">
        <div class="table-head proxy-grid proxy-table-head">
          <div><input type="checkbox" data-action="toggle-all-proxies" ${allSelected ? "checked" : ""} /></div>
          <div>Endpoint</div>
          <div>Esquema</div>
          <div>Latencia</div>
          <div>Estado</div>
          <div>En uso</div>
          <div></div>
        </div>
        <div class="proxy-list">
          ${state.proxies.length
            ? state.proxies.map(renderProxyRow).join("")
            : `<div class="empty proxy-empty"><div>No hay proxies. Anade uno.</div></div>`
          }
        </div>
      </div>
    </section>
  `;
}
