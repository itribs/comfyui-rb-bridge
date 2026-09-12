from .base import BaseBridge
from .utils import register_bridge_routes


class RB_BoolBridge(BaseBridge):
    SESSION_NAME = "bool_bridge"
    EDIT_WIDGET_TYPE = "BOOLEAN"
    EDIT_WIDGET_CONFIG = {"default": False}
    RETURN_TYPES = ("BOOLEAN",)
    DESCRIPTION = "Pause execution and toggle a boolean value. Input is optional; if unconnected, the edit widget value is used."


register_bridge_routes(RB_BoolBridge, "bool_bridge")