/**
 * GridSync List Card v9.0
 */

const LIST_SERIES_META = {
  f1:      { color: "#E10600" },
  f2:      { color: "#004267" },
  f3:      { color: "#676767" },
  wec:     { color: "#00B9FF" },
  indycar: { color: "#0072BC" },
  nascar:  { color: "#FFD700" },
  imsa:    { color: "#E51B24" },
  wrc:     { color: "#E0E0E0" },
  nls:     { color: "#067748" },
  supercars: { color: "#EE3123" },
  btcc:      { color: "#020255" },
  gtwce:     { color: "#E31E12" },
  elms:      { color: "#FF5F00" },
};

const SESSION_LABELS = {
  practice1: "Practice 1", practice2: "Practice 2", practice3: "Practice 3",
  practice: "Practice", sprint_qualifying: "Sprint Qualifying", sprint: "Sprint",
  qualifying: "Qualifying", qualifying_day1: "Qualifying Day 1", qualifying_day2: "Qualifying Day 2",
  sprint_race: "Sprint Race", feature_race: "Feature Race",
  hyperpole: "Hyperpole", carb_day: "Carb Day",
  duel1: "Duel 1", duel2: "Duel 2", race: "Race", race1: "Race 1", race2: "Race 2",
  shakedown: "Shakedown", day1: "Day 1", day2: "Day 2", day3: "Day 3",
  qualifying1: "Qualifying 1", qualifying2: "Qualifying 2",
  race3: "Race 3",
};

class GridSyncListCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._rendered = false;
    this._lastHash = null;
    this._sensors = [];
    this._timerInterval = null;
    this._lastSessionHash = null;
  }

  static getStubConfig() { return {}; }
  setConfig(config) { this._config = config; this.style.borderRadius = '0'; this.style.minHeight = '380px'; }
  getCardSize() { return 4; }

  connectedCallback() {
    this._startTimer();
  }

  disconnectedCallback() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = null;
  }

  _startTimer() {
    if (this._timerInterval) return;
    this._timerInterval = setInterval(() => this._updateCountdowns(), 10000);
  }

  set hass(hass) {
    this._hass = hass;
    this._startTimer();
    const hash = this._dataHash();
    if (hash === this._lastHash) return;
    this._lastHash = hash;
    this._sensors = this._getSensors();
    this._render();
  }

  _dataHash() {
    if (!this._hass) return "";
    return Object.entries(this._hass.states)
      .filter(([id]) => id.startsWith("sensor.gridsync_"))
      .map(([id, s]) => `${id}:${s.state}:${s.attributes.days_until}`)
      .join("|");
  }

  _getSensors() {
    if (!this._hass) return [];
    return Object.entries(this._hass.states)
      .filter(([id, s]) =>
        id.startsWith("sensor.gridsync_") &&
        s.attributes?.series_id &&
        s.state !== "unavailable"
      )
      .map(([, state]) => state)
      .sort((a, b) => this._sortKey(a) - this._sortKey(b));
  }

  _sortKey(sensor) {
    const a = sensor.attributes;
    const now = new Date();
    const sessions = a.sessions || {};

    // If in a live session — sort to top (0)
    const live = this._getLiveSession(sessions);
    if (live) return 0;

    // Next upcoming session time
    const next = this._getNextSession(sessions);
    if (next) return next.dt - now;

    // Fall back to days_until in ms
    const days = a.days_until ?? 999;
    return days * 86400000;
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

  _fmtLocalTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  _fmtCountdown(ms) {
    if (ms <= 0) return "";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  _isWeekend(start, end) {
    if (!start) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const s = new Date(start + "T00:00:00Z");
    const e = end ? new Date(end + "T00:00:00Z") : s;
    const startDay = new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    const endDay = new Date(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
    return today >= startDay && today <= endDay;
  }

  _getLiveSession(sessions) {
    const now = new Date();
    const sorted = Object.entries(sessions || {})
      .map(([k, v]) => ({ key: k, label: SESSION_LABELS[k] || k, dt: new Date(v) }))
      .sort((a, b) => a.dt - b.dt);

    // Durations per session type (minutes)
    // Practice & qualifying: always 90 min hard limit
    // Races: long window, coordinator complete_today handles the rest
    const durations = {
      // Practice — 90 min hard cutoff
      practice1: 90, practice2: 90, practice3: 90, practice: 90,
      // Qualifying — 90 min hard cutoff
      qualifying: 90, sprint_qualifying: 90,
      qualifying_day1: 90, qualifying_day2: 90,
      hyperpole: 90,
      // Sprint/feature races
      sprint: 90, sprint_race: 90, feature_race: 90,
      // Main races — 3h then complete_today takes over
      race: 180, race1: 300, race2: 300,
      // WRC
      shakedown: 90, day1: 600, day2: 600, day3: 600,
      // NASCAR / IndyCar misc
      duel1: 90, duel2: 90, carb_day: 120,
      // Carb day / warmup
      warmup: 30,
    };

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const next = sorted[i + 1];
      const durationMins = durations[s.key] || 60;
      const durationEnd = new Date(s.dt.getTime() + durationMins * 60 * 1000);
      // Use the earlier of: duration end OR next session start
      const end = next ? new Date(Math.min(next.dt, durationEnd)) : durationEnd;
      if (now >= s.dt && now < end) return s;
    }
    return null;
  }

  _getNextSession(sessions) {
    const now = new Date();
    return Object.entries(sessions || {})
      .map(([k, v]) => ({ label: SESSION_LABELS[k] || k, dt: new Date(v) }))
      .filter(s => s.dt > now)
      .sort((a, b) => a.dt - b.dt)[0] || null;
  }

  _allSessionsDone(sessions) {
    // Only complete if no session is currently live
    if (this._getLiveSession(sessions)) return false;
    const now = new Date();
    return Object.values(sessions || {}).every(v => new Date(v) < now);
  }

  _dayRelative(dt) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return null;
  }

  _listRowStatus(a) {
    const sessions = a.sessions || {};
    const inWeekend = this._isWeekend(a.start_date, a.end_date);

    if (inWeekend) {
      // Check live FIRST — takes priority over complete
      const live = this._getLiveSession(sessions);
      if (live) {
        return {
          topRight: `<span style="color:#FF3B30">LIVE</span>`,
          bottomRight: `<span style="color:#FF3B30">${live.label}</span>`
        };
      }
      // Only show Complete when no live session and all sessions done
      if (this._allSessionsDone(sessions)) {
        return { topRight: `<span>Complete</span>`, bottomRight: "" };
      }
      const next = this._getNextSession(sessions);
      if (next) {
        const now = new Date();
        const ms = next.dt - now;
        const rel = this._dayRelative(next.dt);
        // Between sessions same day: show countdown
        const topText = rel === "Today"
          ? `<span class="countdown" data-target="${next.dt.toISOString()}">${this._fmtCountdown(ms)}</span>`
          : `<span>${rel || ""}</span>`;
        return {
          topRight: topText,
          bottomRight: `<span style="color:rgba(255,255,255,0.4)">${next.label}</span>`
        };
      }
    }

    const days = a.days_until;
    if (days === undefined || days === null) return { topRight: "", bottomRight: "" };
    if (days === 0) return { topRight: `<span style="color:#FF3B30">LIVE</span>`, bottomRight: "" };
    if (days === 1) return { topRight: `<span>Tomorrow</span>`, bottomRight: "" };
    if (days > 0) return { topRight: `<span>${days}d</span>`, bottomRight: "" };
    return { topRight: "", bottomRight: "" };
  }

  _sessionStateHash() {
    // Build a hash of current live/next session state across all sensors
    return this._sensors.map(s => {
      const a = s.attributes;
      if (!this._isWeekend(a.start_date, a.end_date)) return "none";
      const live = this._getLiveSession(a.sessions || {});
      const next = this._getNextSession(a.sessions || {});
      return `${a.series_id}:${live ? live.label : "none"}:${next ? next.label : "none"}`;
    }).join("|");
  }

  _updateCountdowns() {
    const now = new Date();
    // Update countdown text
    this.shadowRoot.querySelectorAll(".countdown").forEach(el => {
      const target = new Date(el.dataset.target);
      const ms = target - now;
      el.textContent = ms > 0 ? this._fmtCountdown(ms) : "Now";
    });
    // Re-render only if live/next session state changed since last render
    const currentHash = this._sessionStateHash();
    if (currentHash !== this._lastSessionHash) {
      this._lastSessionHash = currentHash;
      this._render();
    }
  }

  _openDetail(sensor) {
    // Hide outer scroll while detail is open
    const haCard = this.shadowRoot.querySelector("ha-card");
    if (haCard) { haCard.style.overflowY = "hidden"; haCard.style.overflowX = "hidden"; }
    const a = sensor.attributes;
    const sid = a.series_id || "";
    const color = (LIST_SERIES_META[sid] || {}).color || "#888";
    const initials = (a.series_short || sid).substring(0, 3).toUpperCase();
    const now = new Date();
    const dateRange = this._fmtDateRange(a.start_date, a.end_date);
    const liveSession = this._getLiveSession(a.sessions || {});
    const allDone = this._allSessionsDone(a.sessions || {});
    const inWeekend = this._isWeekend(a.start_date, a.end_date);

    const liveBarHTML = liveSession ? `
      <div class="live-bar">LIVE NOW &nbsp;•&nbsp; ${liveSession.label}</div>` : "";

    const sessions = Object.entries(a.sessions || {})
      .map(([k, v]) => ({
        label: SESSION_LABELS[k] || k.replace(/_/g, " "),
        dt: new Date(v),
        past: new Date(v) < now
      }))
      .sort((a, b) => a.dt - b.dt);

    const sessionsHTML = sessions.map(s => {
      const isSessionLive = liveSession && liveSession.label === s.label;
      const dotColor = isSessionLive ? "#30D158" : s.past ? "rgba(255,255,255,0.2)" : "#FF3B30";
      let timeHTML;
      if (isSessionLive) {
        timeHTML = `<span class="session-live-right"><span class="session-live-badge">LIVE</span><span class="live-dot-indicator"></span></span>`;
      } else if (s.past) {
        timeHTML = `<span class="session-complete">Complete</span>`;
      } else {
        timeHTML = `<span class="session-time">${this._fmtLocalTime(s.dt.toISOString())}</span>`;
      }
      return `
        <div class="session-row">
          <div class="session-left">
            <div class="session-dot" style="background:${dotColor}"></div>
            <span class="session-name ${s.past && !isSessionLive ? "past-text" : ""}">${s.label}</span>
          </div>
          ${timeHTML}
        </div>`;
    }).join("");

    const detailContent = this.shadowRoot.querySelector(".detail-content");
    detailContent.innerHTML = `
      <div class="detail-header">
        <span class="back-chevron">‹</span>
        <div class="detail-badge" style="background:${color}22;border-color:${color}44;color:${color}">${initials}</div>
        <div class="detail-header-text">
          <div class="detail-event">${a.event_name || ""}</div>
          <div class="detail-sub">${a.track_name || ""} &nbsp;•&nbsp; ${dateRange}</div>
        </div>
      </div>
      ${liveBarHTML}
      <div class="sessions-block">
        <div class="sessions-header">Schedule</div>
        ${sessionsHTML}
      </div>`;

    detailContent.querySelector(".back-chevron").addEventListener("click", () => this._closeDetail());
    this.shadowRoot.querySelector(".detail-panel").classList.add("open");
  }

  _closeDetail() {
    this.shadowRoot.querySelector(".detail-panel").classList.remove("open");
    // Restore outer scroll
    const haCard = this.shadowRoot.querySelector("ha-card");
    if (haCard) { haCard.style.overflowY = ""; haCard.style.overflowX = ""; }
  }

  _render() {
    const sensors = this._sensors;

    const rows = sensors.map((s, i) => {
      const a = s.attributes;
      const sid = a.series_id || "";
      const color = (LIST_SERIES_META[sid] || {}).color || "#888";
      const initials = (a.series_short || sid).substring(0, 3).toUpperCase();
      const dateRange = this._fmtDateRange(a.start_date, a.end_date);
      const status = this._listRowStatus(a);

      return `
        <div class="row" data-index="${i}">
          <div class="badge" style="background:${color}22;border-color:${color}44;color:${color}">${initials}</div>
          <div class="info">
            <div class="top">
              <span class="race">${a.event_name || ""}</span>
              <span class="top-right">${status.topRight}</span>
            </div>
            <div class="bottom">
              <span class="dates">${dateRange}</span>
              <span class="bottom-right">${status.bottomRight}</span>
            </div>
          </div>
          <div class="chevron">›</div>
        </div>`;
    }).join("");

    if (!this._rendered) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            position: relative;
            overflow: hidden;
            border-radius: 0 !important;
            line-height: 1;
          }

          ha-card {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            position: relative;
            overflow: visible;
          }

          .list {
            overflow: hidden;
          }

          .row {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 5px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            cursor: pointer;
            transition: background 0.15s;
          }

          .row:last-child { border-bottom: none; }
          .row:active { background: rgba(255,255,255,0.04); }

          .badge {
            flex-shrink: 0;
            width: 27px;
            height: 27px;
            border-radius: 6px;
            border: 1px solid;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 0.04em;
          }

          .info { flex: 1; min-width: 0; line-height: 1; }

          .top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0;
            margin-bottom: 6px;
          }

          .bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0;
          }

          .race {
            font-size: 12px;
            font-weight: 400;
            color: rgba(255,255,255,0.88);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .top-right {
            flex-shrink: 0;
            margin-left: 8px;
            font-size: 12px;
            font-weight: 400;
            color: rgba(255,255,255,0.88);
            white-space: nowrap;
          }

          .bottom-right {
            flex-shrink: 0;
            margin-left: 8px;
            font-size: 11px;
            white-space: nowrap;
          }

          .dates {
            font-size: 11px;
            color: rgba(255,255,255,0.25);
            line-height: 1;
          }

          .chevron {
            font-size: 14px;
            color: rgba(255,255,255,0.2);
            flex-shrink: 0;
            align-self: center;
          }

          /* ── Detail Panel ── */
          .detail-panel {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            transform: translateX(100%);
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            background: linear-gradient(160deg,
              rgba(20, 20, 35, 0.97) 0%,
              rgba(10, 10, 20, 0.99) 100%);
            border-left: 1px solid rgba(255,255,255,0.08);
            overflow: hidden;
            z-index: 100;
            padding: 10px;
          }

          .detail-panel.open { transform: translateX(0); }

          .detail-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
          }

          .back-chevron {
            font-size: 28px;
            color: rgba(255,255,255,0.5);
            line-height: 1;
            cursor: pointer;
            flex-shrink: 0;
            padding-right: 2px;
          }

          .back-chevron:active { color: rgba(255,255,255,0.9); }

          .detail-badge {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: 1px solid;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.04em;
          }

          .detail-header-text { flex: 1; min-width: 0; text-align: left; }

          .detail-event {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255,255,255,0.95);
            line-height: 1.2;
            margin-bottom: 3px;
          }

          .detail-sub {
            font-size: 11px;
            color: rgba(255,255,255,0.4);
            line-height: 1.3;
          }

          .live-bar {
            background: #FF3B30;
            color: #fff;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.03em;
            padding: 7px 12px;
            border-radius: 8px;
            margin-bottom: 14px;
          }

          .live-dot-indicator {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #fff;
            flex-shrink: 0;
            margin-left: 5px;
            animation: blink 1s ease-in-out infinite;
          }

          @keyframes blink {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.6); }
          }

          .sessions-block {
            border-top: 1px solid rgba(255,255,255,0.08);
            padding-top: 12px;
          }

          .sessions-header {
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.25);
            margin-bottom: 10px;
            text-align: left;
          }

          .session-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }

          .session-row:last-child { border-bottom: none; }

          .session-left {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .session-dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .session-name {
            font-size: 12px;
            color: rgba(255,255,255,0.7);
            line-height: 1.8;
          }

          .session-name.past-text { color: rgba(255,255,255,0.3); }

          .session-time {
            font-size: 11px;
            color: rgba(255,255,255,0.45);
            text-align: right;
            flex-shrink: 0;
          }

          .session-complete {
            font-size: 11px;
            color: rgba(255,255,255,0.2);
            text-align: right;
            flex-shrink: 0;
          }

          .session-live-right {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
          }

          .session-live-badge {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #fff;
            background: #FF3B30;
            padding: 2px 6px;
            border-radius: 3px;
            line-height: 1.6;
            flex-shrink: 0;
          }
        </style>

        <ha-card>
          <div class="list"></div>
        </ha-card>
        <div class="detail-panel">
          <div class="detail-content"></div>
        </div>`;

      this._rendered = true;
    }

    const listEl = this.shadowRoot.querySelector(".list");
    listEl.innerHTML = rows.length
      ? rows
      : '<div style="padding:16px;color:rgba(255,255,255,0.3);font-size:13px;text-align:center">No events found</div>';

    listEl.querySelectorAll(".row").forEach(row => {
      row.addEventListener("click", () => {
        const idx = parseInt(row.dataset.index);
        this._openDetail(sensors[idx]);
      });
    });
  }
}

if (!customElements.get("gridsync-list-card")) {
  if (!customElements.get('gridsync-list-card')) customElements.define('gridsync-list-card', GridSyncListCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "gridsync-list-card",
    name: "GridSync List Card",
    description: "Compact vertical list of upcoming motorsport events.",
  });
}
