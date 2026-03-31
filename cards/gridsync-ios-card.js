/**
 * GridSync iOS26 Card v2.0
 * Apple-style liquid glass widget for motorsport events
 */

const IOS_SERIES_META = {
  f1:      { label: "F1",      color: "#E10600", bg: "rgba(225,6,0,0.18)"      },
  f2:      { label: "F2",      color: "#004267", bg: "rgba(0,66,103,0.25)"     },
  f3:      { label: "F3",      color: "#676767", bg: "rgba(103,103,103,0.2)"   },
  wec:     { label: "WEC",     color: "#00B9FF", bg: "rgba(0,185,255,0.18)"    },
  indycar: { label: "IndyCar", color: "#0072BC", bg: "rgba(0,114,188,0.18)"    },
  nascar:  { label: "NASCAR",  color: "#FFD700", bg: "rgba(255,215,0,0.18)"    },
  imsa:    { label: "IMSA",    color: "#E51B24", bg: "rgba(229,27,36,0.18)"    },
  wrc:     { label: "WRC",     color: "#E0E0E0", bg: "rgba(255,255,255,0.12)"  },
  nls:     { label: "NLS",     color: "#067748", bg: "rgba(6,119,72,0.2)"      },
  supercars: { label: "Supercars", color: "#EE3123", bg: "rgba(238,49,35,0.18)"   },
  btcc:      { label: "BTCC",      color: "#020255", bg: "rgba(2,2,85,0.35)"       },
  gtwce:     { label: "GTWCE",     color: "#E31E12", bg: "rgba(227,30,18,0.18)"    },
  elms:      { label: "ELMS",      color: "#FF5F00", bg: "rgba(255,95,0,0.18)"     },
};

const IOS_SESSION_LABELS = {
  practice1: "Practice 1", practice2: "Practice 2", practice3: "Practice 3",
  practice: "Practice", sprint_qualifying: "Sprint Qualifying", sprint: "Sprint",
  qualifying: "Qualifying", qualifying_day1: "Qualifying Day 1", qualifying_day2: "Qualifying Day 2",
  sprint_race: "Sprint Race", feature_race: "Feature Race",
  hyperpole: "Hyperpole", carb_day: "Carb Day",
  duel1: "Duel 1", duel2: "Duel 2",
  race: "Race", race1: "Race 1", race2: "Race 2",
  warmup: "Warm Up",
  shakedown: "Shakedown", day1: "Day 1", day2: "Day 2", day3: "Day 3",
  qualifying1: "Qualifying 1", qualifying2: "Qualifying 2",
  race3: "Race 3",
};

class GridSyncIosCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._currentIndex = 0;
    this._sensors = [];
    this._lastHash = null;
    this._rendered = false;
  }

  static getStubConfig() {
    return { title: "Race Calendar" };
  }

  setConfig(config) {
    this._config = { title: "Race Calendar", ...config };
    this._rendered = false;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const hash = Object.entries(hass.states)
      .filter(([id]) => id.startsWith("sensor.gridsync_"))
      .map(([id, s]) => `${id}:${s.state}:${s.attributes.days_until}`)
      .join("|");
    if (hash === this._lastHash) return;
    this._lastHash = hash;
    this._sensors = this._getSensors();
    this._render();
  }

  getCardSize() { return 6; }

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
    const upcoming = Object.values(a.sessions || {})
      .map(v => new Date(v)).filter(d => d > now).sort((a, b) => a - b);
    if (upcoming.length) return upcoming[0] - now;
    return (a.days_until ?? 999) * 86400000;
  }

  _fmtDateRange(start, end) {
    if (!start) return "";
    const s = new Date(start + "T00:00:00Z");
    const e = end ? new Date(end + "T00:00:00Z") : null;
    const mo = d => d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
    const dy = d => d.getUTCDate();
    if (!e || start === end) return `${mo(s)} ${dy(s)}`;
    if (s.getUTCMonth() === e.getUTCMonth()) return `${mo(s)} ${dy(s)}–${dy(e)}`;
    return `${mo(s)} ${dy(s)} – ${mo(e)} ${dy(e)}`;
  }

  _fmtSessionTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  _daysText(days) {
    if (days === undefined || days === null) return "";
    if (days < 0) return "Season complete";
    if (days === 0) return "This weekend";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  }

  _renderSlide(sensor) {
    const a = sensor.state.attributes;
    const sid = a.series_id || "";
    const meta = IOS_SERIES_META[sid] || { label: sid.toUpperCase(), color: "#FFF", bg: "rgba(255,255,255,0.12)" };
    const days = a.days_until;
    const isLive = days === 0;
    const dateRange = this._fmtDateRange(a.start_date, a.end_date);
    const now = new Date();

    // All sessions — past faded
    const sessions = Object.entries(a.sessions || {})
      .map(([k, v]) => ({
        label: IOS_SESSION_LABELS[k] || k,
        dt: new Date(v),
        past: new Date(v) < now
      }))
      .sort((a, b) => a.dt - b.dt);

    const sessionsHTML = sessions.map(s => `
      <div class="session-row ${s.past ? "past" : ""}">
        <span class="session-label">${s.label}</span>
        <span class="session-time">${this._fmtSessionTime(s.dt.toISOString())}</span>
      </div>`).join("");

    return `
      <div class="slide" style="--sc:${meta.color};--sb:${meta.bg}">
        <div class="top-section">
          <div class="series-chip">
            <span class="series-dot ${isLive ? "live-dot" : ""}"></span>
            <span class="series-name">${meta.label}</span>
          </div>
          <div class="days-badge ${isLive ? "live" : ""}">${isLive ? "● LIVE" : this._daysText(days)}</div>
        </div>
        <div class="event-name">${a.event_name || ""}</div>
        <div class="event-meta">
          <span class="flag">${a.flag || ""}</span>
          <span class="location">${a.location || ""}</span>
        </div>
        <div class="date-pill">${dateRange}</div>
        ${sessions.length ? `
        <div class="sessions-block">
          <div class="sessions-title">Schedule</div>
          ${sessionsHTML}
        </div>` : ""}
      </div>`;
  }

  _showCurrent() {
    const slides = this.shadowRoot.querySelectorAll(".slide");
    const dots = this.shadowRoot.querySelectorAll(".dot");
    slides.forEach((s, i) => {
      const active = i === this._currentIndex;
      s.style.opacity = active ? "1" : "0";
      s.style.transform = active ? "translateX(0)" : i < this._currentIndex ? "translateX(-24px)" : "translateX(24px)";
      s.style.pointerEvents = active ? "auto" : "none";
      s.style.position = active ? "relative" : "absolute";
      s.style.top = "0"; s.style.left = "0"; s.style.width = "100%";
    });
    dots.forEach((d, i) => d.classList.toggle("active", i === this._currentIndex));
  }

  _render() {
    if (!this._hass) return;
    const sensors = this._sensors.length ? this._sensors : this._getSensors();

    if (!sensors.length) {
      this.shadowRoot.innerHTML = `
        <style>:host{display:block;}ha-card{background:transparent!important;box-shadow:none!important;border:none!important;}</style>
        <ha-card><div style="padding:32px;text-align:center;color:rgba(255,255,255,0.4);font-family:system-ui">No GridSync sensors</div></ha-card>`;
      return;
    }

    const slidesHTML = sensors.map(s => this._renderSlide(s)).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        ha-card {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          overflow: visible;
        }

        .widget {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          height: 435px;
          background: linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.25);
          box-shadow:
            0 32px 64px rgba(0,0,0,0.4),
            0 8px 24px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.4),
            inset 0 -1px 0 rgba(255,255,255,0.1);
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          display: flex;
          flex-direction: column;
        }

        .glass-shine {
          position: absolute; top: 0; left: 0; right: 0; height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%);
          border-radius: 28px 28px 0 0;
          pointer-events: none;
        }

        .widget-header {
          padding: 18px 20px 0;
          flex-shrink: 0;
        }

        .widget-title {
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.04em; text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }

        .slides-container {
          position: relative;
          flex: 1;
          overflow-y: auto;
          padding: 12px 20px 0;
          scrollbar-width: none;
        }
        .slides-container::-webkit-scrollbar { display: none; }

        .slide {
          transition: opacity 0.35s cubic-bezier(0.4,0,0.2,1),
                      transform 0.35s cubic-bezier(0.4,0,0.2,1);
        }

        .top-section {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 12px;
        }

        .series-chip {
          display: flex; align-items: center; gap: 7px;
          background: var(--sb);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 999px; padding: 4px 12px 4px 8px;
        }

        .series-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--sc); flex-shrink: 0;
        }

        .series-dot.live-dot { animation: live-pulse 1s ease-in-out infinite; }

        .series-name {
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.08em; color: var(--sc);
        }

        .days-badge {
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.55);
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 4px 10px; border-radius: 999px;
        }

        .days-badge.live {
          color: #FF3B30;
          background: rgba(255,59,48,0.15);
          border-color: rgba(255,59,48,0.3);
        }

        .event-name {
          font-size: 20px; font-weight: 700;
          color: rgba(255,255,255,0.95);
          line-height: 1.2; margin-bottom: 6px;
          letter-spacing: -0.3px;
        }

        .event-meta {
          display: flex; align-items: center;
          gap: 6px; margin-bottom: 8px;
        }

        .flag { font-size: 14px; }

        .location {
          font-size: 12px; color: rgba(255,255,255,0.5);
        }

        .date-pill {
          display: inline-flex; align-items: center;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 999px; padding: 3px 10px;
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.8);
          margin-bottom: 12px;
        }

        .sessions-block {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 10px 12px;
        }

        .sessions-title {
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); margin-bottom: 8px;
        }

        .session-row {
          display: flex; justify-content: space-between;
          align-items: center; padding: 4px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .session-row:last-child { border-bottom: none; }
        .session-row.past { opacity: 0.3; }

        .session-label {
          font-size: 11px; font-weight: 600;
          color: var(--sc); opacity: 0.9;
        }

        .session-time {
          font-size: 11px; color: rgba(255,255,255,0.5);
        }

        .nav-section {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 10px 20px 16px;
          flex-shrink: 0;
        }

        .dots { display: flex; gap: 6px; align-items: center; }

        .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,255,255,0.25);
          cursor: pointer; transition: all 0.25s ease;
        }

        .dot.active {
          width: 18px; border-radius: 3px;
          background: rgba(255,255,255,0.8);
        }

        .nav-arrows { display: flex; gap: 8px; }

        .nav-btn {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
          font-size: 14px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }

        .nav-btn:active { background: rgba(255,255,255,0.2); transform: scale(0.92); }

        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      </style>

      <ha-card>
        <div class="widget">
          <div class="glass-shine"></div>
          <div class="widget-header">
            <span class="widget-title">${this._config.title || "Race Calendar"}</span>
          </div>
          <div class="slides-container">${slidesHTML}</div>
          <div class="nav-section">
            <div class="dots"></div>
            <div class="nav-arrows">
              <button class="nav-btn" id="prev">‹</button>
              <button class="nav-btn" id="next">›</button>
            </div>
          </div>
        </div>
      </ha-card>`;

    if (this._currentIndex >= sensors.length) this._currentIndex = 0;

    // Setup dots
    const dotsEl = this.shadowRoot.querySelector(".dots");
    dotsEl.innerHTML = Array.from({ length: sensors.length }, (_, i) =>
      `<div class="dot ${i === this._currentIndex ? "active" : ""}" data-index="${i}"></div>`
    ).join("");
    dotsEl.querySelectorAll(".dot").forEach(d => {
      d.addEventListener("click", () => {
        this._currentIndex = parseInt(d.dataset.index);
        this._showCurrent();
      });
    });

    this._showCurrent();

    this.shadowRoot.querySelector("#prev").addEventListener("click", () => {
      this._currentIndex = (this._currentIndex - 1 + sensors.length) % sensors.length;
      this._showCurrent();
    });
    this.shadowRoot.querySelector("#next").addEventListener("click", () => {
      this._currentIndex = (this._currentIndex + 1) % sensors.length;
      this._showCurrent();
    });
  }
}

customElements.define("gridsync-ios-card", GridSyncIosCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "gridsync-ios-card",
  name: "GridSync iOS26 Card",
  description: "Apple-style liquid glass motorsport widget.",
});
console.info("%c GRIDSYNC iOS %c v2.0 ",
  "background:#0072BC;color:#fff;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px",
  "background:#1c1c1e;color:#aaa;padding:2px 6px;border-radius:0 4px 4px 0");
