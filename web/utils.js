import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

(function injectCSS() {
    if (document.getElementById("rb-styles")) return;
    const link = document.createElement("link");
    link.id = "rb-styles";
    link.rel = "stylesheet";
    link.href = new URL("bridge.css", import.meta.url).href;
    document.head.appendChild(link);
})();


export function setButtonState(widget, enabled) {
    if (!widget) return;
    const el = widget.element;
    if (!el) return;

    el.disabled = !enabled;
    if (enabled) {
        el.classList.remove("rb-btn-disabled");
        el.classList.add("rb-btn-enabled");
    } else {
        el.classList.remove("rb-btn-enabled");
        el.classList.add("rb-btn-disabled");
    }
}


export function enableButtons(node) {
    const continueBtn = node.widgets.find((w) => w.name === "Continue");
    setButtonState(continueBtn, true);
    const cancelBtn = node.widgets.find((w) => w.name === "Cancel");
    setButtonState(cancelBtn, true);
}


export function disableButtons(node) {
    const continueBtn = node.widgets.find((w) => w.name === "Continue");
    setButtonState(continueBtn, false);
    const cancelBtn = node.widgets.find((w) => w.name === "Cancel");
    setButtonState(cancelBtn, false);
}


function createActionButton(text, onClick) {
    const btn = document.createElement("button");
    btn.className = "comfyui-button rb-btn rb-btn-disabled";
    btn.textContent = text;
    btn.disabled = true;
    btn.onclick = onClick;
    return btn;
}


export function createButtons(node, onConfirm, onCancel) {
    const continueBtn = createActionButton("Continue", onConfirm);
    const continueButton = node.addDOMWidget("Continue", "custom", continueBtn);
    continueButton.serialize = false;
    continueButton.computeSize = function () {
        return [this.size?.[0] || 0, 30];
    };

    const defaultCancel = () => {
        node._session_active = false;
        node._cancelled = true;
        disableButtons(node);
        app.api.interrupt(null);
    };

    const cancelBtn = createActionButton("Cancel", onCancel || defaultCancel);
    const cancelButton = node.addDOMWidget("Cancel", "custom", cancelBtn);
    cancelButton.serialize = false;
    cancelButton.computeSize = function () {
        return [this.size?.[0] || 0, 36];
    };

    return { continueButton, cancelButton };
}


export function getNode(nodeId) {
    const idStr = String(nodeId);

    if (idStr.includes(":")) {
        const parts = idStr.split(":").map(Number);
        let graph = app.graph;
        for (let i = 0; i < parts.length; i++) {
            const node = graph._nodes.find((n) => n.id == parts[i]);
            if (!node) return null;
            if (i === parts.length - 1) return node;
            if (!node.subgraph) return null;
            graph = node.subgraph;
        }
        return null;
    }

    function findInGraph(graph) {
        for (const node of graph._nodes) {
            if (node.id == nodeId) return node;
            if (node.subgraph) {
                const found = findInGraph(node.subgraph);
                if (found) return found;
            }
        }
        return null;
    }
    return findInGraph(app.graph);
}


function _findPathToGraph(targetGraph, searchGraph, path = []) {
    if (searchGraph === targetGraph) return path;
    for (const node of searchGraph._nodes || []) {
        if (node.subgraph) {
            const result = _findPathToGraph(targetGraph, node.subgraph, [...path, node]);
            if (result) return result;
        }
    }
    return null;
}


export function navigateToNode(targetNode) {
    if (!targetNode || !app.canvas) return;

    const targetGraph = targetNode.graph;
    if (!targetGraph) return;

    if (app.canvas.graph === targetGraph) {
        app.canvas.ds.scale = 1;
        app.canvas.centerOnNode(targetNode);
        return;
    }

    const path = _findPathToGraph(targetGraph, app.graph);
    if (!path) return;

    if (path.length === 0 && app.canvas.graph !== targetGraph) {
        app.canvas.openSubgraph(targetGraph);
        setTimeout(() => {
            app.canvas.ds.scale = 1;
            app.canvas.centerOnNode(targetNode);
        }, 50);
        return;
    }

    let remaining = [...path];
    function openNext() {
        if (remaining.length === 0) {
            app.canvas.ds.scale = 1;
            app.canvas.centerOnNode(targetNode);
            return;
        }
        const fromNode = remaining.shift();
        app.canvas.openSubgraph(fromNode.subgraph, fromNode);
        setTimeout(openNext, 50);
    }
    openNext();
}


export function isNodeInCurrentView(node) {
    if (!node || !app.canvas?.graph) return true;
    return node.graph === app.canvas.graph;
}


export function getNodeAction(node) {
    if (!node) return "auto";
    const actionWidget = node.widgets.find((w) => w.name === "action");
    return actionWidget ? actionWidget.value : "auto";
}


export function handleAction(node, title, inputConfig, onConfirm, onCancel, syncUrl, syncValueKey, showDialog) {
    const action = getNodeAction(node);
    if (action === "never") {
        return;
    }
    if (action === "focus" || (action === "auto" && isNodeInCurrentView(node))) {
        navigateToNode(node);
        return;
    }
    showDialog(node, title, inputConfig, onConfirm, onCancel, syncUrl, syncValueKey);
}


export function confirm(node, apiUrl, editWidgetName, valueKey, defaultValue) {
    if (!node._session_active) return;

    node._session_active = false;
    disableButtons(node);

    const body = { node_id: node._execution_id || String(node.id) };

    if (editWidgetName !== null) {
        const editWidget = node.widgets.find((w) => w.name === editWidgetName);
        const value = editWidget ? editWidget.value : defaultValue;
        body[valueKey] = value;
    }

    api.fetchApi(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
        .then((response) => {
            if (!response.ok) {
                console.error(`[RB] Failed to confirm: ${apiUrl}`);
                node._session_active = true;
                enableButtons(node);
                alert("Confirmation failed, please try again.");
            }
        })
        .catch((error) => {
            console.error(`[RB] Error confirming: ${apiUrl}`, error);
            node._session_active = true;
            enableButtons(node);
            alert("Confirmation failed: " + error.message);
        });
}


export function setupWidgetSync(node, editWidget, syncUrl, syncValueKey) {
    if (node._widget_synced) return;
    node._widget_synced = true;

    const doSync = () => {
        if (!node._session_active || node._sync_block) return;

        if (node._sync_timer) {
            clearTimeout(node._sync_timer);
        }
        node._sync_timer = setTimeout(() => {
            node._sync_timer = null;
            const nodeId = node._execution_id || String(node.id);
            api.fetchApi(syncUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ node_id: nodeId, [syncValueKey]: editWidget.value }),
            }).catch((e) => console.error(`[RB SYNC] error:`, e));
        }, 300);
    };

    const origCallback = editWidget.callback;
    editWidget.callback = function (...args) {
        if (origCallback) {
            origCallback.apply(this, args);
        }
        doSync();
    };
}