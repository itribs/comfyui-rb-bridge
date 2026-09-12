# ComfyUI Bridge

A collection of pause-and-edit nodes for ComfyUI that let you interrupt workflow execution, inspect and modify values, then continue.

![demo](demo.png)

## Nodes

### Bridge Nodes (editable)

These nodes pause execution and allow you to edit the value before continuing. The input port is optional — if unconnected, the edit widget value is used as the default.

| Node | Type | Input | Edit Widget | Output |
|------|------|-------|-------------|--------|
| **RB String Bridge** | STRING | optional | multiline text | text |
| **RB Int Bridge** | INT | optional | number input | number |
| **RB Float Bridge** | FLOAT | optional | number input | number |
| **RB Bool Bridge** | BOOLEAN | optional | toggle | boolean |

### RB Pause (passthrough)

A pure passthrough node that pauses execution without editing. Useful for inspecting intermediate results at any point in the workflow. Accepts and outputs any type (`*`).

| Input | Type | Description |
|-------|------|-------------|
| `any` | `*` | Any value to pass through |
| `force_pause` | BOOLEAN | When `true`, forces the node to pause on every run, even if the input hasn't changed |

## Parameters

All nodes share the `timeout` parameter:

| `timeout` | Behavior |
|-----------|----------|
| `-1` | Infinite wait until Continue is clicked (default) |
| `0` | Skip pause, pass through immediately |
| `>0` | Auto-continue after N seconds |

## Installation

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/itribs/comfyui-rb-bridge.git
```

## License

MIT