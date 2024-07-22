"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Update size of element which are proportional to the current text track
 * element.
 * Returns `true` if at least a single styling information is proportional,
 * `false` otherwise.
 * @param {number} currentHeight
 * @param {number} currentWidth
 * @param {Object} resolution
 * @param {HTMLElement} textTrackElement
 * @returns {boolean}
 */
function updateProportionalElements(currentHeight, currentWidth, resolution, textTrackElement) {
    var cellUnit = [currentWidth / resolution.columns, currentHeight / resolution.rows];
    var proportElts = textTrackElement.getElementsByClassName("proportional-style");
    for (var eltIdx = 0; eltIdx < proportElts.length; eltIdx++) {
        var elt = proportElts[eltIdx];
        if (elt instanceof HTMLElement) {
            var fontSizeVal = elt.getAttribute("data-proportional-font-size");
            if (fontSizeVal !== null && !isNaN(+fontSizeVal)) {
                elt.style.fontSize = String(+fontSizeVal * cellUnit[1]) + "px";
            }
            var widthVal = elt.getAttribute("data-proportional-width");
            if (widthVal !== null && !isNaN(+widthVal)) {
                elt.style.width = String(+widthVal * cellUnit[0]) + "px";
            }
            var heightVal = elt.getAttribute("data-proportional-height");
            if (heightVal !== null && !isNaN(+heightVal)) {
                elt.style.height = String(+heightVal * cellUnit[1]) + "px";
            }
            var lineHeightVal = elt.getAttribute("data-proportional-line-height");
            if (lineHeightVal !== null && !isNaN(+lineHeightVal)) {
                elt.style.lineHeight = String(+lineHeightVal * cellUnit[1]) + "px";
            }
            var leftVal = elt.getAttribute("data-proportional-left");
            if (leftVal !== null && !isNaN(+leftVal)) {
                elt.style.left = String(+leftVal * cellUnit[0]) + "px";
            }
            var topVal = elt.getAttribute("data-proportional-top");
            if (topVal !== null && !isNaN(+topVal)) {
                elt.style.top = String(+topVal * cellUnit[1]) + "px";
            }
            var paddingTopVal = elt.getAttribute("data-proportional-padding-top");
            if (paddingTopVal !== null && !isNaN(+paddingTopVal)) {
                elt.style.paddingTop = String(+paddingTopVal * cellUnit[1]) + "px";
            }
            var paddingBottomVal = elt.getAttribute("data-proportional-padding-bottom");
            if (paddingBottomVal !== null && !isNaN(+paddingBottomVal)) {
                elt.style.paddingBottom = String(+paddingBottomVal * cellUnit[1]) + "px";
            }
            var paddingLeftVal = elt.getAttribute("data-proportional-padding-left");
            if (paddingLeftVal !== null && !isNaN(+paddingLeftVal)) {
                elt.style.paddingLeft = String(+paddingLeftVal * cellUnit[0]) + "px";
            }
            var paddingRightVal = elt.getAttribute("data-proportional-padding-right");
            if (paddingRightVal !== null && !isNaN(+paddingRightVal)) {
                elt.style.paddingRight = String(+paddingRightVal * cellUnit[0]) + "px";
            }
        }
    }
    return proportElts.length > 0;
}
exports.default = updateProportionalElements;
