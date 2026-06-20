import { state } from "../state.js";
import { lastSevenDays, statCard, topProfilesHtml } from "../utils.js";

function averageLatency() {
  const latencies = state.proxies.filter((proxy) => proxy.latency_ms != null).map((proxy) => proxy.latency_ms);
  return latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : 0;
}

export function renderStatsView() {
  const opens = state.events.filter((event) => event.kind === "opened").length;
  const closes = state.events.filter((event) => event.kind === "closed").length;
  const groups = new Set(state.profiles.map((profile) => profile.group_tag).filter(Boolean)).size;
  const healthy = state.proxies.filter((proxy) => proxy.healthy).length;
  const days = lastSevenDays();
  const mean = averageLatency();

  return `
    <section class="section stack">
      <div class="stat-grid">
        ${statCard("Perfiles", state.profiles.length, `${state.liveIds.length} en vivo`)}
        ${statCard("Grupos", groups, "distintos")}
        ${statCard("Proxies OK", `${healthy}/${state.proxies.length}`, `${mean}ms media`)}
        ${statCard("Aperturas", opens, `${closes} cierres`)}
      </div>
      <div class="metric">
        <h3>Actividad ultimos 7 dias</h3>
        <div class="bars">
          ${days.map((day) => `<div class="bar-col"><div class="bar" style="height:${day.pct}%"></div><div>${day.label}</div><div>${day.n}</div></div>`).join("")}
        </div>
      </div>
      <div class="metric"><h3>Top 5 mas usados</h3>${topProfilesHtml()}</div>
    </section>
  `;
}
