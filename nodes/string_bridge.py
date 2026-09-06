import threading
import server

from .utils import run_pause_loop, register_routes, make_confirm_route

bridge_states: dict[str, dict] = {}


class RB_StringBridge:
    CATEGORY = "bridge"
    FUNCTION = "bridge"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    OUTPUT_NODE = False
    DESCRIPTION = "Pause execution and edit a string value. Input is optional; if unconnected, the edit widget value is used."

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text_edit": ("STRING", {
                    "multiline": True,
                    "default": "",
                    "dynamicPrompts": False,
                }),
                "timeout": ("FLOAT", {
                    "default": -1,
                    "min": -1,
                    "step": 1,
                    "tooltip": "Seconds to wait. -1 = infinite, 0 = skip pause",
                }),
            },
            "optional": {
                "text": ("STRING", {
                    "forceInput": True,
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    def bridge(self, text_edit, timeout, text=None, unique_id=None, prompt=None, extra_pnginfo=None):
        if text is None:
            text = text_edit
        if timeout == 0:
            server.PromptServer.instance.send_sync(
                "string_bridge_session",
                {"node_id": unique_id, "text": text, "passthrough": True},
            )
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
            server.PromptServer.instance.send_sync(
                "string_bridge_resume",
                {"node_id": unique_id},
            )

        return {
            "ui": {"text": [edited_text]},
            "result": (edited_text,),
        }


def add_routes(routes):
    routes.post("/string_bridge/confirm")(
        make_confirm_route(bridge_states, "edited_text")
    )


register_routes(add_routes, "StringBridge")