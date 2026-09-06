import threading
import uuid
import server

from .utils import run_pause_loop, register_routes, make_confirm_route

pause_states: dict[str, dict] = {}


class RB_Pause:
    CATEGORY = "bridge"
    FUNCTION = "pause"
    RETURN_TYPES = ("*",)
    RETURN_NAMES = ("value",)
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "any": ("*",),
                "force_pause": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "Force pause even if input has not changed",
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

    @classmethod
    def IS_CHANGED(cls, force_pause=False, **kwargs):
        if force_pause:
            return uuid.uuid4().hex
        return False

    def pause(self, any, force_pause=False, timeout=0, unique_id=None, prompt=None, extra_pnginfo=None):
        if timeout <= -1:
            return {
                "ui": {"value": [any]},
                "result": (any,),
            }

        event = threading.Event()
        pause_states[unique_id] = {"event": event}

        PromptServer = server.PromptServer.instance
        PromptServer.send_sync(
            "pause_session",
            {"node_id": unique_id},
        )

        try:
            run_pause_loop(event, timeout)
        finally:
            pause_states.pop(unique_id, None)
            PromptServer.send_sync(
                "pause_resume",
                {"node_id": unique_id},
            )

        return {
            "ui": {},
            "result": (any,),
        }


def add_routes(routes):
    routes.post("/pause/confirm")(
        make_confirm_route(pause_states)
    )


register_routes(add_routes, "Pause")