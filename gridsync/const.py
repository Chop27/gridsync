"""Constants for the GridSync Motorsport Tracker integration."""

DOMAIN = "gridsync"

# Config entry keys
CONF_SERIES = "series"
CONF_DAYS_FILTER = "days_filter"

# Available motorsport series
AVAILABLE_SERIES = {
    "f1": "Formula 1",
    "f2": "FIA Formula 2",
    "f3": "FIA Formula 3",
    "wec": "FIA World Endurance Championship",
    "indycar": "NTT IndyCar Series",
    "nascar": "NASCAR Cup Series",
    "imsa": "IMSA WeatherTech SportsCar Championship",
    "wrc": "World Rally Championship",
    "nls": "Nürburgring Langstrecken-Serie",
    "supercars": "Supercars Championship",
    "btcc": "British Touring Car Championship",
    "gtwce": "GT World Challenge Europe",
    "elms": "European Le Mans Series",
}

SERIES_COLORS = {
    "f1": "#E10600",
    "f2": "#004267",
    "f3": "#676767",
    "wec": "#00B9FF",
    "indycar": "#0072BC",
    "nascar": "#FFD700",
    "imsa": "#E51B24",
    "wrc": "#FFFFFF",
    "nls": "#067748",
    "supercars": "#EE3123",
    "btcc": "#020255",
    "gtwce": "#E31E12",
    "elms": "#FF5F00",
}

# Series colors for UI
SERIES_COLORS = {
    "f1": "#E8002D",
    "wec": "#1A4B8C",
    "indycar": "#002B5C",
    "nascar": "#FFD700",
    "imsa": "#00A651",
}

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
