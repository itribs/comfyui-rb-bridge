import { createExtension } from "./factory.js";

createExtension({
    name: "comfyui.rb.IntBridge",
    typeName: "RB_IntBridge",
    sessionEvent: "int_bridge_session",
    resumeEvent: "int_bridge_resume",
    confirmUrl: "/int_bridge/confirm",
    syncUrl: "/int_bridge/sync",
    editWidgetName: "value_edit",
    confirmValueKey: "edited_value",
    detailValueKey: "value",
    currentValueKey: "current_value",
    defaultValue: 0,
    inputConfigFactory: (value) => ({ inputType: "number", value, step: 1 }),
});