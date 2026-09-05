import threading
import server

from .utils import run_pause_loop, register_routes, make_confirm_route

float_bridge_states: dict[str, dict] = {}


class FloatBridge:
    CATEGORY = "bridge"
    FUNCTION = "bridge"
    RETURN_TYPES = ("FLOAT",)
    RETURN_NAMES = ("value",)
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("FLOAT", {
                    "forceInput": True,
                }),
                "timeout": ("FLOAT", {
                    "default": 0,
                    "min": -1,
                    "step": 1,
                    "tooltip": "Seconds to wait. 0 = infinite, -1 = skip pause",
                }),
                "value_edit": ("FLOAT", {
                    "default": 0.0,
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
        float_bridge_states[unique_id] = {
            "event": event,
            "edited_value": value_edit if value_edit is not None else value,
        }

        server.PromptServer.instance.send_sync(
            "float_bridge_session",
            {"node_id": unique_id, "value": value},
        )

        run_pause_loop(event, timeout)

        state = float_bridge_states.pop(unique_id, None)
        edited_value = state["edited_value"] if state else value

        return {
            "ui": {"value": [edited_value]},
            "result": (edited_value,),
        }


def add_routes(routes):
    routes.post("/float_bridge/confirm")(
        make_confirm_route(float_bridge_states, "edited_value")
    )


register_routes(add_routes, "FloatBridge")