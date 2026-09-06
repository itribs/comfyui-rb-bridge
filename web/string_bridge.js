import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import {
    createButtons,
    enableButtons,
    getNode,
    confirmBridge,
} from "./utils.js";


app.registerExtension({
    name: "comfyui.rb.StringBridge",

    async setup() {
        api.addEventListener("string_bridge_session", (event) => {
            const { node_id, text } = event.detail;
            const node = getNode(node_id);
            if (!node) return;

            node._bridge_active = true;
            node._execution_id = node_id;
            node.current_text = text;

            const textWidget = node.widgets.find((w) => w.name === "text_edit");
            if (textWidget && text !== undefined) {
                textWidget.value = text;
                app.graph.setDirtyCanvas(true);
            }

            enableButtons(node);
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