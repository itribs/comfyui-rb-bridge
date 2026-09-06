import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import {
    createButtons,
    enableButtons,
    disableButtons,
    getNode,
    confirmBridge,
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
                textWidget.value = text;
                app.graph.setDirtyCanvas(true);
            }

            if (!passthrough) {
                node._bridge_active = true;
                node._execution_id = node_id;
                enableButtons(node);
            }
        });

        api.addEventListener("string_bridge_resume", (event) => {
            const { node_id } = event.detail;
            const node = getNode(node_id);
            if (!node) return;
            node._bridge_active = false;
            disableButtons(node);
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