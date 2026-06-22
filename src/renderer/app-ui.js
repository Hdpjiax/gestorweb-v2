function ensureUiStyles() {
  if (document.getElementById("app-ui-css")) return;
  const link = document.createElement("link");
  link.id = "app-ui-css";
  link.rel = "stylesheet";
  link.href = "src/renderer/app-ui.css";
  document.head.appendChild(link);
}

function toastHost() {
  ensureUiStyles();
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  return host;
}

export function toast(message, type = "info", options = {}) {
  const host = toastHost();
  const item = document.createElement("div");
  item.className = `app-toast ${type}`;
  const icon = document.createElement("span");
  icon.className = "app-toast-icon";
  icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : type === "warning" ? "⚠" : "i";
  const body = document.createElement("div");
  body.className = "app-toast-body";
  const title = document.createElement("strong");
  title.textContent = options.title || (type === "success" ? "Listo" : type === "error" ? "Error" : type === "warning" ? "Atención" : "Aviso");
  const text = document.createElement("span");
  text.textContent = message;
  body.append(title, text);
  item.append(icon, body);
  host.appendChild(item);
  const ttl = options.duration || (type === "error" ? 5200 : 3400);
  window.setTimeout(() => {
    item.classList.add("leaving");
    window.setTimeout(() => item.remove(), 220);
  }, ttl);
}

export function offlineMessage(error) {
  const text = String(error?.message || error || "").toLowerCase();
  if (!text) return "No se pudo conectar con Supabase.";
  if (text.includes("fetch") || text.includes("network") || text.includes("aborted") || text.includes("timeout")) {
    return "No hay conexión con Supabase. Revisa internet, la URL del proyecto o la service key.";
  }
  if (text.includes("jwt") || text.includes("apikey") || text.includes("permission") || text.includes("401") || text.includes("403")) {
    return "Supabase rechazó las credenciales admin. Revisa anon key y service role key.";
  }
  return error?.message || String(error) || "No se pudo completar la operación.";
}

export function skeletonRows(count = 5) {
  return Array.from({ length: count }).map(() => `
    <div class="admin-license-row skeleton-row">
      <div><span class="skeleton-line w-70"></span><span class="skeleton-line w-45"></span><span class="skeleton-line w-90"></span></div>
      <span class="skeleton-pill"></span>
      <span class="skeleton-line w-80"></span>
      <span class="skeleton-pill"></span>
      <span class="skeleton-line w-60"></span>
      <div class="flex right"><span class="skeleton-button"></span><span class="skeleton-button"></span><span class="skeleton-button"></span></div>
    </div>
  `).join("");
}

export function softLoading(label = "Cargando...") {
  return `<span class="soft-loading"><span></span><span></span><span></span>${label}</span>`;
}
