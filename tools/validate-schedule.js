/**
 * GridSync Schedule Validator
 * Usage: node tools/validate-schedule.js
 * Or:    node tools/validate-schedule.js path/to/schedule.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const filePath = process.argv[2] || path.join(ROOT, "custom_components", "gridsync", "motorsport_schedule.json");

const VALID_SESSION_KEYS = new Set([
  "practice1","practice2","practice3","practice4","practice5","practice",
  "qualifying","qualifying1","qualifying2","qualifying_day1","qualifying_day2",
  "qualifying_race","qualifying_race1","qualifying_race2",
  "top_qualifying","sprint_qualifying","sprint","sprint_race","feature_race",
  "hyperpole","hyperpole1","hyperpole2","test_day","warmup",
  "carb_day","duel1","duel2","shakedown","day1","day2","day3","power_stage",
  "race","race1","race2","race3",
]);

const EXPECTED_SERIES = [
  "f1","f2","f3","wec","indycar","nascar","imsa",
  "wrc","nls","supercars","btcc","gtwce","elms",
];

function validate(schedule) {
  const errors = [];
  const warnings = [];
  const today = new Date().toISOString().split("T")[0];

  if (!schedule.version)      errors.push("Missing version field");
  if (!schedule.last_updated) errors.push("Missing last_updated field");
  if (!schedule.series)       { errors.push("Missing series field"); return { errors, warnings }; }

  EXPECTED_SERIES.forEach(s => {
    if (!schedule.series[s]) errors.push(`Missing series: ${s}`);
  });

  for (const [seriesKey, series] of Object.entries(schedule.series)) {
    const events = series.events || [];

    if (!series.name)       errors.push(`${seriesKey}: Missing name`);
    if (!series.short_name) errors.push(`${seriesKey}: Missing short_name`);
    if (!series.color)      errors.push(`${seriesKey}: Missing color`);
    if (!series.logo)       errors.push(`${seriesKey}: Missing logo`);

    if (events.length === 0) { errors.push(`${seriesKey}: No events`); continue; }
    if (events.length > 3)   errors.push(`${seriesKey}: ${events.length} events (max 3)`);
    if (events.length < 3)   warnings.push(`${seriesKey}: Only ${events.length} events (expected 3)`);

    events.forEach((ev, i) => {
      const p = `${seriesKey}[${i}] "${ev.name}"`;

      if (!ev.name)       errors.push(`${p}: Missing name`);
      if (!ev.track)      errors.push(`${p}: Missing track`);
      if (!ev.location)   errors.push(`${p}: Missing location`);
      if (!ev.flag)       warnings.push(`${p}: Missing flag`);
      if (!ev.start_date) errors.push(`${p}: Missing start_date`);
      if (!ev.end_date)   errors.push(`${p}: Missing end_date`);
      if (!ev.round)      warnings.push(`${p}: Missing round number`);

      if (ev.end_date && ev.end_date < today)
        errors.push(`${p}: end_date ${ev.end_date} is in the past (today: ${today})`);

      if (ev.start_date && ev.end_date && ev.start_date > ev.end_date)
        errors.push(`${p}: start_date after end_date`);

      if (!ev.sessions || Object.keys(ev.sessions).length === 0) {
        errors.push(`${p}: No sessions`); return;
      }

      const sessionList = [];

      for (const [key, sess] of Object.entries(ev.sessions)) {
        const sp = `${p}.${key}`;

        if (!VALID_SESSION_KEYS.has(key))
          errors.push(`${sp}: Invalid session key`);

        if (typeof sess !== "object" || sess === null) {
          errors.push(`${sp}: Session must be object {start, end}`); continue;
        }

        if (!sess.start) { errors.push(`${sp}: Missing start`); continue; }

        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(sess.start)) {
          errors.push(`${sp}: Invalid UTC format — "${sess.start}"`); continue;
        }

        const start = new Date(sess.start);
        if (isNaN(start)) { errors.push(`${sp}: Invalid start date`); continue; }

        let end = null;
        if (sess.end !== null && sess.end !== undefined) {
          if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(sess.end)) {
            errors.push(`${sp}: Invalid UTC format — "${sess.end}"`);
          } else {
            end = new Date(sess.end);
            if (isNaN(end))   errors.push(`${sp}: Invalid end date`);
            else if (end <= start) errors.push(`${sp}: end must be after start`);
          }
        }

        sessionList.push({ key, start: start.getTime(), end: end ? end.getTime() : null });
      }

      // Overlap check
      for (let a = 0; a < sessionList.length; a++) {
        for (let b = a + 1; b < sessionList.length; b++) {
          const sA = sessionList[a], sB = sessionList[b];
          if (sA.end !== null && sB.start < sA.end && sB.start >= sA.start)
            errors.push(`${p}: Sessions "${sA.key}" and "${sB.key}" overlap`);
        }
      }
    });
  }

  return { errors, warnings };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n🔍 Validating: ${filePath}\n`);

let schedule;
try {
  schedule = JSON.parse(fs.readFileSync(filePath, "utf8"));
} catch (err) {
  console.error(`❌ Failed to read/parse file: ${err.message}`);
  process.exit(1);
}

const { errors, warnings } = validate(schedule);

if (warnings.length > 0) {
  console.log("⚠️  Warnings:");
  warnings.forEach(w => console.log(`   - ${w}`));
  console.log();
}

if (errors.length > 0) {
  console.error(`❌ Validation FAILED — ${errors.length} error(s):\n`);
  errors.forEach(e => console.error(`   - ${e}`));
  console.log();
  process.exit(1);
}

const totalEvents   = Object.values(schedule.series).reduce((s, x) => s + (x.events?.length || 0), 0);
const totalSessions = Object.values(schedule.series).reduce((s, x) =>
  s + (x.events || []).reduce((e, ev) => e + Object.keys(ev.sessions || {}).length, 0), 0);

console.log(`✅ Validation PASSED`);
console.log(`   Version:  ${schedule.version}`);
console.log(`   Updated:  ${schedule.last_updated}`);
console.log(`   Series:   ${Object.keys(schedule.series).length}`);
console.log(`   Events:   ${totalEvents}`);
console.log(`   Sessions: ${totalSessions}`);
console.log();
