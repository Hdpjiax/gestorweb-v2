// Sesiones que el usuario abrió explícitamente con un proxy asignado.
// Solo estas sesiones pueden aceptar certificados sustituidos por el proxy.
const proxyTrustedSessions = new WeakSet();

module.exports = proxyTrustedSessions;
