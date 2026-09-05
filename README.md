# ComfyUI Bridge

A collection of pause-and-edit nodes for ComfyUI that let you interrupt workflow execution, inspect and modify values, then continue.

## Nodes

### Bridge Nodes (editable)

These nodes pause execution and allow you to edit the value before continuing.

| Node | Type | Input | Edit Widget | Output |
|------|------|-------|-------------|--------|
| **String Bridge** | STRING | multiline text | multiline text | edited text |
| **Int Bridge** | INT | number input | number input | edited number |
| **Float Bridge** | FLOAT | number input | number input | edited number |
| **Bool Bridge** | BOOLEAN | toggle | toggle | edited boolean |

### Pause Node (passthrough)

A pure passthrough node that pauses execution without editing. Useful for inspecting intermediate results at any point in the workflow. Accepts and outputs any type (`*`).

## Parameters

All nodes share these parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `timeout` | 0 | Seconds to wait. `0` = infinite, `-1` = skip pause entirely, `>0` = auto-continue after N seconds |

Pause node additionally has:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `force_pause` | false | Toggle to force re-execution |

## How It Works

1. **Execution reaches the node** — the workflow pauses and the backend sends an event to the frontend
2. **Buttons activate** — Continue and Cancel become clickable (they are grayed out otherwise)
3. **Edit (Bridge nodes only)** — modify the value in the `value_edit` / `text_edit` widget directly on the node
4. **Continue** — click Continue to resume with the edited value
5. **Cancel** — click Cancel to interrupt the entire workflow

## Installation

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/itribs/comfyui-bridge.git
```

## License

MIT