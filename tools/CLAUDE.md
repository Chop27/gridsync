# GridSync Schedule Fetcher — Claude Code Instructions

## What To Do When Asked To "Update Schedule"

You are a motorsport data specialist. Your job is to fetch the next 3 upcoming events for all 13 series, generate a validated `motorsport_schedule.json`, and save it to `custom_components/gridsync/motorsport_schedule.json`.

### Step-by-step process

1. Read the current `motorsport_schedule.json` from the project root — use it for series metadata (name, short_name, logo, color) and current version number
2. Get today's date
3. For each of the 13 series below:
   - Fetch the official source URL
   - Extract the next 3 upcoming events (end_date >= today)
   - Convert all local times to UTC using the correct circuit timezone
   - Build the event JSON following the schema below
4. Merge all 13 series into a complete JSON
5. Run `node tools/validate-schedule.js` to validate (it reads from `custom_components/gridsync/motorsport_schedule.json`)
6. If validation passes → overwrite `custom_components/gridsync/motorsport_schedule.json`
7. If validation fails → show errors, fix them, re-validate before saving
8. Print the confidence report

---

## Official Sources (fetch these directly, in order)

| Series | Type | URL |
|--------|------|-----|
| f1 | HTML | https://www.formula1.com/en/racing/2026 |
| f2 | HTML | https://www.fiaformula2.com/Calendar |
| f3 | HTML | https://www.fiaformula3.com/Calendar |
| wec | HTML | https://www.fiawec.com/en/race/ |
| indycar | HTML | https://www.indycar.com/schedule |
| nascar | HTML | https://www.nascar.com/races/ |
| imsa | HTML | https://www.imsa.com/schedule/ |
| wrc | HTML | https://www.wrc.com/en/events/ |
| nls | PDF | https://www.nls-motorsport.de |
| supercars | HTML | https://www.supercars.com/racing/ |
| btcc | HTML | https://www.btcc.net/btcc/schedule/ |
| gtwce | PDF | https://www.gt-world-challenge-europe.com/calendar |
| elms | PDF | https://www.europeanlemansseries.com/en/calendar |

**If official source fails or has no timetable data → fallback to motorsport.com**

---

## 13 Series Metadata (preserve exactly)

```json
{
  "f1":        { "name": "Formula 1",                               "short_name": "F1",        "logo": "f1.png",        "color": "#E10600" },
  "f2":        { "name": "FIA Formula 2",                           "short_name": "F2",        "logo": "f2.png",        "color": "#004267" },
  "f3":        { "name": "FIA Formula 3",                           "short_name": "F3",        "logo": "f3.png",        "color": "#676767" },
  "wec":       { "name": "FIA World Endurance Championship",        "short_name": "WEC",       "logo": "wec.png",       "color": "#00B9FF" },
  "indycar":   { "name": "NTT IndyCar Series",                      "short_name": "IndyCar",   "logo": "indycar.png",   "color": "#0072BC" },
  "nascar":    { "name": "NASCAR Cup Series",                       "short_name": "NASCAR",    "logo": "nascar.png",    "color": "#FFD700" },
  "imsa":      { "name": "IMSA WeatherTech SportsCar Championship", "short_name": "IMSA",      "logo": "imsa.png",      "color": "#E51B24" },
  "wrc":       { "name": "World Rally Championship",                "short_name": "WRC",       "logo": "wrc.png",       "color": "#B8B8B8" },
  "nls":       { "name": "Nürburgring Langstrecken-Serie",          "short_name": "NLS",       "logo": "nls.png",       "color": "#067748" },
  "supercars": { "name": "Supercars Championship",                  "short_name": "Supercars", "logo": "supercars.png", "color": "#EE3123" },
  "btcc":      { "name": "British Touring Car Championship",        "short_name": "BTCC",      "logo": "btcc.png",      "color": "#0012FF" },
  "gtwce":     { "name": "GT World Challenge Europe",               "short_name": "GTWCE",     "logo": "gtwce.png",     "color": "#E31E12" },
  "elms":      { "name": "European Le Mans Series",                 "short_name": "ELMS",      "logo": "elms.png",      "color": "#0A0032" }
}
```

---

## JSON Schema (match exactly)

```json
{
  "version": "2026.X.X",
  "last_updated": "YYYY-MM-DD",
  "series": {
    "series_key": {
      "name": "Full Series Name",
      "short_name": "Short",
      "logo": "key.png",
      "color": "#XXXXXX",
      "events": [
        {
          "round": 1,
          "name": "Event Name",
          "track": "Track Name",
          "location": "City, Country",
          "flag": "🏁",
          "start_date": "YYYY-MM-DD",
          "end_date": "YYYY-MM-DD",
          "sessions": {
            "session_key": {
              "start": "YYYY-MM-DDTHH:MM:SSZ",
              "end": "YYYY-MM-DDTHH:MM:SSZ or null"
            }
          }
        }
      ]
    }
  }
}
```

