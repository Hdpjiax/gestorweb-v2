export function shortId(size = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const cryptoObj = window.crypto || null;
  for (let i = 0; i < size; i++) {
    const n = cryptoObj ? cryptoObj.getRandomValues(new Uint8Array(1))[0] : Math.floor(Math.random() * 255);
    out += chars[n % chars.length];
  }
  return out;
}

export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${shortId(5).toLowerCase()}`;
}

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', '"');
}

export function attr(value) {
  return esc(value).replaceAll("'", "&#39;");
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
