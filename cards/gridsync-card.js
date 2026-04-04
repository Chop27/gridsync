/**
 * GridSync Motorsport Card v3.1
 * Requires gridsync-data.js loaded as a Lovelace resource before this file.
 */


class GridSyncCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._rendered = false;
    this._lastHash = null;
  }

  static getStubConfig() {
    return { title: "Motorsport Schedule" };
  }

  setConfig(config) {
    this._config = { title: "Motorsport Schedule", ...config };
    this._rendered = false;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    const hash = Object.entries(hass.states)
      .filter(([id]) => id.startsWith("sensor.gridsync_"))
      .map(([id, s]) => `${id}:${s.state}:${s.attributes.days_until}`)
      .join("|");
    if (hash === this._lastHash) return;
    this._lastHash = hash;
    this.render();
  }

  getCardSize() { return 4; }

  _getSensors() {
    if (!this._hass) return [];
    return Object.entries(this._hass.states)
      .filter(([id, s]) =>
        id.startsWith("sensor.gridsync_") &&
        s.attributes?.series_id &&
        s.state !== "unavailable"
      )
      .map(([entityId, state]) => ({ entityId, state }))
      .sort((a, b) => this._sortKey(a.state) - this._sortKey(b.state));
  }

  _sortKey(sensor) {
    const a = sensor.attributes;
    const now = new Date();
    const sessions = a.sessions || {};
    // Next upcoming session time
    const upcoming = Object.values(sessions)
      .map(v => new Date(typeof v === "object" && v !== null ? v.start : v))
      .filter(d => !isNaN(d) && d > now)
      .sort((a, b) => a - b);
    if (upcoming.length) return upcoming[0] - now;
    return (a.days_until ?? 999) * 86400000;
  }

  _fmtDate(str) {
    if (!str) return "";
    return new Date(str + "T00:00:00Z").toLocaleDateString(undefined, {
      month: "short", day: "numeric", timeZone: "UTC"
    });
  }

  _fmtDateRange(start, end) {
    if (!start) return "";
    if (!end || start === end) return this._fmtDate(start);
    const s = new Date(start + "T00:00:00Z");
    const e = new Date(end + "T00:00:00Z");
    if (s.getUTCMonth() === e.getUTCMonth())
      return `${s.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })} ${s.getUTCDate()}–${e.getUTCDate()}`;
    return `${this._fmtDate(start)} – ${this._fmtDate(end)}`;
  }

  _fmtSession(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  _daysLabel(days) {
    if (days === undefined || days === null || days < 0) return null;
    if (days === 0) return { text: "LIVE", live: true };
    if (days === 1) return { text: "TOMORROW", live: false };
    return { text: `${days}D`, live: false };
  }

  _renderCard(sensor) {
    const a = sensor.state.attributes;
    const sid = a.series_id || "";
    const meta = (window.GRIDSYNC_SERIES_META || {})[sid] || { label: sid.toUpperCase(), color: "#666", accent: "#888" };
    const badge = this._daysLabel(a.days_until);
    const dateRange = this._fmtDateRange(a.start_date, a.end_date);
    const now = new Date();

    // All sessions — past ones faded, future ones normal
    const sessions = Object.entries(a.sessions || {})
      .map(([k, v]) => {
        const start = typeof v === "object" && v !== null ? v.start : v;
        const dt = new Date(start);
        return { label: (window.GRIDSYNC_SESSION_LABELS || {})[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), dt, past: dt < now };
      })
      .filter(s => !isNaN(s.dt))
      .sort((a, b) => a.dt - b.dt);

    const sessionsHTML = sessions.length ? `
      <div class="sessions">
        ${sessions.map(s => `
          <div class="session ${s.past ? "past" : ""}">
            <span class="s-label">${s.label}</span>
            <span class="s-time">${this._fmtSession(s.dt.toISOString())}</span>
          </div>`).join("")}
      </div>` : "";

    return `
      <div class="race-card ${badge?.live ? "is-live" : ""}" style="--c:${meta.color};--a:${meta.accent}">
        <div class="card-glow"></div>
        <div class="top-row">
          <div class="series-pill">${meta.label}</div>
          ${badge ? `<div class="days-pill ${badge.live ? "days-live" : ""}">${badge.text}</div>` : ""}
        </div>
        <div class="event-name">${a.event_name || ""}</div>
        <div class="track-row">
          <span class="flag">${a.flag || ""}</span>
          <span class="track">${a.track_name || ""}</span>
        </div>
        <div class="date-row">${dateRange}</div>
        ${sessionsHTML}
        ${badge?.live ? '<div class="live-bar"><span class="live-dot"></span>LIVE NOW</div>' : ""}
      </div>`;
  }

  render() {
    if (!this._hass) return;
    const sensors = this._getSensors();

    const cardsHTML = sensors.length
      ? sensors.map(s => this._renderCard(s)).join("")
      : `<div class="empty"><div class="empty-icon">🏁</div><div>No GridSync sensors found</div></div>`;

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500&display=swap');

        :host { display: block; font-family: 'Barlow', sans-serif; }

        ha-card {
          background: var(--ha-card-background, #111318);
          border-radius: var(--ha-card-border-radius, 16px);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .card-title {
          padding: 16px 18px 10px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .list { padding: 8px; display: flex; flex-direction: column; gap: 6px; }

        .race-card {
          position: relative;
          border-radius: 10px;
          padding: 12px 14px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-left: 3px solid var(--c);
          overflow: hidden;
        }

        .race-card.is-live {
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 24px rgba(255,255,255,0.08);
        }

        .card-glow {
          position: absolute; top: 0; left: 0;
          width: 150px; height: 150px;
          background: radial-gradient(circle at 0% 0%, var(--c), transparent 70%);
          opacity: 0.07; pointer-events: none;
        }

        .top-row {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 8px;
        }

        .series-pill {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--c);
          background: rgba(255,255,255,0.08);
          padding: 2px 8px; border-radius: 4px;
        }

        .days-pill {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.07);
          padding: 2px 8px; border-radius: 4px;
        }

        .days-live {
          color: var(--c);
          background: rgba(255,255,255,0.08);
          animation: pulse-badge 1.5s ease-in-out infinite;
        }

        @keyframes pulse-badge {
          0%, 100% { opacity: 1; } 50% { opacity: 0.55; }
        }

        .event-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 19px; font-weight: 700;
          color: rgba(255,255,255,0.92);
          line-height: 1.2; margin-bottom: 5px;
        }

        .track-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
        .flag { font-size: 13px; }
        .track { font-size: 12px; color: rgba(255,255,255,0.4); }

        .date-row {
          font-size: 12px; font-weight: 500;
          color: rgba(255,255,255,0.55); margin-bottom: 2px;
        }

        .sessions {
          margin-top: 10px; padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;
        }

        .session { display: flex; flex-direction: column; gap: 2px; }
        .session.past { opacity: 0.3; }

        .s-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--a); opacity: 0.9;
        }

        .s-time { font-size: 11px; color: rgba(255,255,255,0.55); }

        .live-bar {
          margin-top: 10px;
          display: flex; align-items: center; gap: 7px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
          color: var(--c);
        }

        .live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--c);
          animation: blink 1s ease-in-out infinite; flex-shrink: 0;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(0.6); }
        }

        .empty {
          padding: 32px; text-align: center;
          color: rgba(255,255,255,0.3); font-size: 13px;
        }
        .empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.4; }
      </style>

      <ha-card>
        ${this._config.title ? `<div class="card-title">🏁 ${this._config.title}</div>` : ""}
        <div class="list">${cardsHTML}</div>
      </ha-card>`;
  }
}

if (!customElements.get("gridsync-card")) {
  customElements.define("gridsync-card", GridSyncCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "gridsync-card",
    name: "GridSync Motorsport Card",
    description: "Upcoming motorsport events from GridSync.",
  });
  console.info("%c GRIDSYNC %c v3.1 ",
    "background:#E10600;color:#fff;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px",
    "background:#111318;color:#aaa;padding:2px 6px;border-radius:0 4px 4px 0");
}