---

## Valid Session Keys
```
practice1, practice2, practice3, practice4, practice5, practice,
qualifying, qualifying1, qualifying2, qualifying_day1, qualifying_day2,
qualifying_race, qualifying_race1, qualifying_race2,
top_qualifying, sprint_qualifying, sprint, sprint_race, feature_race,
hyperpole, hyperpole1, hyperpole2, test_day, warmup,
carb_day, duel1, duel2, shakedown, day1, day2, day3, power_stage,
race, race1, race2, race3
```

---

## Session Duration Rules
Calculate `end` using these when not officially published. Use `null` for variable sessions.

| Session | Duration | Series |
|---------|----------|--------|
| practice1/2/3 | +60min | F1 |
| practice4/5 | +360min | IndyCar Indy 500 open days |
| sprint_qualifying | +45min | F1 |
| sprint | +60min | F1 |
| qualifying | +60min | F1 |
| qualifying | +30min | F2, F3 |
| qualifying | +40min | NASCAR, GTWCE Sprint |
| qualifying | +36min | IndyCar road |
| qualifying | +60min | IndyCar oval |
| qualifying | +30min | BTCC |
| qualifying | +44min | WEC 6H total (all classes) |
| qualifying | +60min | ELMS, NLS regular |
| qualifying | +44min | Supercars |
| qualifying_day1 | null | Indy 500 (weather dependent) |
| qualifying_day2 | +90min | Indy 500 |
| sprint_race | +45min | F2, F3 |
| feature_race | null | F2, F3 |
| race | null | F1, F2, F3, NASCAR, IndyCar |
| race | +360min | WEC 6H |
| race | +1440min | WEC Le Mans, NLS 24H |
| race | +240min | ELMS, NLS regular |
| race | +180min | GTWCE 3H Endurance |
| race1/2 | +60min | GTWCE Sprint |
| race1/2/3 | +45min | BTCC |
| race1/2 | null | Supercars |
| shakedown | +180min | WRC |
| day1/2/3 | null | WRC |
| carb_day | +300min | Indy 500 |
| warmup | +15min | WEC Le Mans |
| hyperpole | +44min | WEC 6H |
| hyperpole1/2 | +20min each | WEC Le Mans |
| top_qualifying | +90min | NLS 24H |
| qualifying_race | +240min | NLS |

---

## Series-Specific Notes (critical)

- **F1 sprint weekend:** practice1, sprint_qualifying, sprint, qualifying, race (no practice2/3)
- **F1 standard weekend:** practice1, practice2, practice3, qualifying, race
- **F2/F3:** No practice sessions — qualifying, sprint_race, feature_race only
- **NASCAR:** No practice sessions — qualifying + race only
- **IndyCar road/street:** qualifying + race only (practices removed for simplicity)
- **IndyCar Indy 500:** Special multi-week event — practice1-4, qualifying_day1, qualifying_day2, practice5, carb_day, race
- **BTCC:** Has `qualifying_race` session between qualifying and race day — this is correct, not an error
- **NLS 24h Qualifiers:** Uses qualifying_race1 and qualifying_race2 as separate keys
- **GTWCE Monza:** Endurance round — single 3H race, not two sprint races
- **GTWCE Paul Ricard:** Endurance round — 6H race
- **GTWCE Spa:** Endurance round — 24H race
- **WEC/ELMS/GTWCE:** Qualifying often happens day before start_date — this is valid
- **WRC day stages:** Always null end time
- **Supercars:** qualifying1 + race1 + qualifying2 + race2 format (two race days)

---

## Validation Rules (all must pass before saving)

1. No events where `end_date` < today
2. Exactly 3 events per series (or fewer if season has fewer remaining)
3. All session keys from valid list only
4. No overlapping sessions within same event
5. `end` must be after `start` where not null
6. All timestamps valid ISO 8601 UTC format
7. `start_date` ≤ `end_date`
8. Sessions outside `start_date`/`end_date` allowed ONLY for qualifying/practice the day before
9. No duplicate session keys within same event
10. Version bumped from previous (patch increment)

---

## Confidence Report
After saving, print this table:

| Series | Event | Session | Source | Confidence | Note |
|--------|-------|---------|--------|------------|------|

Confidence levels:
- ✅ Official — from official series URL
- ⚠️ Fallback — from motorsport.com or similar
- ❌ Estimated — duration rule applied, no source confirmed
