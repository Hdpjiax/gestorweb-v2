import { uid, esc, attr, clone } from "./helpers.js";
import { state, ui, save, liveSet } from "./state.js";
import { ICONS } from "./icons.js";

export { shortId, uid, esc, attr, clone } from "./helpers.js";

export function logEvent(kind, profileId, payload = "") {
  state.events.unshift({ id: uid("evt"), kind, profile_id: profileId || null, payload, ts: Date.now() });
  state.events = state.events.slice(0, 250);
}

export function profileById(id) {
  return state.profiles.find((p) => p.id === id) || null;
}

export function proxyById(id) {
  return state.proxies.find((p) => p.id === id) || null;
}

export function filteredProfiles() {
  const q = state.filters.search.trim().toLowerCase();
  const live = liveSet();
  return state.profiles.filter((p) => {
    const haystack = `${p.name} ${p.group_tag || ""} ${p.url || ""}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (state.filters.group && p.group_tag !== state.filters.group) return false;
    if (state.filters.proxyState === "with" && !p.proxy_id && !p.tor_mode) return false;
    if (state.filters.proxyState === "without" && (p.proxy_id || p.tor_mode)) return false;
    if (state.view === "live" && !live.has(p.id)) return false;
    return true;
  });
}

export function normalizeUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "nueva pestana";
  }
}

export function firefoxUserAgent() {
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0";
}

export function radioSegments(name, values, selected, cols) {
  return `<div class="segmented cols-${cols}">${values.map((value) => `<label><input type="radio" name="${name}" value="${attr(value)}" ${value === selected ? "checked" : ""} /><span class="segment">${esc(value)}</span></label>`).join("")}</div>`;
}

export function bindInput(id, fn) {
  const el = document.getElementById(id);
  if (el) el.onchange = () => fn(el);
}

export function updateBrowserTab(tabId, patch) {
  const tab = state.browserTabs.find((item) => item.id === tabId);
  if (!tab) return;
  Object.assign(tab, patch);
  if (tab.id === state.activeTabId && patch.url) ui.browserUrl = patch.url;
  save();
  const input = document.getElementById("browserUrl");
  if (input && tab.id === state.activeTabId && patch.url) input.value = patch.url;
}

export function statCard(label, value, sub) {
  return `<div class="metric"><div class="label">${label}</div><div style="font-size:28px;font-weight:700">${value}</div><div class="small-note">${sub}</div></div>`;
}

export function lastSevenDays() {
  const buckets = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const n = state.events.filter((e) => new Date(e.ts).toISOString().slice(0, 10) === key).length;
    buckets.push({ label: key.slice(5), n });
  }
  const max = Math.max(1, ...buckets.map((b) => b.n));
  return buckets.map((b) => ({ ...b, pct: Math.max(4, (b.n / max) * 100) }));
}

export function topProfilesHtml() {
  const counts = {};
  state.events.forEach((e) => { if (e.kind === "opened" && e.profile_id) counts[e.profile_id] = (counts[e.profile_id] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) return `<div class="small-note">sin datos</div>`;
  const max = Math.max(...top.map(([, n]) => n));
  return `<div class="stack-sm">${top.map(([id, n]) => `<div class="between"><span>${esc(profileById(id)?.name || "-")}</span><div class="progress" style="flex:1"><span style="width:${(n / max) * 100}%"></span></div><span class="mono dim">${n}</span></div>`).join("")}</div>`;
}

export function pLabel(id) {
  return profileById(id)?.name || id;
}

export function activeWebview() {
  return document.querySelector(`webview[data-tab-id="${CSS.escape(state.activeTabId || "")}"]`);
}
