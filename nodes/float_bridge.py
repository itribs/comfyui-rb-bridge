from .base import BaseBridge
from .utils import register_bridge_routes


class RB_FloatBridge(BaseBridge):
    SESSION_NAME = "float_bridge"
    EDIT_WIDGET_TYPE = "FLOAT"
    EDIT_WIDGET_CONFIG = {"default": 0.0, "step": 0.00001, "min": -1e20, "max": 1e20}
    RETURN_TYPES = ("FLOAT",)
    DESCRIPTION = "Pause execution and edit a float value. Input is optional; if unconnected, the edit widget value is used."


register_bridge_routes(RB_FloatBridge, "float_bridge")