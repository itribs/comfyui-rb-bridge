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
    name: "comfyui.rb.StringBridge",

    async setup() {
        api.addEventListener("string_bridge_session", (event) => {
            const { node_id, text, passthrough } = event.detail;
            const node = getNode(node_id);
            if (!node) return;

            node.current_text = text;

            const textWidget = node.widgets.find((w) => w.name === "text_edit");
            if (textWidget && text !== undefined) {
                setupWidgetSync(node, textWidget, "/string_bridge/sync", "edited_text");
                node._bridge_sync_block = true;
                node._edit_original = textWidget.value;
                textWidget.value = text;
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
                    { inputType: "text", value: text },
                    (editedValue) => {
                        disableButtons(node);
                        node._edit_original = undefined;
                        const textWidget = node.widgets.find((w) => w.name === "text_edit");
                        if (textWidget) textWidget.value = editedValue;
                        const body = {
                            node_id: node._execution_id || String(node.id),
                            edited_text: editedValue,
                        };
                        api.fetchApi("/string_bridge/confirm", {
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
                    "/string_bridge/sync",
                    "edited_text"
                );
            }
        });

        api.addEventListener("string_bridge_resume", (event) => {
            const { node_id } = event.detail;
            const node = getNode(node_id);
            if (node) {
                node._bridge_active = false;
                disableButtons(node);

                const editedValue = getActiveModalEditedValue();
                if (editedValue !== undefined) {
                    const textWidget = node.widgets.find((w) => w.name === "text_edit");
                    if (textWidget) {
                        textWidget.value = editedValue;
                        app.graph.setDirtyCanvas(true);
                    }
                }

                if (node._cancelled && node._edit_original !== undefined) {
                    const textWidget = node.widgets.find((w) => w.name === "text_edit");
                    if (textWidget) {
                        textWidget.value = node._edit_original;
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
        if (nodeData.name !== "RB_StringBridge") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            this.current_text = "";

            createButtons(this, () => {
                confirmBridge(this, "/string_bridge/confirm", "text_edit", "edited_text", this.current_text);
            });

            return result;
        };
    },
});