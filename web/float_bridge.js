import { createExtension } from "./factory.js";

createExtension({
    name: "comfyui.rb.FloatBridge",
    typeName: "RB_FloatBridge",
    sessionEvent: "float_bridge_session",
    resumeEvent: "float_bridge_resume",
    confirmUrl: "/float_bridge/confirm",
    syncUrl: "/float_bridge/sync",
    editWidgetName: "value_edit",
    confirmValueKey: "edited_value",
    detailValueKey: "value",
    currentValueKey: "current_value",
    defaultValue: 0.0,
    inputConfigFactory: (value) => ({ inputType: "number", value, step: 0.00001 }),
});