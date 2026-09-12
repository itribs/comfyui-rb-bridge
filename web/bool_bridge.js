import { createExtension } from "./factory.js";

createExtension({
    name: "comfyui.rb.BoolBridge",
    typeName: "RB_BoolBridge",
    sessionEvent: "bool_bridge_session",
    resumeEvent: "bool_bridge_resume",
    confirmUrl: "/bool_bridge/confirm",
    syncUrl: "/bool_bridge/sync",
    editWidgetName: "value_edit",
    confirmValueKey: "edited_value",
    detailValueKey: "value",
    currentValueKey: "current_value",
    defaultValue: false,
    inputConfigFactory: (value) => ({ inputType: "checkbox", value }),
});