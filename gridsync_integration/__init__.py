"""GridSync Motorsport Tracker Integration."""
from __future__ import annotations

import logging
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .coordinator import GridSyncCoordinator

_LOGGER = logging.getLogger(__name__)

DOMAIN = "gridsync"
PLATFORMS = [Platform.SENSOR]
SCAN_INTERVAL = timedelta(hours=1)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up GridSync from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    coordinator = GridSyncCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Exclude all GridSync entities from the recorder database
    try:
        from homeassistant.components.recorder import DOMAIN as RECORDER_DOMAIN
        from homeassistant.components.recorder.models import StatisticsShortTerm
        if RECORDER_DOMAIN in hass.data:
            recorder = hass.data[RECORDER_DOMAIN]
            if hasattr(recorder, "async_add_entity_filter"):
                recorder.async_add_entity_filter(
                    lambda entity_id: not entity_id.startswith("sensor.gridsync_")
                )
    except (ImportError, Exception):
        pass  # Recorder not available or filter not supported

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)
    return unload_ok


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update — reload the config entry."""
    await hass.config_entries.async_reload(entry.entry_id)
