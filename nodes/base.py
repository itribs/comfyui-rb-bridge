import math
import threading
import server

from .utils import run_pause_loop


class BaseBridge:
    SESSION_NAME: str | None = None
    VALUE_KEY: str = "value"
    STATE_KEY: str = "edited_value"
    CATEGORY = "bridge"
    FUNCTION = "bridge"
    OUTPUT_NODE = False
    RETURN_NAMES = ("value",)

    EDIT_WIDGET_TYPE: str | None = None
    EDIT_WIDGET_NAME: str = "value_edit"
    EDIT_WIDGET_CONFIG: dict = {}
    OPTIONAL_INPUT_NAME: str = "value"
    FORCE_PAUSE_DEFAULT: bool = False
    IS_PASSTHROUGH: bool = False

    _states: dict[str, dict]

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls._states = {}

    @classmethod
    def INPUT_TYPES(cls):
        required = {}
        if cls.IS_PASSTHROUGH:
            required["any"] = ("*",)
        else:
            required[cls.EDIT_WIDGET_NAME] = (cls.EDIT_WIDGET_TYPE, cls.EDIT_WIDGET_CONFIG)

        required["action"] = (["auto", "dialog", "focus", "never"], {
            "default": "auto",
            "tooltip": "Pause behavior: auto = navigate if in view else dialog, dialog = always show popup, focus = navigate to node, never = skip",
        })
        required["force_pause"] = ("BOOLEAN", {
            "default": cls.FORCE_PAUSE_DEFAULT,
            "tooltip": "Force pause even if input has not changed",
        })
        required["timeout"] = ("FLOAT", {
            "default": -1,
            "min": -1,
            "step": 1,
            "tooltip": "Seconds to wait. -1 = infinite, 0 = skip pause",
        })

        result: dict = {
            "required": required,
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

        if not cls.IS_PASSTHROUGH:
            result["optional"] = {
                cls.OPTIONAL_INPUT_NAME: (cls.EDIT_WIDGET_TYPE, {"forceInput": True}),
            }

        return result

    def _send_session(self, unique_id, value, passthrough=False):
        payload = {"node_id": unique_id, self.VALUE_KEY: value}
        if passthrough:
            payload["passthrough"] = True
        if server.PromptServer.instance is not None:
            server.PromptServer.instance.send_sync(
                f"{self.SESSION_NAME}_session", payload,
            )

    def _send_resume(self, unique_id):
        if server.PromptServer.instance is not None:
            server.PromptServer.instance.send_sync(
                f"{self.SESSION_NAME}_resume",
                {"node_id": unique_id},
            )

    def _result(self, value):
        return {"ui": {self.VALUE_KEY: [value]}, "result": (value,)}

    @classmethod
    def IS_CHANGED(cls, force_pause=False, **kwargs):
        if force_pause:
            return float("NaN")
        return False

    @staticmethod
    def _params_equal(a, b):
        """Compare two parameter tuples for equality.

        NaN values are treated as equal to each other (deliberately
        deviating from IEEE 754) so that float inputs containing NaN
        do not cause spurious cache misses.
        """
        if a is None or b is None:
            return a is b
        if len(a) != len(b):
            return False
        for x, y in zip(a, b):
            if isinstance(x, float) and isinstance(y, float):
                if math.isnan(x) and math.isnan(y):
                    continue
                if not math.isclose(x, y, rel_tol=1e-9, abs_tol=1e-12):
                    return False
            elif x != y:
                return False
        return True

    def _do_pause(self, unique_id, timeout, value=None, extra_state=None):
        if timeout == 0:
            return None

        event = threading.Event()
        state = {"event": event}
        if extra_state:
            state.update(extra_state)

        self._states[unique_id] = state
        self._send_session(unique_id, value)

        try:
            run_pause_loop(event, timeout)
        finally:
            result = self._states.pop(unique_id, None)
            self._send_resume(unique_id)

        return result

    def bridge(self, value_edit, timeout, value=None, unique_id=None, force_pause=False, **kwargs):
        connected = value is not None
        if value is None:
            value = value_edit

        pf = float("NaN") if force_pause else False
        current_params = (value, value_edit, pf, timeout)
        last_params = getattr(self, "_last_params", None)

        if not force_pause and last_params is not None and self._params_equal(current_params, last_params):
            output = getattr(self, "_last_output", value)
            self._send_session(unique_id, output, passthrough=True)
            return self._result(output)

        if timeout == 0:
            self._last_params = current_params
            self._last_output = value
            self._send_session(unique_id, value, passthrough=True)
            return self._result(value)

        state = self._do_pause(unique_id, timeout, value=value, extra_state={self.STATE_KEY: value})
        edited = state[self.STATE_KEY] if state else value
        if type(edited) is not type(value):
            try:
                edited = type(value)(edited)
            except (ValueError, TypeError):
                edited = value

        if connected:
            self._last_params = (value, edited, pf, timeout)
        else:
            self._last_params = (edited, edited, pf, timeout)
        self._last_output = edited

        return self._result(edited)