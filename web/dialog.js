import { api } from "../../scripts/api.js";
import { navigateToNode } from "./utils.js";

let dialogQueue = [];
let activeDialog = null;
let dialogOverlay = null;
let dialogCard = null;
let dialogBody = null;
let dialogTitle = null;
let dialogContinueBtn = null;
let dialogCancelBtn = null;
let dialogLocateBtn = null;
let dialogInputContainer = null;


function ensureDialogDOM() {
    if (dialogOverlay) return;

    dialogOverlay = document.createElement("div");
    dialogOverlay.id = "rb-modal-overlay";
    dialogOverlay.className = "rb-modal-overlay";
    dialogOverlay.style.display = "none";

    dialogCard = document.createElement("div");
    dialogCard.className = "rb-modal-card";

    const header = document.createElement("div");
    header.className = "rb-modal-header";
    dialogTitle = document.createElement("span");
    dialogTitle.className = "rb-modal-title";
    header.appendChild(dialogTitle);

    dialogBody = document.createElement("div");
    dialogBody.className = "rb-modal-body";

    dialogInputContainer = document.createElement("div");
    dialogInputContainer.className = "rb-modal-input-container";
    dialogBody.appendChild(dialogInputContainer);

    const footer = document.createElement("div");
    footer.className = "rb-modal-footer";

    dialogContinueBtn = document.createElement("button");
    dialogContinueBtn.className = "rb-modal-btn rb-modal-btn-continue";
    dialogContinueBtn.textContent = "Continue";

    dialogCancelBtn = document.createElement("button");
    dialogCancelBtn.className = "rb-modal-btn rb-modal-btn-cancel";
    dialogCancelBtn.textContent = "Cancel";

    dialogLocateBtn = document.createElement("button");
    dialogLocateBtn.className = "rb-modal-btn rb-modal-btn-locate";
    dialogLocateBtn.textContent = "Close and Focus";

    footer.appendChild(dialogContinueBtn);
    footer.appendChild(dialogCancelBtn);
    footer.appendChild(dialogLocateBtn);

    dialogCard.appendChild(header);
    dialogCard.appendChild(dialogBody);
    dialogCard.appendChild(footer);
    dialogOverlay.appendChild(dialogCard);

    document.body.appendChild(dialogOverlay);
}


function enqueueDialog(dialogData) {
    dialogQueue.push(dialogData);
    if (!activeDialog) {
        showNextDialog();
    }
}


function showNextDialog() {
    if (dialogQueue.length === 0) {
        activeDialog = null;
        return;
    }

    ensureDialogDOM();

    activeDialog = dialogQueue.shift();

    const { title, type, inputConfig, onConfirm, onCancel, syncUrl, syncValueKey, nodeId } = activeDialog;

    dialogTitle.textContent = title;
    dialogInputContainer.innerHTML = "";

    dialogCard.classList.remove("rb-modal-card-wide");

    if (type === "bridge" && inputConfig) {
        if (inputConfig.inputType === "text") {
            dialogCard.classList.add("rb-modal-card-wide");
        }
        _renderInput(inputConfig, syncUrl, syncValueKey, nodeId);
    } else if (type === "pause") {
        const label = document.createElement("p");
        label.className = "rb-modal-label";
        label.textContent = "Execution paused";
        dialogInputContainer.appendChild(label);
    }

    dialogContinueBtn.onclick = () => {
        let editedValue = undefined;
        if (type === "bridge" && inputConfig) {
            editedValue = _getEditedValue(inputConfig);
        }
        if (onConfirm) {
            onConfirm(editedValue);
        }
    };

    dialogCancelBtn.onclick = () => {
        if (onCancel) {
            onCancel();
        }
    };

    dialogLocateBtn.onclick = () => {
        const nodeRef = activeDialog?.nodeRef;
        dialogOverlay.style.display = "none";
        dialogContinueBtn.onclick = null;
        dialogCancelBtn.onclick = null;
        dialogLocateBtn.onclick = null;
        activeDialog = null;
        if (nodeRef) {
            navigateToNode(nodeRef);
        }
    };

    dialogContinueBtn.style.display = "inline-block";
    dialogCancelBtn.style.display = "inline-block";
    dialogLocateBtn.style.display = "inline-block";
    dialogOverlay.style.display = "flex";
}


function _renderInput(inputConfig, syncUrl, syncValueKey, nodeId) {
    const { inputType, value, step } = inputConfig;

    const syncValue = () => {
        if (!syncUrl || !syncValueKey || !nodeId) return;
        const el = dialogInputContainer.querySelector("[data-key='edited']");
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
        }).catch((e) => console.error(`[RB SYNC] error:`, e));
    };

    if (inputType === "checkbox") {
        const label = document.createElement("label");
        label.className = "rb-modal-checkbox-label";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "rb-modal-checkbox";
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
        dialogInputContainer.appendChild(label);
    } else if (inputType === "number") {
        const label = document.createElement("label");
        label.className = "rb-modal-input-label";
        label.textContent = "Value:";

        const input = document.createElement("input");
        input.type = "number";
        input.className = "rb-modal-input";
        input.value = value;
        input.dataset.key = "edited";
        if (step !== undefined) input.step = step;
        input.addEventListener("input", syncValue);

        label.appendChild(input);
        dialogInputContainer.appendChild(label);
    } else if (inputType === "text") {
        const label = document.createElement("label");
        label.className = "rb-modal-input-label";
        label.textContent = "Text:";

        const textarea = document.createElement("textarea");
        textarea.className = "rb-modal-input rb-modal-textarea";
        textarea.value = value;
        textarea.dataset.key = "edited";
        textarea.rows = 12;
        textarea.addEventListener("input", syncValue);

        label.appendChild(textarea);
        dialogInputContainer.appendChild(label);
    }
}


function _getEditedValue(inputConfig) {
    const { inputType } = inputConfig;
    const el = dialogInputContainer.querySelector("[data-key='edited']");
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


export function showDialog(node, title, inputConfig, onConfirm, onCancel, syncUrl, syncValueKey) {
    const nodeId = node ? (node._execution_id || String(node.id)) : "unknown";
    const isPause = inputConfig === null;
    enqueueDialog({
        title: title || (isPause ? "RB Pause" : "RB Bridge"),
        type: isPause ? "pause" : "bridge",
        nodeId: nodeId,
        nodeRef: node,
        inputConfig: isPause ? null : inputConfig,
        onConfirm: onConfirm,
        onCancel: onCancel,
        syncUrl: isPause ? null : syncUrl,
        syncValueKey: isPause ? null : syncValueKey,
    });
}


export function closeCurrentDialog(nodeId) {
    if (!dialogOverlay) return;

    if (nodeId !== undefined && activeDialog && activeDialog.nodeId !== nodeId) {
        return;
    }

    dialogOverlay.style.display = "none";
    dialogContinueBtn.onclick = null;
    dialogCancelBtn.onclick = null;
    dialogLocateBtn.onclick = null;
    activeDialog = null;

    showNextDialog();
}


export function clearDialogQueue() {
    dialogQueue = [];
    if (activeDialog) {
        closeCurrentDialog();
    }
}