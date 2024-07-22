"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphCanvas = exports.createMetricTitle = exports.isExtendedMode = exports.createCompositeElement = exports.createElement = void 0;
function createElement(elementName, _a) {
    var _b = _a === void 0 ? {} : _a, textContent = _b.textContent, className = _b.className;
    var elt = document.createElement(elementName);
    if (className !== undefined) {
        elt.className = className;
    }
    if (textContent !== undefined) {
        elt.textContent = textContent;
    }
    return elt;
}
exports.createElement = createElement;
/**
 * Create an HTML element which may contain mutiple HTML sub-elements.
 * @param {string} rootElementName - The element's name, like `"div"` for
 * example.
 * @param {Array.<string|HTMLElement>} parts - The HTML sub-elements, in order.
 * Those can also just be strings, in which case only text nodes (and no actual
 * HTMLElement) will be added at this place.
 * @param {Object} [options={}] - Optional attributes for the element.
 * @param {string} [options.className] - Value for a `class` attribute
 * associated to this element.
 * @returns {HTMLElement}
 */
function createCompositeElement(rootElementName, parts, _a) {
    var e_1, _b;
    var _c = _a === void 0 ? {} : _a, className = _c.className;
    var elt = document.createElement(rootElementName);
    if (className !== undefined) {
        elt.className = className;
    }
    try {
        for (var parts_1 = __values(parts), parts_1_1 = parts_1.next(); !parts_1_1.done; parts_1_1 = parts_1.next()) {
            var subElt = parts_1_1.value;
            if (typeof subElt === "string") {
                elt.appendChild(document.createTextNode(subElt));
            }
            else {
                elt.appendChild(subElt);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (parts_1_1 && !parts_1_1.done && (_b = parts_1.return)) _b.call(parts_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return elt;
}
exports.createCompositeElement = createCompositeElement;
function isExtendedMode(parentElt) {
    return parentElt.clientHeight > 400;
}
exports.isExtendedMode = isExtendedMode;
function createMetricTitle(title) {
    var elt = createElement("span", {
        textContent: title + "/",
    });
    elt.style.fontWeight = "bold";
    return elt;
}
exports.createMetricTitle = createMetricTitle;
function createGraphCanvas() {
    var canvasElt = createElement("canvas");
    canvasElt.style.border = "1px solid white";
    canvasElt.style.height = "15px";
    canvasElt.style.marginLeft = "2px";
    return canvasElt;
}
exports.createGraphCanvas = createGraphCanvas;
