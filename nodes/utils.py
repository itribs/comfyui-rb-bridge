import time
import threading
import traceback
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
            if event.wait(0.1):
                break
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


def register_bridge_routes(cls, session_name, state_key="edited_value"):
    def add_routes(routes):
        routes.post(f"/{session_name}/confirm")(
            make_confirm_route(cls._states, state_key)
        )
        routes.post(f"/{session_name}/sync")(
            make_sync_route(cls._states, state_key)
        )

    name = "".join(word.title() for word in session_name.replace("_", " ").split())
    register_routes(add_routes, name)


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
            traceback.print_exc()
            return web.json_response(
                {"status": "error", "message": str(e)},
                status=500,
            )

    return confirm


def make_sync_route(states, value_key):
    async def sync(request):
        try:
            data = await request.json()
            node_id = str(data.get("node_id"))

            if node_id in states:
                new_val = data.get(value_key)
                states[node_id][value_key] = new_val
                return web.json_response({"status": "success"})
            return web.json_response({"status": "error"}, status=404)
        except Exception as e:
            traceback.print_exc()
            return web.json_response(
                {"status": "error", "message": str(e)},
                status=500,
            )

    return sync