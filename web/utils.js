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
        node._cancelled = true;
        disableButtons(node);
        clearModalQueue();
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

    node._bridge_active = false;
    disableButtons(node);
    closeCurrentModal();

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
            } else {
                console.error(`[Bridge] Failed to confirm: ${apiUrl}`);
                node._bridge_active = true;
                enableButtons(node);
                alert("Confirmation failed, please try again.");
            }
        })
        .catch((error) => {
            console.error(`[Bridge] Error confirming: ${apiUrl}`, error);
            node._bridge_active = true;
            enableButtons(node);
            alert("Confirmation failed: " + error.message);
        });
}


// ============================================================
//  Modal Queue System
//  Serial modal display: one modal at a time, queued FIFO
// ============================================================

let modalQueue = [];
let activeModalData = null;
let modalOverlay = null;
let modalCard = null;
let modalBody = null;
let modalTitle = null;
let modalContinueBtn = null;
let modalCancelBtn = null;
let modalLocateBtn = null;
let modalInputContainer = null;


function ensureModalDOM() {
    if (modalOverlay) return;

    modalOverlay = document.createElement("div");
    modalOverlay.id = "bridge-modal-overlay";
    modalOverlay.className = "bridge-modal-overlay";
    modalOverlay.style.display = "none";

    modalCard = document.createElement("div");
    modalCard.className = "bridge-modal-card";

    const header = document.createElement("div");
    header.className = "bridge-modal-header";
    modalTitle = document.createElement("span");
    modalTitle.className = "bridge-modal-title";
    header.appendChild(modalTitle);

    modalBody = document.createElement("div");
    modalBody.className = "bridge-modal-body";

    modalInputContainer = document.createElement("div");
    modalInputContainer.className = "bridge-modal-input-container";
    modalBody.appendChild(modalInputContainer);

    const footer = document.createElement("div");
    footer.className = "bridge-modal-footer";

    modalContinueBtn = document.createElement("button");
    modalContinueBtn.className = "bridge-modal-btn bridge-modal-btn-continue";
    modalContinueBtn.textContent = "Continue";

    modalCancelBtn = document.createElement("button");
    modalCancelBtn.className = "bridge-modal-btn bridge-modal-btn-cancel";
    modalCancelBtn.textContent = "Cancel";

    modalLocateBtn = document.createElement("button");
    modalLocateBtn.className = "bridge-modal-btn bridge-modal-btn-locate";
    modalLocateBtn.textContent = "Close and Navigate";

    footer.appendChild(modalContinueBtn);
    footer.appendChild(modalCancelBtn);
    footer.appendChild(modalLocateBtn);

    modalCard.appendChild(header);
    modalCard.appendChild(modalBody);
    modalCard.appendChild(footer);
    modalOverlay.appendChild(modalCard);

    document.body.appendChild(modalOverlay);
}


