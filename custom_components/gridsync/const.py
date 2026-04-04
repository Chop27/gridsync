"""Constants for the GridSync Motorsport Tracker integration."""

DOMAIN = "gridsync"

# Config entry keys
CONF_SERIES = "series"
CONF_DAYS_FILTER = "days_filter"

# Master series registry — add new series here only
SERIES = {
    "f1":        { "name": "Formula 1",                               "short": "F1",        "color": "#E10600" },
    "f2":        { "name": "FIA Formula 2",                           "short": "F2",        "color": "#004267" },
    "f3":        { "name": "FIA Formula 3",                           "short": "F3",        "color": "#676767" },
    "wec":       { "name": "FIA World Endurance Championship",        "short": "WEC",       "color": "#00B9FF" },
    "indycar":   { "name": "NTT IndyCar Series",                      "short": "IndyCar",   "color": "#0072BC" },
    "nascar":    { "name": "NASCAR Cup Series",                       "short": "NASCAR",    "color": "#FFD700" },
    "imsa":      { "name": "IMSA WeatherTech SportsCar Championship", "short": "IMSA",      "color": "#E51B24" },
    "wrc":       { "name": "World Rally Championship",                "short": "WRC",       "color": "#E0E0E0" },
    "nls":       { "name": "Nürburgring Langstrecken-Serie",          "short": "NLS",       "color": "#067748" },
    "supercars": { "name": "Supercars Championship",                  "short": "Supercars", "color": "#EE3123" },
    "btcc":      { "name": "British Touring Car Championship",        "short": "BTCC",      "color": "#0012FF" },
    "gtwce":     { "name": "GT World Challenge Europe",               "short": "GTWCE",     "color": "#E31E12" },
    "elms":      { "name": "European Le Mans Series",                 "short": "ELMS",      "color": "#FF5F00" },
}

# Derived — backwards compatibility for existing code in coordinator.py, sensor.py, config_flow.py
AVAILABLE_SERIES = {k: v["name"]  for k, v in SERIES.items()}
SERIES_COLORS    = {k: v["color"] for k, v in SERIES.items()}

# Sensor attribute keys
ATTR_SERIES_NAME = "series_name"
ATTR_SERIES_SHORT = "series_short"
ATTR_SERIES_COLOR = "series_color"
ATTR_SERIES_LOGO = "series_logo"
ATTR_TRACK_NAME = "track_name"
ATTR_EVENT_NAME = "event_name"
ATTR_LOCATION = "location"
ATTR_FLAG = "flag"
ATTR_START_DATE = "start_date"
ATTR_END_DATE = "end_date"
ATTR_ROUND = "round"
ATTR_SESSIONS = "sessions"
ATTR_DAYS_UNTIL = "days_until"
ATTR_NEXT_SESSION = "next_session"
ATTR_NEXT_SESSION_TIME = "next_session_time"
ATTR_SCHEDULE_JSON = "schedule_json"

# Schedule JSON file name
SCHEDULE_FILE = "motorsport_schedule.json"

# Update interval in hours
UPDATE_INTERVAL_HOURS = 1
