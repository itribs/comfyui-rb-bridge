import threading
import server

from .utils import run_pause_loop, register_routes, make_confirm_route

bool_bridge_states: dict[str, dict] = {}


class RB_BoolBridge:
    CATEGORY = "bridge"
    FUNCTION = "bridge"
    RETURN_TYPES = ("BOOLEAN",)
    RETURN_NAMES = ("value",)
    OUTPUT_NODE = False
    DESCRIPTION = "Pause execution and toggle a boolean value. Input is optional; if unconnected, the edit widget value is used."

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value_edit": ("BOOLEAN", {
                    "default": False,
                }),
                "timeout": ("FLOAT", {
                    "default": -1,
                    "min": -1,
                    "step": 1,
                    "tooltip": "Seconds to wait. -1 = infinite, 0 = skip pause",
                }),
            },
            "optional": {
                "value": ("BOOLEAN", {
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
        if value is None:
            value = value_edit
        if timeout == 0:
            server.PromptServer.instance.send_sync(
                "bool_bridge_session",
                {"node_id": unique_id, "value": value, "passthrough": True},
            )
            return {
                "ui": {"value": [value]},
                "result": (value,),
            }

        event = threading.Event()
        bool_bridge_states[unique_id] = {
            "event": event,
            "edited_value": value,
        }

        server.PromptServer.instance.send_sync(
            "bool_bridge_session",
            {"node_id": unique_id, "value": value},
        )

        try:
            run_pause_loop(event, timeout)
        finally:
            state = bool_bridge_states.pop(unique_id, None)
            edited_value = state["edited_value"] if state else value
            server.PromptServer.instance.send_sync(
                "bool_bridge_resume",
                {"node_id": unique_id},
            )

        return {
            "ui": {"value": [edited_value]},
            "result": (edited_value,),
        }


def add_routes(routes):
    routes.post("/bool_bridge/confirm")(
        make_confirm_route(bool_bridge_states, "edited_value")
    )


register_routes(add_routes, "BoolBridge")