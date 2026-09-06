import threading
import server

from .utils import run_pause_loop, register_routes, make_confirm_route

bridge_states: dict[str, dict] = {}


class RB_StringBridge:
    CATEGORY = "bridge"
    FUNCTION = "bridge"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {
                    "forceInput": True,
                }),
                "text_edit": ("STRING", {
                    "multiline": True,
                    "default": "",
                    "dynamicPrompts": False,
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

    def bridge(self, text, text_edit, timeout, unique_id=None, prompt=None, extra_pnginfo=None):
        if timeout <= -1:
            return {
                "ui": {"text": [text]},
                "result": (text,),
            }

        event = threading.Event()
        bridge_states[unique_id] = {
            "event": event,
            "edited_text": text,
        }

        server.PromptServer.instance.send_sync(
            "string_bridge_session",
            {"node_id": unique_id, "text": text},
        )

        try:
            run_pause_loop(event, timeout)
        finally:
            state = bridge_states.pop(unique_id, None)
            edited_text = state["edited_text"] if state else text

        return {
            "ui": {"text": [edited_text]},
            "result": (edited_text,),
        }


def add_routes(routes):
    routes.post("/string_bridge/confirm")(
        make_confirm_route(bridge_states, "edited_text")
    )


register_routes(add_routes, "StringBridge")