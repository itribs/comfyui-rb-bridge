import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import {
    enableButtons,
    getNode,
    createButtons,
    confirmBridge,
} from "./utils.js";


app.registerExtension({
    name: "comfyui.rb.IntBridge",

    async setup() {
        api.addEventListener("int_bridge_session", (event) => {
            const { node_id, value } = event.detail;
            const node = getNode(node_id);
            if (!node) return;

            node._bridge_active = true;
            node._execution_id = node_id;
            node.current_value = value;

            const editWidget = node.widgets.find((w) => w.name === "value_edit");
            if (editWidget && value !== undefined) {
                editWidget.value = value;
                app.graph.setDirtyCanvas(true);
            }

            enableButtons(node);
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "RB_IntBridge") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            this.current_value = 0;

            createButtons(this, () => {
                confirmBridge(this, "/int_bridge/confirm", "value_edit", "edited_value", this.current_value);
            });

            return result;
        };
    },
});