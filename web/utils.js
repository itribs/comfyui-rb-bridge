import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";


export function setButtonState(button, enabled) {
    if (!button || !button.element) return;
    const el = button.element;
    el.disabled = !enabled;
    if (enabled) {
        el.style.opacity = "1";
        el.style.cursor = "pointer";
        el.style.background = "var(--primary-background)";
    } else {
        el.style.opacity = "0.4";
        el.style.cursor = "not-allowed";
        el.style.background = "var(--component-node-widget-background)";
    }
}


export function createButtons(node, onConfirm) {
    const continueButton = node.addWidget("button", "Continue", null, onConfirm);
    continueButton.serialize = false;
    setButtonState(continueButton, false);

    const cancelButton = node.addWidget("button", "Cancel", null, () => {
        app.api.interrupt(null);
    });
    cancelButton.serialize = false;
    setButtonState(cancelButton, false);

    return { continueButton, cancelButton };
}


export function enableButtons(node) {
    const continueBtn = node.widgets.find((w) => w.name === "continue");
    setButtonState(continueBtn, true);
    const cancelBtn = node.widgets.find((w) => w.name === "cancel");
    setButtonState(cancelBtn, true);
}


export function disableButtons(node) {
    const continueBtn = node.widgets.find((w) => w.name === "continue");
    setButtonState(continueBtn, false);
    const cancelBtn = node.widgets.find((w) => w.name === "cancel");
    setButtonState(cancelBtn, false);
}


export function getNode(nodeId) {
    return app.graph._nodes.find((n) => n.id == nodeId);
}


export function confirmBridge(node, apiUrl, editWidgetName, valueKey, defaultValue) {
    if (!node._bridge_active) return;

    const body = { node_id: String(node.id) };

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