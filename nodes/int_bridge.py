import threading
import server

from .utils import run_pause_loop, register_routes, make_confirm_route, make_sync_route

int_bridge_states: dict[str, dict] = {}


class RB_IntBridge:
    CATEGORY = "bridge"
    FUNCTION = "bridge"
    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("value",)
    OUTPUT_NODE = False
    DESCRIPTION = "Pause execution and edit an integer value. Input is optional; if unconnected, the edit widget value is used."

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value_edit": ("INT", {
                    "default": 0,
                }),
                "timeout": ("FLOAT", {
                    "default": -1,
                    "min": -1,
                    "step": 1,
                    "tooltip": "Seconds to wait. -1 = infinite, 0 = skip pause",
                }),
            },
            "optional": {
                "value": ("INT", {
                    "forceInput": True,
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    def bridge(self, value_edit, timeout, value=None, unique_id=None, prompt=None, extra_pnginfo=None):
        connected = value is not None
        if value is None:
            value = value_edit

        current_params = (value, value_edit, timeout)
        last_params = getattr(self, "_last_params", None)

        if last_params is not None and current_params == last_params:
            output = getattr(self, "_last_output", value)
            server.PromptServer.instance.send_sync(
                "int_bridge_session",
                {"node_id": unique_id, "value": output, "passthrough": True},
            )
            return {
                "ui": {"value": [output]},
                "result": (output,),
            }

        if timeout == 0:
            self._last_params = current_params
            self._last_output = value
            server.PromptServer.instance.send_sync(
                "int_bridge_session",
                {"node_id": unique_id, "value": value, "passthrough": True},
            )
            return {
                "ui": {"value": [value]},
                "result": (value,),
            }

        event = threading.Event()
        int_bridge_states[unique_id] = {
            "event": event,
            "edited_value": value,
        }

        server.PromptServer.instance.send_sync(
            "int_bridge_session",
            {"node_id": unique_id, "value": value},
        )

        try:
            run_pause_loop(event, timeout)
        finally:
            state = int_bridge_states.pop(unique_id, None)
            edited_value = state["edited_value"] if state else value
            if not isinstance(edited_value, type(value)):
                try:
                    edited_value = type(value)(edited_value)
                except (ValueError, TypeError):
                    pass

            if event.is_set():
                if connected:
                    self._last_params = (value, edited_value, timeout)
                else:
                    self._last_params = (edited_value, edited_value, timeout)
                self._last_output = edited_value
            else:
                if connected:
                    self._last_params = (value, edited_value, timeout)
                else:
                    self._last_params = (edited_value, edited_value, timeout)
                self._last_output = edited_value

            server.PromptServer.instance.send_sync(
                "int_bridge_resume",
                {"node_id": unique_id},
            )

        return {
            "ui": {"value": [edited_value]},
            "result": (edited_value,),
        }


def add_routes(routes):
    routes.post("/int_bridge/confirm")(
        make_confirm_route(int_bridge_states, "edited_value")
    )
    routes.post("/int_bridge/sync")(
        make_sync_route(int_bridge_states, "edited_value")
    )


register_routes(add_routes, "IntBridge")