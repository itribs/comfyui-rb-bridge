import threading
import server

from .utils import run_pause_loop, register_routes, make_confirm_route

pause_states: dict[str, dict] = {}


class Pause:
    CATEGORY = "bridge"
    FUNCTION = "pause"
    RETURN_TYPES = ("*",)
    RETURN_NAMES = ("value",)
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("*",),
                "timeout": ("FLOAT", {
                    "default": 0,
                    "min": -1,
                    "step": 1,
                    "tooltip": "Seconds to wait. 0 = infinite, -1 = skip pause",
                }),
                "force_pause": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "Force pause even if input has not changed",
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    def pause(self, value, timeout, force_pause=False, unique_id=None, prompt=None, extra_pnginfo=None):
        if timeout <= -1:
            return {
                "ui": {"value": [value]},
                "result": (value,),
            }

        event = threading.Event()
        pause_states[unique_id] = {"event": event}

        PromptServer = server.PromptServer.instance
        PromptServer.send_sync(
            "pause_session",
            {"node_id": unique_id, "value": value},
        )

        run_pause_loop(event, timeout)

        pause_states.pop(unique_id, None)
        PromptServer.send_sync(
            "pause_resume",
            {"node_id": unique_id, "value": value},
        )

        return {
            "ui": {"value": [value]},
            "result": (value,),
        }


def add_routes(routes):
    routes.post("/pause/confirm")(
        make_confirm_route(pause_states)
    )


register_routes(add_routes, "Pause")