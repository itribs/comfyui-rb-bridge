import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { enableButtons, disableButtons, getNode, setupWidgetSync, createButtons, confirm, handleAction } from "./utils.js";
import { closeCurrentDialog, clearDialogQueue, showDialog } from "./dialog.js";


export function createConfirmCallback(node, { confirmUrl, editWidgetName, confirmValueKey }) {
    return (editedValue) => {
        disableButtons(node);
        node._edit_original = undefined;
        node._confirmed_value = editedValue;
        const editWidget = node.widgets.find((w) => w.name === editWidgetName);
        if (editWidget) editWidget.value = editedValue;
        const body = {
            node_id: node._execution_id || String(node.id),
            [confirmValueKey]: editedValue,
        };
        api.fetchApi(confirmUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then((r) => {
            if (r.ok) {
                node._session_active = false;
                closeCurrentDialog();
            } else {
                node._session_active = true;
                enableButtons(node);
                alert("Confirmation failed, please try again.");
            }
        }).catch((err) => {
            node._session_active = true;
            enableButtons(node);
            alert("Confirmation failed: " + err.message);
        });
    };
}


export function handleResume(node, editWidgetName) {
    node._session_active = false;
    disableButtons(node);

    const editedValue = node._confirmed_value;
    delete node._confirmed_value;
    if (editedValue !== undefined) {
        const editWidget = node.widgets.find((w) => w.name === editWidgetName);
        if (editWidget) {
            editWidget.value = editedValue;
            app.graph.setDirtyCanvas(true);
        }
    }

    if (node._cancelled && node._edit_original !== undefined) {
        const editWidget = node.widgets.find((w) => w.name === editWidgetName);
        if (editWidget) {
            editWidget.value = node._edit_original;
            app.graph.setDirtyCanvas(true);
        }
    }
    node._edit_original = undefined;
    node._cancelled = false;
}


export function createExtension(config) {
    const {
        name,
        typeName,
        sessionEvent,
        resumeEvent,
        confirmUrl,
        syncUrl,
        editWidgetName,
        confirmValueKey,
        detailValueKey,
        currentValueKey,
        defaultValue,
        inputConfigFactory,
        isPassthrough,
    } = config;

    app.registerExtension({
        name,
        async setup() {
            api.addEventListener(sessionEvent, (event) => {
                const { node_id } = event.detail;
                const node = getNode(node_id);
                if (!node) return;

                let editValue;
                if (!isPassthrough) {
                    editValue = event.detail[detailValueKey];
                    const passthrough = event.detail.passthrough;
                    node[currentValueKey] = editValue;

                    const editWidget = node.widgets.find((w) => w.name === editWidgetName);
                    if (editWidget && editValue !== undefined) {
                        setupWidgetSync(node, editWidget, syncUrl, confirmValueKey);
                        node._sync_block = true;
                        node._edit_original = editWidget.value;
                        editWidget.value = editValue;
                        node._sync_block = false;
                        app.graph.setDirtyCanvas(true);
                    }

                    if (passthrough) return;
                }

                node._session_active = true;
                node._execution_id = node_id;
                enableButtons(node);

                const onConfirm = isPassthrough
                    ? () => {
                        closeCurrentDialog();
                        confirm(node, confirmUrl, null, null, null);
                    }
                    : createConfirmCallback(node, { confirmUrl, editWidgetName, confirmValueKey });

                handleAction(
                    node,
                    node.title,
                    isPassthrough ? null : inputConfigFactory(editValue),
                    onConfirm,
                    () => {
                        node._session_active = false;
                        node._cancelled = true;
                        disableButtons(node);
                        clearDialogQueue();
                        app.api.interrupt(null);
                    },
                    isPassthrough ? null : syncUrl,
                    isPassthrough ? null : confirmValueKey,
                    showDialog,
                );
            });

            api.addEventListener(resumeEvent, (event) => {
                const { node_id } = event.detail;
                const node = getNode(node_id);
                if (node) {
                    if (isPassthrough) {
                        node._session_active = false;
                        disableButtons(node);
                    } else {
                        handleResume(node, editWidgetName);
                    }
                }
                closeCurrentDialog(node_id);
            });
        },

        async beforeRegisterNodeDef(nodeType, nodeData, app) {
            if (nodeData.name !== typeName) return;

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const result = onNodeCreated?.apply(this, arguments);
                if (!isPassthrough) {
                    this[currentValueKey] = defaultValue;
                }
                createButtons(this, () => {
                    confirm(this, confirmUrl,
                        isPassthrough ? null : editWidgetName,
                        isPassthrough ? null : confirmValueKey,
                        isPassthrough ? null : this[currentValueKey]);
                }, () => {
                    this._session_active = false;
                    this._cancelled = true;
                    disableButtons(this);
                    clearDialogQueue();
                    app.api.interrupt(null);
                });
                return result;
            };
        },
    });
}