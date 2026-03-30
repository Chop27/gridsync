# GridSync — Motorsport Tracker for Home Assistant

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![HA Version](https://img.shields.io/badge/Home%20Assistant-2026.3.0%2B-blue)](https://www.home-assistant.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A Home Assistant integration that tracks upcoming motorsport events across multiple series — Formula 1, F2, F3, WEC, IndyCar, NASCAR, IMSA, WRC and NLS — with a companion Lovelace card that displays a live, scrollable race calendar directly on your dashboard.

---

## Features

- 🏎️ **9 series supported** — F1, F2, F3, WEC, IndyCar, NASCAR, IMSA, WRC, NLS
- 📅 **One sensor per series** — next event, track, location, dates, full session schedule
- ⏱️ **Live session detection** — automatically detects and displays active sessions with a pulsing LIVE badge
- 🔢 **Days filter** — only show events within a configurable number of days
- 🌍 **Local time** — all session times displayed in your browser's local timezone
- 🃏 **Companion Lovelace card** — compact scrollable list with slide-in detail panel
- ♻️ **Auto-refresh** — coordinator updates every hour, card timer ticks every 10 seconds
- 🔇 **Zero database load** — sensors are explicitly excluded from the HA recorder

---

## Screenshots

### Integration Setup
![Integration setup showing series checkboxes and days filter](docs/setup-config-flow.png)

### Race Calendar Card
![List card showing upcoming events for multiple series](docs/card-list-view.png)

### Event Detail Panel
![Slide-in detail panel showing full session schedule](docs/card-detail-view.png)

---

## Installation

### Manual

1. Copy `custom_components/gridsync/` into your `/config/custom_components/` folder
2. Restart Home Assistant

---

## Card Installation

1. Copy `www/gridsync/gridsync-list-card.js` to `/config/www/gridsync/`
2. Go to **Settings → Dashboards → ⋮ → Resources → + Add Resource**
   - URL: `/local/gridsync/gridsync-list-card.js`
   - Type: **JavaScript module**
3. Hard refresh your browser (**Ctrl+Shift+R**)

---

## Configuration

### Step 1 — Add the Integration

**Settings → Integrations → + Add Integration → GridSync Motorsport Tracker**

- Select the series you want to track
- Set a days filter (0 = show all events regardless of how far away)

### Step 2 — Add the Card

```yaml
type: custom:gridsync-list-card
```

---

## Sensors

One sensor is created per selected series:

| Entity | Example State |
|--------|---------------|
| `sensor.gridsync_formula_1` | `Japanese Grand Prix · 2026-03-27 – 2026-03-29` |
| `sensor.gridsync_ntt_indycar_series` | `Alabama Indy Grand Prix · 2026-03-27 – 2026-03-29` |

### Sensor Attributes

| Attribute | Description |
|-----------|-------------|
| `series_name` | Full series name |
| `series_short` | Short label e.g. `F1` |
| `series_color` | Brand hex color |
| `series_logo` | Logo filename |
| `event_name` | Full event name |
| `track_name` | Circuit name |
| `location` | City, Country |
| `flag` | Country flag emoji |
| `round` | Round number |
| `start_date` | Event start `YYYY-MM-DD` |
| `end_date` | Event end `YYYY-MM-DD` |
| `sessions` | Dict of session name → UTC ISO datetime |
| `days_until` | Days until event starts |
| `next_session` | Name of next upcoming session |
| `next_session_time` | ISO datetime of next session |

---

## Card Behaviour

| State | List view | Detail view |
|-------|-----------|-------------|
| Upcoming | Days until | Full session schedule |
| Active weekend | Next session + countdown | Sessions with upcoming times |
| Live session | **LIVE** · Session name (red) | **LIVE** badge + pulsing dot |
| Between sessions | Countdown to next session | Sessions with Complete / upcoming |
| Weekend complete | Complete | All sessions marked Complete |

---

## Supported Series

| Key | Series | Color |
|-----|--------|-------|
| `f1` | Formula 1 | `#E10600` |
| `f2` | FIA Formula 2 | `#004267` |
| `f3` | FIA Formula 3 | `#676767` |
| `wec` | FIA World Endurance Championship | `#00B9FF` |
| `indycar` | NTT IndyCar Series | `#0072BC` |
| `nascar` | NASCAR Cup Series | `#FFD700` |
| `imsa` | IMSA WeatherTech SportsCar Championship | `#E51B24` |
| `wrc` | World Rally Championship | `#FFFFFF` |
| `nls` | Nürburgring Langstrecken-Serie | `#067748` |

---

## Updating the Schedule

The race calendar is bundled in `custom_components/gridsync/motorsport_schedule.json`. To update it:

1. Edit the JSON file — each series has a list of events with session times in UTC
2. Reload the integration: **Settings → Integrations → GridSync → ⋮ → Reload**
3. No restart required

### JSON Structure

```json
{
  "version": "2026.2.0",
  "last_updated": "2026-03-27",
  "series": {
    "f1": {
      "name": "Formula 1",
      "short_name": "F1",
      "logo": "f1.png",
      "color": "#E10600",
      "events": [
        {
          "round": 3,
          "name": "Japanese Grand Prix",
          "track": "Suzuka International Racing Course",
          "location": "Suzuka, Japan",
          "flag": "🇯🇵",
          "start_date": "2026-03-27",
          "end_date": "2026-03-29",
          "sessions": {
            "practice1": "2026-03-27T02:30:00Z",
            "practice2": "2026-03-27T06:00:00Z",
            "practice3": "2026-03-28T02:30:00Z",
            "qualifying": "2026-03-28T06:00:00Z",
            "race": "2026-03-29T05:00:00Z"
          }
        },
        {
          "round": 4,
          "name": "Miami Grand Prix",
          "track": "Miami International Autodrome",
          "location": "Miami, USA",
          "flag": "🇺🇸",
          "start_date": "2026-05-01",
          "end_date": "2026-05-03",
          "sessions": {
            "practice1": "2026-05-01T17:30:00Z",
            "sprint_qualifying": "2026-05-01T21:30:00Z",
            "sprint": "2026-05-02T17:00:00Z",
            "qualifying": "2026-05-02T21:00:00Z",
            "race": "2026-05-03T19:00:00Z"
          }
        }
      ]
    }
  }
}
```

All session times are in **UTC**.

---

## Automation Examples

### Notify Before a Race Weekend

```yaml
automation:
  - alias: "F1 Race Weekend Alert"
    trigger:
      - platform: template
        value_template: >
          {{ state_attr('sensor.gridsync_formula_1', 'days_until') == 1 }}
    action:
      - service: notify.mobile_app
        data:
          title: "🏎️ F1 This Weekend!"
          message: >
            {{ state_attr('sensor.gridsync_formula_1', 'event_name') }}
            at {{ state_attr('sensor.gridsync_formula_1', 'track_name') }}
```

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Contributing

Pull requests welcome. To add a new series:
1. Add it to `AVAILABLE_SERIES` in `const.py`
2. Add its events to `motorsport_schedule.json`
3. Add its color to `LIST_SERIES_META` in `gridsync-list-card.js`
