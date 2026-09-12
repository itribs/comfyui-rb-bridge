from .base import BaseBridge
from .utils import register_routes, make_confirm_route


class RB_Pause(BaseBridge):
    SESSION_NAME = "pause"
    IS_PASSTHROUGH = True
    FORCE_PAUSE_DEFAULT = True
    FUNCTION = "pause"
    RETURN_TYPES = ("*",)
    DESCRIPTION = "Pause execution to inspect intermediate results. Passes through any type of input without modification. Set force_pause to true to pause on every run."

    def pause(self, timeout=0, unique_id=None, **kwargs):
        value = kwargs.get("any")
        if timeout == 0:
            return {"ui": {}, "result": (value,)}

        self._do_pause(unique_id, timeout)
        return {"ui": {}, "result": (value,)}


def add_routes(routes):
    routes.post("/pause/confirm")(
        make_confirm_route(RB_Pause._states)
    )


register_routes(add_routes, "Pause")