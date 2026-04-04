/**
 * GridSync Shared Data v1.0
 * Single source of truth for series metadata and session labels.
 * Used by: gridsync-list-card, gridsync-ios-card, gridsync-card
 *
 * HA resource entry required:
 *   URL: /local/gridsync/gridsync-data.js
 *   Type: JavaScript module
 */

window.GRIDSYNC_SERIES_META = {
  f1:        { label: "F1",        color: "#E10600", bg: "rgba(225,6,0,0.18)",       accent: "#FF4D6D" },
  f2:        { label: "F2",        color: "#004267", bg: "rgba(0,66,103,0.25)",      accent: "#0072BC" },
  f3:        { label: "F3",        color: "#676767", bg: "rgba(103,103,103,0.2)",    accent: "#999999" },
  wec:       { label: "WEC",       color: "#00B9FF", bg: "rgba(0,185,255,0.18)",     accent: "#4AD4FF" },
  indycar:   { label: "IndyCar",   color: "#0072BC", bg: "rgba(0,114,188,0.18)",     accent: "#4A90E2" },
  nascar:    { label: "NASCAR",    color: "#FFD700", bg: "rgba(255,215,0,0.18)",     accent: "#FFA500" },
  imsa:      { label: "IMSA",      color: "#E51B24", bg: "rgba(229,27,36,0.18)",     accent: "#FF4D55" },
  wrc:       { label: "WRC",       color: "#E0E0E0", bg: "rgba(224,224,224,0.12)",   accent: "#FFFFFF" },
  nls:       { label: "NLS",       color: "#067748", bg: "rgba(6,119,72,0.2)",       accent: "#00A651" },
  supercars: { label: "Supercars", color: "#EE3123", bg: "rgba(238,49,35,0.18)",     accent: "#FF5544" },
  btcc:      { label: "BTCC",      color: "#0012FF", bg: "rgba(0,18,255,0.18)",      accent: "#3355FF" },
  gtwce:     { label: "GTWCE",     color: "#E31E12", bg: "rgba(227,30,18,0.18)",     accent: "#FF4444" },
  elms:      { label: "ELMS",      color: "#FF5F00", bg: "rgba(255,95,0,0.18)",      accent: "#FF8833" },
};

window.GRIDSYNC_SESSION_LABELS = {
  // Practice
  practice1:        "Practice 1",
  practice2:        "Practice 2",
  practice3:        "Practice 3",
  practice4:        "Practice 4",
  practice5:        "Practice 5",
  practice:         "Practice",
  // Qualifying
  qualifying:       "Qualifying",
  qualifying1:      "Qualifying 1",
  qualifying2:      "Qualifying 2",
  qualifying_day1:  "Qualifying Day 1",
  qualifying_day2:  "Qualifying Day 2",
  qualifying_race:  "Qualifying Race",
  top_qualifying:   "Top Qualifying",
  // Sprint weekend
  sprint_qualifying: "Sprint Qualifying",
  sprint:           "Sprint",
  sprint_race:      "Sprint Race",
  feature_race:     "Feature Race",
  // WEC specific
  test_day:         "Test Day",
  hyperpole:        "Hyperpole",
  hyperpole1:       "Hyperpole 1",
  hyperpole2:       "Hyperpole 2",
  warmup:           "Warm Up",
  // IndyCar / Indy 500 specific
  carb_day:         "Carb Day",
  // NASCAR specific
  duel1:            "Duel 1",
  duel2:            "Duel 2",
  // WRC specific
  shakedown:        "Shakedown",
  day1:             "Day 1",
  day2:             "Day 2",
  day3:             "Day 3",
  power_stage:      "Power Stage",
  // Races
  race:             "Race",
  race1:            "Race 1",
  race2:            "Race 2",
  race3:            "Race 3",
};

console.info("%c GRIDSYNC DATA %c v1.0 ",
  "background:#067748;color:#fff;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px",
  "background:#111318;color:#aaa;padding:2px 6px;border-radius:0 4px 4px 0");
