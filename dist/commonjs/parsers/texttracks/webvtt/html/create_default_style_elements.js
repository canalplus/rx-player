"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Creates default classes defined in the W3 specification
 *
 * https://www.w3.org/TR/webvtt1/#default-classes
 */
var colorMap = {
    white: "#ffffff",
    lime: "#00ff00",
    cyan: "#00ffff",
    red: "#ff0000",
    yellow: "#ffff00",
    magenta: "#ff00ff",
    blue: "#0000ff",
    black: "#000000",
};
function createDefaultStyleElements() {
    return Object.keys(colorMap).reduce(function (result, key) {
        result[key] = "color: ".concat(colorMap[key], ";");
        result["bg_".concat(key)] = "background-color: ".concat(colorMap[key], ";");
        return result;
    }, {});
}
exports.default = createDefaultStyleElements;
