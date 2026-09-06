import threading
import server

from .utils import run_pause_loop, register_routes, make_confirm_route

int_bridge_states: dict[str, dict] = {}


class RB_IntBridge:
    CATEGORY = "bridge"
    FUNCTION = "bridge"
    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("value",)
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("INT", {
                    "forceInput": True,
                }),
                "value_edit": ("INT", {
                    "default": 0,
                }),
                "timeout": ("FLOAT", {
                    "default": 0,
                    "min": -1,
                    "step": 1,
                    "tooltip": "Seconds to wait. 0 = infinite, -1 = skip pause",
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    def bridge(self, value, value_edit, timeout, unique_id=None, prompt=None, extra_pnginfo=None):
        if timeout <= -1:
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

        return {
            "ui": {"value": [edited_value]},
            "result": (edited_value,),
        }


def add_routes(routes):
    routes.post("/int_bridge/confirm")(
        make_confirm_route(int_bridge_states, "edited_value")
    )


register_routes(add_routes, "IntBridge")