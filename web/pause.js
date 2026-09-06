import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import {
    enableButtons,
    disableButtons,
    getNode,
    createButtons,
    confirmBridge,
} from "./utils.js";


app.registerExtension({
    name: "comfyui.ribs.Pause",

    async setup() {
        api.addEventListener("pause_session", (event) => {
            const node = getNode(event.detail.node_id);
            if (!node) return;

            node._bridge_active = true;
            node._execution_id = event.detail.node_id;
            enableButtons(node);
        });

        api.addEventListener("pause_resume", (event) => {
            const node = getNode(event.detail.node_id);
            if (!node) return;

            node._bridge_active = false;
            disableButtons(node);
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "RB_Pause") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            this._bridge_active = false;

            createButtons(this, () => {
                confirmBridge(this, "/pause/confirm", null, null, null);
            });

            return result;
        };
    },
});