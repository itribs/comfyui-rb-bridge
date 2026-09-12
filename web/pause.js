import { createExtension } from "./factory.js";

createExtension({
    name: "comfyui.rb.Pause",
    typeName: "RB_Pause",
    sessionEvent: "pause_session",
    resumeEvent: "pause_resume",
    confirmUrl: "/pause/confirm",
    syncUrl: null,
    editWidgetName: null,
    confirmValueKey: null,
    detailValueKey: null,
    currentValueKey: null,
    defaultValue: null,
    inputConfigFactory: () => null,
    isPassthrough: true,
});