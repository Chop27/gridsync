"""Sensor platform for GridSync Motorsport Tracker."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import (
    SensorEntity,

)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import DOMAIN
from .const import (
    AVAILABLE_SERIES,
    ATTR_SERIES_NAME,
    ATTR_SERIES_SHORT,
    ATTR_SERIES_COLOR,
    ATTR_SERIES_LOGO,
    ATTR_TRACK_NAME,
    ATTR_EVENT_NAME,
    ATTR_LOCATION,
    ATTR_FLAG,
    ATTR_START_DATE,
    ATTR_END_DATE,
    ATTR_ROUND,
    ATTR_SESSIONS,
    ATTR_DAYS_UNTIL,
    ATTR_NEXT_SESSION,
    ATTR_NEXT_SESSION_TIME,
)
from .coordinator import GridSyncCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up GridSync sensors from a config entry."""
    from homeassistant.helpers import entity_registry as er

    coordinator: GridSyncCoordinator = hass.data[DOMAIN][entry.entry_id]

    # Remove entities for series that are no longer selected
    entity_reg = er.async_get(hass)
    current_entities = er.async_entries_for_config_entry(entity_reg, entry.entry_id)
    for entity_entry in current_entities:
        series_id = next(
            (s for s in AVAILABLE_SERIES if f"gridsync_{s}" in entity_entry.unique_id),
            None,
        )
        if series_id and series_id not in coordinator.selected_series:
            entity_reg.async_remove(entity_entry.entity_id)

    entities = []
    for series_id in coordinator.selected_series:
        if series_id in AVAILABLE_SERIES:
            entities.append(GridSyncSensor(coordinator, series_id))

    async_add_entities(entities, True)


class GridSyncSensor(CoordinatorEntity[GridSyncCoordinator], SensorEntity):
    """Representation of a GridSync motorsport sensor."""

    # Never record state or attributes in the HA database
    _attr_state_class = None
    _unrecorded_attributes = frozenset({"__all__"})

    def __init__(
        self, coordinator: GridSyncCoordinator, series_id: str
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._series_id = series_id
        self._series_display = AVAILABLE_SERIES.get(series_id, series_id.upper())

        self._attr_unique_id = f"gridsync_{series_id}_next_event"
        self._attr_name = f"GridSync {self._series_display}"
        self._attr_icon = "mdi:racing-helmet"

    @property
    def series_data(self) -> dict[str, Any] | None:
        """Return data for this series."""
        if self.coordinator.data:
            return self.coordinator.data.get(self._series_id)
        return None

    @property
    def native_value(self) -> str | None:
        """Return the sensor state: event name and date range."""
        data = self.series_data
        if not data:
            return None

        event_name = data.get(ATTR_EVENT_NAME, "Unknown")
        start = data.get(ATTR_START_DATE, "")
        end = data.get(ATTR_END_DATE, "")

        if event_name == "Season Complete":
            return "Season Complete"

        if start and end and start != end:
            return f"{event_name} · {start} – {end}"
        elif start:
            return f"{event_name} · {start}"
        return event_name

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return extra state attributes."""
        data = self.series_data
        if not data:
            return {}

        return {
            ATTR_SERIES_NAME: data.get(ATTR_SERIES_NAME),
            ATTR_SERIES_SHORT: data.get(ATTR_SERIES_SHORT),
            ATTR_SERIES_COLOR: data.get(ATTR_SERIES_COLOR),
            ATTR_SERIES_LOGO: data.get(ATTR_SERIES_LOGO),
            ATTR_EVENT_NAME: data.get(ATTR_EVENT_NAME),
            ATTR_TRACK_NAME: data.get(ATTR_TRACK_NAME),
            ATTR_LOCATION: data.get(ATTR_LOCATION),
            ATTR_FLAG: data.get(ATTR_FLAG),
            ATTR_ROUND: data.get(ATTR_ROUND),
            ATTR_START_DATE: data.get(ATTR_START_DATE),
            ATTR_END_DATE: data.get(ATTR_END_DATE),
            ATTR_SESSIONS: data.get(ATTR_SESSIONS, {}),
            ATTR_DAYS_UNTIL: data.get(ATTR_DAYS_UNTIL),
            ATTR_NEXT_SESSION: data.get(ATTR_NEXT_SESSION),
            ATTR_NEXT_SESSION_TIME: data.get(ATTR_NEXT_SESSION_TIME),
            "series_id": self._series_id,
        }

    @property
    def device_info(self) -> dict[str, Any]:
        """Return device information."""
        return {
            "identifiers": {(DOMAIN, "gridsync_hub")},
            "name": "GridSync Motorsport Hub",
            "manufacturer": "GridSync",
            "model": "Motorsport Tracker",
            "sw_version": "1.0.0",
        }

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return self.coordinator.last_update_success and self.series_data is not None
