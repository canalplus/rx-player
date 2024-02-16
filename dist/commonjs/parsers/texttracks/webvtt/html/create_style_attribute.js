"use strict";
/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var object_values_1 = require("../../../../utils/object_values");
/**
 * Construct a DOM attribute reflecting given cue settings
 * @param {Partial<Record<string, string>>} settings
 * @returns {Attr}
 */
function createStyleAttribute(settings) {
    var pAttr = document.createAttribute("style");
    pAttr.value = getAttrValue(settings);
    return pAttr;
}
exports.default = createStyleAttribute;
var getAttrValue = function (settings) {
    var hasSettings = settings !== undefined && (0, object_values_1.default)(settings).length !== 0;
    if (!hasSettings) {
        return "text-align:center";
    }
    var xPositioning = getPositioningX(settings);
    var yPositioning = getPositioningY(settings);
    return ("position: absolute;" +
        "margin: 0;" +
        "transform: translate(".concat(xPositioning.offset, "%,").concat(yPositioning.offset, "%);") +
        "width: ".concat(getSizePercentage(settings.size), "%;") +
        "left: ".concat(xPositioning.position, "%;") +
        "top: ".concat(yPositioning.position !== null ? "".concat(yPositioning.position, "%") : "auto", ";") +
        "text-align: ".concat(getAlignValue(settings.align), ";"));
};
var PositionAlignment;
(function (PositionAlignment) {
    PositionAlignment["LINE_LEFT"] = "line-left";
    PositionAlignment["CENTER"] = "center";
    PositionAlignment["LINE_RIGHT"] = "line-right";
})(PositionAlignment || (PositionAlignment = {}));
var Align;
(function (Align) {
    Align["LEFT"] = "left";
    Align["CENTER"] = "center";
    Align["RIGHT"] = "right";
})(Align || (Align = {}));
var LineAlignment;
(function (LineAlignment) {
    LineAlignment["START"] = "start";
    LineAlignment["CENTER"] = "center";
    LineAlignment["END"] = "end";
})(LineAlignment || (LineAlignment = {}));
var getPositioningX = function (settings) {
    return {
        position: getXPositionPercentage(settings),
        offset: getXOffsetPercentage(settings),
    };
};
var getXPositionPercentage = function (settings) {
    var _a;
    var positionPercentage = getPercentageValue(settings.position);
    if (positionPercentage !== null) {
        return positionPercentage;
    }
    var align = getAlignValue(settings.align);
    var alignMap = (_a = {},
        _a[Align.LEFT] = 0,
        _a[Align.CENTER] = 50,
        _a[Align.RIGHT] = 100,
        _a);
    return alignMap[align];
};
var getXOffsetPercentage = function (settings) {
    var _a, _b;
    var getPositionAlignment = function (positionSetting) {
        var positionRegex = /,(line-left|line-right|center)/;
        var matches = positionRegex.exec(positionSetting);
        if (!Array.isArray(matches) || matches.length < 2) {
            return null;
        }
        return matches[1];
    };
    var positionAlignmentMap = (_a = {},
        _a[PositionAlignment.LINE_LEFT] = 0,
        _a[PositionAlignment.CENTER] = -50,
        _a[PositionAlignment.LINE_RIGHT] = -100,
        _a);
    var positionAlignment = settings.position !== undefined ? getPositionAlignment(settings.position) : null;
    if (positionAlignment !== null) {
        return positionAlignmentMap[positionAlignment];
    }
    var alignMap = (_b = {},
        _b[Align.LEFT] = 0,
        _b[Align.CENTER] = -50,
        _b[Align.RIGHT] = -100,
        _b);
    var align = settings.align !== undefined ? getAlignValue(settings.align) : Align.CENTER;
    return alignMap[align];
};
var getPositioningY = function (settings) {
    return {
        position: getYPositionPercentage(settings.line),
        offset: getYOffsetPercentage(settings.line),
    };
};
var getYPositionPercentage = function (lineSetting) {
    return getPercentageValue(lineSetting);
};
var getYOffsetPercentage = function (lineSetting) {
    var _a;
    var getLineAlignment = function (line) {
        var positionRegex = /,(start|center|end)/;
        var matches = positionRegex.exec(line);
        if (!Array.isArray(matches) || matches.length < 2) {
            return null;
        }
        return matches[1];
    };
    var lineAlignmentMap = (_a = {},
        _a[LineAlignment.START] = 0,
        _a[LineAlignment.CENTER] = -50,
        _a[LineAlignment.END] = -100,
        _a);
    if (lineSetting === undefined) {
        return lineAlignmentMap[LineAlignment.START];
    }
    var lineAlignment = getLineAlignment(lineSetting);
    return lineAlignment !== null
        ? lineAlignmentMap[lineAlignment]
        : lineAlignmentMap[LineAlignment.START];
};
var getAlignValue = function (alignSetting) {
    switch (alignSetting) {
        case "left":
        case "start":
            return "left";
        case "right":
        case "end":
            return "right";
        default:
            return "center";
    }
};
var getSizePercentage = function (sizeSetting) {
    var defaultSize = 100;
    return getPercentageValueOrDefault(sizeSetting, defaultSize);
};
var getPercentageValueOrDefault = function (percentageString, defaultValue) {
    var value = getPercentageValue(percentageString);
    return value !== null ? value : defaultValue;
};
var getPercentageValue = function (percentageString) {
    if (percentageString === undefined) {
        return null;
    }
    var percentageValueRegex = /^([\d.]+)%/;
    var matches = percentageValueRegex.exec(percentageString);
    if (!Array.isArray(matches) || matches.length < 2) {
        return null;
    }
    return parseInt(matches[1], 10);
};