function enqueueModal(modalData) {
    modalQueue.push(modalData);
    if (!activeModalData) {
        _showNextModal();
    }
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


function _navigateToNode(targetNode) {
    if (!targetNode || !app.canvas) return;

    const targetGraph = targetNode.graph;
    if (!targetGraph) return;

    // Already in the right graph — just center
    if (app.canvas.graph === targetGraph) {
        app.canvas.centerOnNode(targetNode);
        return;
    }

    // Find path from root to target graph
    const path = _findPathToGraph(targetGraph, app.graph);
    if (!path) return;

    // If path is empty but we're not in the target graph, navigate back to root first
    if (path.length === 0 && app.canvas.graph !== targetGraph) {
        app.canvas.openSubgraph(targetGraph);
        setTimeout(() => app.canvas.centerOnNode(targetNode), 50);
        return;
    }

    // Open subgraphs sequentially, then center
    let remaining = [...path];
    function openNext() {
        if (remaining.length === 0) {
            app.canvas.centerOnNode(targetNode);
            return;
        }
        const fromNode = remaining.shift();
        app.canvas.openSubgraph(fromNode.subgraph, fromNode);
        setTimeout(openNext, 50);
    }
    openNext();
}


function _showNextModal() {
    if (modalQueue.length === 0) {
        activeModalData = null;
        return;
    }

    ensureModalDOM();

    activeModalData = modalQueue.shift();

    const { title, type, inputConfig, onConfirm, onCancel, syncUrl, syncValueKey, nodeId } = activeModalData;

    modalTitle.textContent = title;
    modalInputContainer.innerHTML = "";

    modalCard.classList.remove("bridge-modal-card-wide");

    if (type === "bridge" && inputConfig) {
        if (inputConfig.inputType === "text") {
            modalCard.classList.add("bridge-modal-card-wide");
        }
        _renderBridgeInput(inputConfig, syncUrl, syncValueKey, nodeId);
    } else if (type === "pause") {
        const label = document.createElement("p");
        label.className = "bridge-modal-label";
        label.textContent = "Execution paused";
        modalInputContainer.appendChild(label);
    }

    modalContinueBtn.onclick = () => {
        let editedValue = undefined;
        if (type === "bridge" && inputConfig) {
            editedValue = _getEditedValue(inputConfig);
        }
        if (onConfirm) {
            onConfirm(editedValue);
        }
    };

    modalCancelBtn.onclick = () => {
        if (onCancel) {
            onCancel();
        }
    };

    modalLocateBtn.onclick = () => {
        const nodeRef = activeModalData?.nodeRef;
        modalOverlay.style.display = "none";
        modalContinueBtn.onclick = null;
        modalCancelBtn.onclick = null;
        modalLocateBtn.onclick = null;
        activeModalData = null;
        if (nodeRef) {
            _navigateToNode(nodeRef);
        }
    };

    modalContinueBtn.style.display = "inline-block";
    modalCancelBtn.style.display = "inline-block";
    modalLocateBtn.style.display = "inline-block";
    modalOverlay.style.display = "flex";
}


function _renderBridgeInput(inputConfig, syncUrl, syncValueKey, nodeId) {
    const { inputType, value, step } = inputConfig;

    const syncValue = () => {
        if (!syncUrl || !syncValueKey || !nodeId) return;
        const el = modalInputContainer.querySelector("[data-key='edited']");
        if (!el) return;
        let rawValue;
        if (inputType === "checkbox") {
            rawValue = el.checked;
        } else if (inputType === "number") {
            rawValue = el.valueAsNumber;
            if (isNaN(rawValue)) rawValue = 0;
        } else {
            rawValue = el.value;
        }
        api.fetchApi(syncUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ node_id: nodeId, [syncValueKey]: rawValue }),
        }).catch((e) => console.error(`[BRIDGE SYNC] error:`, e));
    };

    if (inputType === "checkbox") {
        const label = document.createElement("label");
        label.className = "bridge-modal-checkbox-label";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "bridge-modal-checkbox";
        checkbox.checked = !!value;
        checkbox.dataset.key = "edited";

        const span = document.createElement("span");
        span.textContent = value ? "True" : "False";

        checkbox.addEventListener("change", () => {
            span.textContent = checkbox.checked ? "True" : "False";
            syncValue();
        });

        label.appendChild(checkbox);
        label.appendChild(span);
        modalInputContainer.appendChild(label);
    } else if (inputType === "number") {
        const label = document.createElement("label");
        label.className = "bridge-modal-input-label";
        label.textContent = "Value:";

        const input = document.createElement("input");
        input.type = "number";
        input.className = "bridge-modal-input";
        input.value = value;
        input.dataset.key = "edited";
        if (step !== undefined) input.step = step;
        input.addEventListener("input", syncValue);

        label.appendChild(input);
        modalInputContainer.appendChild(label);
    } else if (inputType === "text") {
        const label = document.createElement("label");
        label.className = "bridge-modal-input-label";
        label.textContent = "Text:";

        const textarea = document.createElement("textarea");
        textarea.className = "bridge-modal-input bridge-modal-textarea";
        textarea.value = value;
        textarea.dataset.key = "edited";
        textarea.rows = 12;
        textarea.addEventListener("input", syncValue);

        label.appendChild(textarea);
        modalInputContainer.appendChild(label);
    }
}


function _getEditedValue(inputConfig) {
    const { inputType } = inputConfig;
    const el = modalInputContainer.querySelector("[data-key='edited']");
    if (!el) return undefined;

    if (inputType === "checkbox") {
        return el.checked;
    } else if (inputType === "number") {
        const v = parseFloat(el.value);
        return isNaN(v) ? 0 : v;
    } else {
        return el.value;
    }
}


