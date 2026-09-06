import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

(function injectCSS() {
    if (document.getElementById("bridge-styles")) return;
    const link = document.createElement("link");
    link.id = "bridge-styles";
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
        el.classList.remove("bridge-btn-disabled");
        el.classList.add("bridge-btn-enabled");
    } else {
        el.classList.remove("bridge-btn-enabled");
        el.classList.add("bridge-btn-disabled");
    }
}


function createBridgeButton(text, onClick) {
    const btn = document.createElement("button");
    btn.className = "comfyui-button bridge-btn bridge-btn-disabled";
    btn.textContent = text;
    btn.disabled = true;
    btn.onclick = onClick;
    return btn;
}

export function createButtons(node, onConfirm) {
    const continueBtn = createBridgeButton("Continue", onConfirm);
    const continueButton = node.addDOMWidget("Continue", "custom", continueBtn);
    continueButton.serialize = false;
    continueButton.computeSize = function () {
        return [this.size?.[0] || 0, 30];
    };

    const cancelBtn = createBridgeButton("Cancel", () => {
        node._bridge_active = false;
        disableButtons(node);
        app.api.interrupt(null);
    });
    const cancelButton = node.addDOMWidget("Cancel", "custom", cancelBtn);
    cancelButton.serialize = false;
    cancelButton.computeSize = function () {
        return [this.size?.[0] || 0, 38];
    };

    return { continueButton, cancelButton };
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


export function confirmBridge(node, apiUrl, editWidgetName, valueKey, defaultValue) {
    if (!node._bridge_active) return;

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
            if (response.ok) {
                console.log(`[Bridge] Confirmed via ${apiUrl}`);
                node._bridge_active = false;
                disableButtons(node);
            } else {
                console.error(`[Bridge] Failed to confirm: ${apiUrl}`);
                alert("Confirmation failed, please try again.");
            }
        })
        .catch((error) => {
            console.error(`[Bridge] Error confirming: ${apiUrl}`, error);
            alert("Confirmation failed: " + error.message);
        });
}