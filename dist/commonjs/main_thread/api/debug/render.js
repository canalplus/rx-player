"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var general_info_1 = require("./modules/general_info");
var segment_buffer_content_1 = require("./modules/segment_buffer_content");
var segment_buffer_size_1 = require("./modules/segment_buffer_size");
var utils_1 = require("./utils");
function renderDebugElement(parentElt, instance, cancelSignal) {
    var debugElementTitleElt = (0, utils_1.createElement)("div", {
        textContent: "RxPlayer Debug Information",
    });
    debugElementTitleElt.style.fontWeight = "bold";
    debugElementTitleElt.style.borderBottom = "1px solid white";
    debugElementTitleElt.style.marginBottom = "5px";
    debugElementTitleElt.style.fontStyle = "italic";
    var debugWrapperElt = (0, utils_1.createCompositeElement)("div", [
        debugElementTitleElt,
        (0, general_info_1.default)(instance, parentElt, cancelSignal),
        (0, segment_buffer_content_1.default)(instance, "video", "vbuf", parentElt, cancelSignal),
        (0, segment_buffer_content_1.default)(instance, "audio", "abuf", parentElt, cancelSignal),
        (0, segment_buffer_content_1.default)(instance, "text", "tbuf", parentElt, cancelSignal),
        (0, segment_buffer_size_1.default)(instance, parentElt, cancelSignal),
    ]);
    debugWrapperElt.style.backgroundColor = "#00000099";
    debugWrapperElt.style.padding = "7px";
    debugWrapperElt.style.fontSize = "13px";
    debugWrapperElt.style.fontFamily = "mono, monospace";
    debugWrapperElt.style.color = "white";
    debugWrapperElt.style.display = "inline-block";
    debugWrapperElt.style.bottom = "0px";
    parentElt.appendChild(debugWrapperElt);
    cancelSignal.register(function () {
        parentElt.removeChild(debugWrapperElt);
    });
}
exports.default = renderDebugElement;
