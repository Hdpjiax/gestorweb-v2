import { ui, native, rerender } from "./state.js";

function formText(data, name) {
  return String(data.get(name) || "").trim();
}

async function handleAdminLogin(event) {
  const form = event.target.closest?.("#adminLoginForm");
  if (!form) return false;
  event.preventDefault();
  event.stopImmediatePropagation();

  const data = new FormData(form);
  ui.adminError = "";
  try {
    const result = await native?.admin?.login?.({
      supabaseUrl: formText(data, "supabaseUrl"),
      anonKey: formText(data, "anonKey"),
      serviceRoleKey: formText(data, "serviceRoleKey"),
      privateKeyPem: String(data.get("privateKeyPem") || "").trim()
    });
    ui.adminAuthenticated = !!result?.ok;
    ui.adminServerUrl = result?.supabaseUrl || result?.serverUrl || formText(data, "supabaseUrl");
    ui.adminLicenses = result?.licenses || [];
    ui.adminGeneratedKey = "";
  } catch (error) {
    ui.adminAuthenticated = false;
    ui.adminError = error?.message || "no se pudo iniciar sesion admin";
  }
  rerender();
  return true;
}

export function initAdminLicenseActions() {
  document.addEventListener("submit", (event) => {
    handleAdminLogin(event);
  }, true);
}
