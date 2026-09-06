import os

from .nodes.string_bridge import RB_StringBridge
from .nodes.int_bridge import RB_IntBridge
from .nodes.float_bridge import RB_FloatBridge
from .nodes.bool_bridge import RB_BoolBridge
from .nodes.pause import RB_Pause

NODE_CLASS_MAPPINGS = {
    "RB_StringBridge": RB_StringBridge,
    "RB_IntBridge": RB_IntBridge,
    "RB_FloatBridge": RB_FloatBridge,
    "RB_BoolBridge": RB_BoolBridge,
    "RB_Pause": RB_Pause,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "RB_StringBridge": "RB String Bridge",
    "RB_IntBridge": "RB Int Bridge",
    "RB_FloatBridge": "RB Float Bridge",
    "RB_BoolBridge": "RB Bool Bridge",
    "RB_Pause": "RB Pause",
}

WEB_DIRECTORY = os.path.join(os.path.dirname(__file__), "web")

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]