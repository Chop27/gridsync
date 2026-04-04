"""Data coordinator for GridSync Motorsport Tracker."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone, timedelta, date
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    DOMAIN,
    CONF_SERIES,
    CONF_DAYS_FILTER,
    SCHEDULE_FILE,
    UPDATE_INTERVAL_HOURS,
)

_LOGGER = logging.getLogger(__name__)


class GridSyncCoordinator(DataUpdateCoordinator):
    """GridSync data update coordinator."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(hours=UPDATE_INTERVAL_HOURS),
        )
        self.entry = entry
        self._schedule_data: dict = {}

    @property
    def selected_series(self) -> list[str]:
        """Always read fresh from options, falling back to data."""
        return self.entry.options.get(
            CONF_SERIES, self.entry.data.get(CONF_SERIES, [])
        )

    @property
    def days_filter(self) -> int:
        """Days filter — 0 means show all."""
        val = self.entry.options.get(
            CONF_DAYS_FILTER, self.entry.data.get(CONF_DAYS_FILTER, 0)
        )
        try:
            return int(val)
        except (TypeError, ValueError):
            return 0

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch and process schedule data."""
        try:
            schedule = await self.hass.async_add_executor_job(self._load_schedule)
            return self._process_schedule(schedule)
        except Exception as err:
            raise UpdateFailed(f"Error loading GridSync schedule: {err}") from err

    def _load_schedule(self) -> dict:
        """Load the schedule JSON file from the integration directory."""
        schedule_path = os.path.join(os.path.dirname(__file__), SCHEDULE_FILE)
        with open(schedule_path, encoding="utf-8") as f:
            return json.load(f)

    def _session_start_str(self, session_val: Any) -> str | None:
        """Extract start time string from session value — supports string or {start, end} dict."""
        if isinstance(session_val, dict):
            return session_val.get("start")
        return session_val

    def _process_schedule(self, schedule: dict) -> dict[str, Any]:
        """Process schedule data and find next/current event for each selected series."""
        now = datetime.now(timezone.utc)
        today = now.date()
        result = {}

        for series_id in self.selected_series:
            series_data = schedule.get("series", {}).get(series_id)
            if not series_data:
                _LOGGER.warning("Series '%s' not found in schedule", series_id)
                continue

            event_data = self._find_event(series_data["events"], now, today)

            if event_data is None:
                result[series_id] = {
                    "series_name": series_data["name"],
                    "series_short": series_data["short_name"],
                    "series_logo": series_data.get("logo", ""),
                    "series_color": series_data.get("color", "#000000"),
                    "event_name": "Season Complete",
                    "track_name": "N/A",
                    "location": "N/A",
                    "flag": "",
                    "round": 0,
                    "start_date": "",
                    "end_date": "",
                    "sessions": {},
                    "days_until": -1,
                    "next_session": None,
                    "next_session_time": None,
                    "event_state": "complete",
                }
                continue

            event, event_state = event_data
            start_date_str = event["start_date"]
            end_date_str = event["end_date"]
            start_date = datetime.fromisoformat(start_date_str).date()
            end_date = datetime.fromisoformat(end_date_str).date()

            days_until = (start_date - today).days
            if today > end_date:
                days_until = -1
            elif today >= start_date:
                days_until = 0

            if self.days_filter > 0 and days_until > self.days_filter:
                continue

            next_session_name, next_session_time = self._find_next_session(
                event.get("sessions", {}), now
            )

            result[series_id] = {
                "series_name": series_data["name"],
                "series_short": series_data["short_name"],
                "series_logo": series_data.get("logo", ""),
                "series_color": series_data.get("color", "#000000"),
                "event_name": event["name"],
                "track_name": event["track"],
                "location": event["location"],
                "flag": event.get("flag", ""),
                "round": event["round"],
                "start_date": start_date_str,
                "end_date": end_date_str,
                "sessions": event.get("sessions", {}),
                "days_until": days_until,
                "next_session": next_session_name,
                "next_session_time": next_session_time,
                "event_state": event_state,
            }

        return result

    def _find_event(
        self, events: list, now: datetime, today: date
    ) -> tuple[dict, str] | None:
        """Find the relevant event."""
        for event in events:
            start = datetime.fromisoformat(event["start_date"]).date()
            end = datetime.fromisoformat(event["end_date"]).date()
            if start <= today <= end:
                sessions = event.get("sessions", {})
                all_done = all(
                    datetime.fromisoformat(
                        self._session_start_str(v) or ""
                    ).replace(tzinfo=timezone.utc) < now
                    for v in sessions.values()
                    if self._session_start_str(v)
                ) if sessions else False

                if all_done:
                    if today <= end:
                        return event, "complete_today"
                    return None
                return event, "active"

        future = [
            e for e in events
            if datetime.fromisoformat(e["end_date"]).date() >= today
            and datetime.fromisoformat(e["start_date"]).date() > today
        ]
        if not future:
            return None

        future.sort(key=lambda e: datetime.fromisoformat(e["start_date"]).date())
        return future[0], "upcoming"

    def _find_next_session(
        self, sessions: dict, now: datetime
    ) -> tuple[str | None, str | None]:
        """Find the next upcoming session."""
        if not sessions:
            return None, None

        upcoming = []
        for session_name, session_val in sessions.items():
            try:
                start_str = self._session_start_str(session_val)
                if not start_str:
                    continue
                session_dt = datetime.fromisoformat(start_str)
                if session_dt.tzinfo is None:
                    session_dt = session_dt.replace(tzinfo=timezone.utc)
                if session_dt > now:
                    upcoming.append((session_dt, session_name))
            except (ValueError, TypeError, KeyError):
                continue

        if not upcoming:
            return None, None

        upcoming.sort(key=lambda x: x[0])
        next_dt, next_name = upcoming[0]
        readable_name = next_name.replace("_", " ").title()
        return readable_name, next_dt.isoformat()
