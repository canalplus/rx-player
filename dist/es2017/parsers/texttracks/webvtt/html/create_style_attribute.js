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
import objectValues from "../../../../utils/object_values";
/**
 * Construct a DOM attribute reflecting given cue settings
 * @param {Partial<Record<string, string>>} settings
 * @returns {Attr}
 */
export default function createStyleAttribute(settings) {
    const pAttr = document.createAttribute("style");
    pAttr.value = getAttrValue(settings);
    return pAttr;
}
const getAttrValue = (settings) => {
    const hasSettings = settings !== undefined && objectValues(settings).length !== 0;
    if (!hasSettings) {
        return "text-align:center";
    }
    const xPositioning = getPositioningX(settings);
    const yPositioning = getPositioningY(settings);
    return ("position: absolute;" +
        "margin: 0;" +
        `transform: translate(${xPositioning.offset}%,${yPositioning.offset}%);` +
        `width: ${getSizePercentage(settings.size)}%;` +
        `left: ${xPositioning.position}%;` +
        `top: ${yPositioning.position !== null ? `${yPositioning.position}%` : "auto"};` +
        `text-align: ${getAlignValue(settings.align)};`);
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
const getPositioningX = (settings) => {
    return {
        position: getXPositionPercentage(settings),
        offset: getXOffsetPercentage(settings),
    };
};
const getXPositionPercentage = (settings) => {
    const positionPercentage = getPercentageValue(settings.position);
    if (positionPercentage !== null) {
        return positionPercentage;
    }
    const align = getAlignValue(settings.align);
    const alignMap = {
        [Align.LEFT]: 0,
        [Align.CENTER]: 50,
        [Align.RIGHT]: 100,
    };
    return alignMap[align];
};
const getXOffsetPercentage = (settings) => {
    const getPositionAlignment = (positionSetting) => {
        const positionRegex = /,(line-left|line-right|center)/;
        const matches = positionRegex.exec(positionSetting);
        if (!Array.isArray(matches) || matches.length < 2) {
            return null;
        }
        return matches[1];
    };
    const positionAlignmentMap = {
        [PositionAlignment.LINE_LEFT]: 0,
        [PositionAlignment.CENTER]: -50,
        [PositionAlignment.LINE_RIGHT]: -100,
    };
    const positionAlignment = settings.position !== undefined ? getPositionAlignment(settings.position) : null;
    if (positionAlignment !== null) {
        return positionAlignmentMap[positionAlignment];
    }
    const alignMap = {
        [Align.LEFT]: 0,
        [Align.CENTER]: -50,
        [Align.RIGHT]: -100,
    };
    const align = settings.align !== undefined ? getAlignValue(settings.align) : Align.CENTER;
    return alignMap[align];
};
const getPositioningY = (settings) => {
    return {
        position: getYPositionPercentage(settings.line),
        offset: getYOffsetPercentage(settings.line),
    };
};
const getYPositionPercentage = (lineSetting) => {
    return getPercentageValue(lineSetting);
};
const getYOffsetPercentage = (lineSetting) => {
    const getLineAlignment = (line) => {
        const positionRegex = /,(start|center|end)/;
        const matches = positionRegex.exec(line);
        if (!Array.isArray(matches) || matches.length < 2) {
            return null;
        }
        return matches[1];
    };
    const lineAlignmentMap = {
        [LineAlignment.START]: 0,
        [LineAlignment.CENTER]: -50,
        [LineAlignment.END]: -100,
    };
    if (lineSetting === undefined) {
        return lineAlignmentMap[LineAlignment.START];
    }
    const lineAlignment = getLineAlignment(lineSetting);
    return lineAlignment !== null
        ? lineAlignmentMap[lineAlignment]
        : lineAlignmentMap[LineAlignment.START];
};
const getAlignValue = (alignSetting) => {
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
const getSizePercentage = (sizeSetting) => {
    const defaultSize = 100;
    return getPercentageValueOrDefault(sizeSetting, defaultSize);
};
const getPercentageValueOrDefault = (percentageString, defaultValue) => {
    const value = getPercentageValue(percentageString);
    return value !== null ? value : defaultValue;
};
const getPercentageValue = (percentageString) => {
    if (percentageString === undefined) {
        return null;
    }
    const percentageValueRegex = /^([\d.]+)%/;
    const matches = percentageValueRegex.exec(percentageString);
    if (!Array.isArray(matches) || matches.length < 2) {
        return null;
    }
    return parseInt(matches[1], 10);
};
