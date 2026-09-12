from .base import BaseBridge
from .utils import register_bridge_routes


class RB_StringBridge(BaseBridge):
    SESSION_NAME = "string_bridge"
    EDIT_WIDGET_TYPE = "STRING"
    EDIT_WIDGET_NAME = "text_edit"
    EDIT_WIDGET_CONFIG = {"multiline": True, "default": "", "dynamicPrompts": False}
    OPTIONAL_INPUT_NAME = "text"
    VALUE_KEY = "text"
    STATE_KEY = "edited_text"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    DESCRIPTION = "Pause execution and edit a string value. Input is optional; if unconnected, the edit widget value is used."

    def bridge(self, text_edit, timeout, text=None, unique_id=None, **kwargs):
        return super().bridge(text_edit, timeout, text, unique_id, **kwargs)


register_bridge_routes(RB_StringBridge, "string_bridge", "edited_text")