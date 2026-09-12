import { createExtension } from "./factory.js";

createExtension({
    name: "comfyui.rb.StringBridge",
    typeName: "RB_StringBridge",
    sessionEvent: "string_bridge_session",
    resumeEvent: "string_bridge_resume",
    confirmUrl: "/string_bridge/confirm",
    syncUrl: "/string_bridge/sync",
    editWidgetName: "text_edit",
    confirmValueKey: "edited_text",
    detailValueKey: "text",
    currentValueKey: "current_text",
    defaultValue: "",
    inputConfigFactory: (value) => ({ inputType: "text", value }),
});