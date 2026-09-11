import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import {
    enableButtons,
    disableButtons,
    getNode,
    createButtons,
    confirmBridge,
    setupWidgetSync,
    showBridgeModal,
    closeCurrentModal,
    clearModalQueue,
    getActiveModalEditedValue,
} from "./utils.js";


app.registerExtension({
    name: "comfyui.rb.FloatBridge",

    async setup() {
        api.addEventListener("float_bridge_session", (event) => {
            const { node_id, value, passthrough } = event.detail;
            const node = getNode(node_id);
            if (!node) return;

            node.current_value = value;

            const editWidget = node.widgets.find((w) => w.name === "value_edit");
            if (editWidget && value !== undefined) {
                setupWidgetSync(node, editWidget, "/float_bridge/sync", "edited_value");
                node._bridge_sync_block = true;
                node._edit_original = editWidget.value;
                editWidget.value = value;
                node._bridge_sync_block = false;
                app.graph.setDirtyCanvas(true);
            }

            if (!passthrough) {
                node._bridge_active = true;
                node._execution_id = node_id;
                enableButtons(node);

                showBridgeModal(
                    node,
                    node.title,
                    { inputType: "number", value: value, step: 0.00001 },
                    (editedValue) => {
                        disableButtons(node);
                        node._edit_original = undefined;
                        const editWidget = node.widgets.find((w) => w.name === "value_edit");
                        if (editWidget) editWidget.value = editedValue;
                        const body = {
                            node_id: node._execution_id || String(node.id),
                            edited_value: editedValue,
                        };
                        api.fetchApi("/float_bridge/confirm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body),
                        }).then((r) => {
                            if (r.ok) {
                                node._bridge_active = false;
                                closeCurrentModal();
                            } else {
                                node._bridge_active = true;
                                enableButtons(node);
                                alert("Confirmation failed, please try again.");
                            }
                        }).catch((err) => {
                            node._bridge_active = true;
                            enableButtons(node);
                            alert("Confirmation failed: " + err.message);
                        });
                    },
                    () => {
                        node._bridge_active = false;
                        node._cancelled = true;
                        disableButtons(node);
                        clearModalQueue();
                        api.interrupt(null);
                    },
                    "/float_bridge/sync",
                    "edited_value"
                );
            }
        });

        api.addEventListener("float_bridge_resume", (event) => {
            const { node_id } = event.detail;
            const node = getNode(node_id);
            if (node) {
                node._bridge_active = false;
                disableButtons(node);

                const editedValue = getActiveModalEditedValue();
                if (editedValue !== undefined) {
                    const editWidget = node.widgets.find((w) => w.name === "value_edit");
                    if (editWidget) {
                        editWidget.value = editedValue;
                        app.graph.setDirtyCanvas(true);
                    }
                }

                if (node._cancelled && node._edit_original !== undefined) {
                    const editWidget = node.widgets.find((w) => w.name === "value_edit");
                    if (editWidget) {
                        editWidget.value = node._edit_original;
                        app.graph.setDirtyCanvas(true);
                    }
                }
                node._edit_original = undefined;
                node._cancelled = false;
            }
            closeCurrentModal(node_id);
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "RB_FloatBridge") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            this.current_value = 0.0;

            createButtons(this, () => {
                confirmBridge(this, "/float_bridge/confirm", "value_edit", "edited_value", this.current_value);
            });

            return result;
        };
    },
});