import os

from .nodes.string_bridge import StringBridge
from .nodes.int_bridge import IntBridge
from .nodes.float_bridge import FloatBridge
from .nodes.bool_bridge import BoolBridge
from .nodes.pause import Pause

NODE_CLASS_MAPPINGS = {
    "StringBridge": StringBridge,
    "IntBridge": IntBridge,
    "FloatBridge": FloatBridge,
    "BoolBridge": BoolBridge,
    "Pause": Pause,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "StringBridge": "String Bridge",
    "IntBridge": "Int Bridge",
    "FloatBridge": "Float Bridge",
    "BoolBridge": "Bool Bridge",
    "Pause": "Pause",
}

WEB_DIRECTORY = os.path.join(os.path.dirname(__file__), "web")

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]