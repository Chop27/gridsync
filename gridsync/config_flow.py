"""Config flow for GridSync Motorsport Tracker."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
import homeassistant.helpers.config_validation as cv

from .const import DOMAIN, CONF_SERIES, CONF_DAYS_FILTER, AVAILABLE_SERIES

_LOGGER = logging.getLogger(__name__)

DAYS_OPTIONS = {
    "0": "Show all",
    "7": "7 days",
    "14": "14 days",
    "30": "30 days",
    "60": "60 days",
    "90": "90 days",
}


class GridSyncConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for GridSync Motorsport Tracker."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            selected = user_input.get(CONF_SERIES, [])
            if not selected:
                errors[CONF_SERIES] = "no_series_selected"
            else:
                await self.async_set_unique_id("gridsync_main")
                self._abort_if_unique_id_configured()

                return self.async_create_entry(
                    title="GridSync Motorsport Tracker",
                    data={
                        CONF_SERIES: selected,
                        CONF_DAYS_FILTER: int(user_input.get(CONF_DAYS_FILTER, "0")),
                    },
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_SERIES): cv.multi_select(AVAILABLE_SERIES),
                vol.Optional(CONF_DAYS_FILTER, default="0"): vol.In(DAYS_OPTIONS),
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> GridSyncOptionsFlow:
        """Get the options flow."""
        return GridSyncOptionsFlow()


class GridSyncOptionsFlow(config_entries.OptionsFlow):
    """Handle GridSync options."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Handle options flow."""
        errors: dict[str, str] = {}

        if user_input is not None:
            selected = user_input.get(CONF_SERIES, [])
            if not selected:
                errors[CONF_SERIES] = "no_series_selected"
            else:
                return self.async_create_entry(
                    title="GridSync Motorsport Tracker",
                    data={
                        CONF_SERIES: selected,
                        CONF_DAYS_FILTER: int(user_input.get(CONF_DAYS_FILTER, "0")),
                    },
                )

        current_series = self.config_entry.options.get(
            CONF_SERIES, self.config_entry.data.get(CONF_SERIES, []),
        )
        current_days = self.config_entry.options.get(
            CONF_DAYS_FILTER, self.config_entry.data.get(CONF_DAYS_FILTER, 0),
        )

        schema = vol.Schema(
            {
                vol.Required(CONF_SERIES, default=current_series): cv.multi_select(
                    AVAILABLE_SERIES
                ),
                vol.Optional(CONF_DAYS_FILTER, default=str(int(current_days))): vol.In(DAYS_OPTIONS),
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            errors=errors,
        )