function isNodeInCurrentView(node) {
    if (!node || !app.canvas?.graph) return true;
    return node.graph === app.canvas.graph;
}


function shouldShowModal(node) {
    if (!app.extensionManager.setting.get("rb.bridge.show_dialog")) return false;
    if (app.extensionManager.setting.get("rb.bridge.show_dialog_only_when_out_of_view")) {
        return !isNodeInCurrentView(node);
    }
    return true;
}


export function showPauseModal(node, title, onContinue, onCancel) {
    if (!shouldShowModal(node)) return;
    const nodeId = node ? (node._execution_id || String(node.id)) : "unknown";
    enqueueModal({
        title: title || "RB Pause",
        type: "pause",
        nodeId: nodeId,
        nodeRef: node,
        onConfirm: onContinue,
        onCancel: onCancel,
    });
}


export function setupWidgetSync(node, editWidget, syncUrl, syncValueKey) {
    if (node._bridge_widget_synced) return;
    node._bridge_widget_synced = true;

    const doSync = () => {
        if (!node._bridge_active || node._bridge_sync_block) return;

        // Debounce: collapse rapid edits into one request
        if (node._bridge_sync_timer) {
            clearTimeout(node._bridge_sync_timer);
        }
        node._bridge_sync_timer = setTimeout(() => {
            node._bridge_sync_timer = null;
            const nodeId = node._execution_id || String(node.id);
            api.fetchApi(syncUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ node_id: nodeId, [syncValueKey]: editWidget.value }),
            }).catch((e) => console.error(`[BRIDGE SYNC] error:`, e));
        }, 300);
    };

    // Wrap widget.callback to sync on every user edit
    const origCallback = editWidget.callback;
    editWidget.callback = function (...args) {
        if (origCallback) {
            origCallback.apply(this, args);
        }
        doSync();
    };
}


export function showBridgeModal(node, title, inputConfig, onConfirm, onCancel, syncUrl, syncValueKey) {
    if (!shouldShowModal(node)) return;
    const nodeId = node ? (node._execution_id || String(node.id)) : "unknown";
    enqueueModal({
        title: title || "RB Bridge",
        type: "bridge",
        nodeId: nodeId,
        nodeRef: node,
        inputConfig: inputConfig,
        onConfirm: onConfirm,
        onCancel: onCancel,
        syncUrl: syncUrl,
        syncValueKey: syncValueKey,
    });
}


export function getActiveModalEditedValue() {
    if (!activeModalData || activeModalData.type !== "bridge" || !activeModalData.inputConfig) {
        return undefined;
    }
    return _getEditedValue(activeModalData.inputConfig);
}


export function closeCurrentModal(nodeId) {
    if (!modalOverlay) return;

    if (nodeId !== undefined && activeModalData && activeModalData.nodeId !== nodeId) {
        return;
    }

    modalOverlay.style.display = "none";
    modalContinueBtn.onclick = null;
    modalCancelBtn.onclick = null;
    modalLocateBtn.onclick = null;
    activeModalData = null;

    _showNextModal();
}


export function clearModalQueue() {
    modalQueue = [];
    if (activeModalData) {
        closeCurrentModal();
    }
}


app.registerExtension({
    name: "comfyui.rb.Settings",
    settings: [
        {
            id: "rb.bridge.show_dialog",
            name: "Show Dialog on Pause/Bridge",
            type: "boolean",
            category: ["RB Bridge", "Dialog", "Show Dialog on Pause/Bridge"],
            defaultValue: true,
            tooltip: "When disabled, pause/bridge nodes only use the embedded node buttons, no centered popup dialog will appear.",
        },
        {
            id: "rb.bridge.show_dialog_only_when_out_of_view",
            name: "Show Dialog Only When Node Not in View",
            type: "boolean",
            category: ["RB Bridge", "Dialog", "Show Dialog Only When Node Not in View"],
            defaultValue: true,
            tooltip: "When enabled, the dialog only appears when the node is inside a sub-workflow and you have not navigated into it. If you are already viewing the node's graph, no dialog is shown.",
        },
    ],
});