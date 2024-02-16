"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var buffer_size_graph_1 = require("../buffer_size_graph");
var constants_1 = require("../constants");
var utils_1 = require("../utils");
function createSegmentSinkSizeGraph(instance, parentElt, cancelSignal) {
    var bufferSizeGraphWrapperElt = (0, utils_1.createElement)("div");
    var bufferSizeTitle = (0, utils_1.createMetricTitle)("bgap");
    var canvasElt = (0, utils_1.createGraphCanvas)();
    var bufferSizeGraph = new buffer_size_graph_1.default(canvasElt);
    var intervalId = setInterval(addBufferSize, constants_1.DEFAULT_REFRESH_INTERVAL);
    cancelSignal.register(function () {
        clearInterval(intervalId);
    });
    bufferSizeGraphWrapperElt.appendChild(bufferSizeTitle);
    bufferSizeGraphWrapperElt.appendChild(canvasElt);
    bufferSizeGraphWrapperElt.style.padding = "7px 0px";
    addBufferSize();
    return bufferSizeGraphWrapperElt;
    function addBufferSize() {
        if (instance.getVideoElement() === null) {
            // disposed player. Clean-up everything
            bufferSizeGraphWrapperElt.innerHTML = "";
            clearInterval(intervalId);
            return;
        }
        var bufferGap = instance.getCurrentBufferGap();
        if (bufferGap === Infinity) {
            bufferSizeGraph.pushBufferSize(0);
        }
        else {
            bufferSizeGraph.pushBufferSize(bufferGap);
        }
        var width = Math.min(parentElt.clientWidth - 150, 600);
        bufferSizeGraph.reRender(width, 10);
    }
}
exports.default = createSegmentSinkSizeGraph;
