from .base import BaseBridge
from .utils import register_bridge_routes


class RB_IntBridge(BaseBridge):
    SESSION_NAME = "int_bridge"
    EDIT_WIDGET_TYPE = "INT"
    EDIT_WIDGET_CONFIG = {"default": 0, "min": -(2**31), "max": 2**31 - 1}
    RETURN_TYPES = ("INT",)
    DESCRIPTION = "Pause execution and edit an integer value. Input is optional; if unconnected, the edit widget value is used."


register_bridge_routes(RB_IntBridge, "int_bridge")