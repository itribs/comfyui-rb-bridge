import time
import threading
import server
from aiohttp import web

import nodes
from comfy.model_management import (
    InterruptProcessingException,
    throw_exception_if_processing_interrupted,
)


def run_pause_loop(event, timeout):
    start = time.monotonic()
    try:
        while not event.is_set():
            throw_exception_if_processing_interrupted()
            if timeout > 0 and time.monotonic() - start >= timeout:
                break
            event.wait(timeout=0.1)
    except InterruptProcessingException:
        nodes.interrupt_processing()
        raise


def register_routes(add_routes_fn, name):
    try:
        prompt_server = server.PromptServer.instance
        if prompt_server is not None:
            add_routes_fn(prompt_server.routes)
    except Exception as e:
        print(f"[{name}] Warning: Could not register routes: {e}")


def make_confirm_route(states, value_key=None):
    async def confirm(request):
        try:
            data = await request.json()
            node_id = str(data.get("node_id"))

            if node_id not in states:
                return web.json_response(
                    {"status": "error", "message": "Session not found"},
                    status=404,
                )

            if value_key is not None:
                states[node_id][value_key] = data.get(value_key)

            states[node_id]["event"].set()
            return web.json_response({"status": "success"})
        except Exception as e:
            return web.json_response(
                {"status": "error", "message": str(e)},
                status=500,
            )

    return confirm