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
export default function createStyleAttribute (
  settings : Partial<Record<string, string>>
) : Attr {
  const pAttr = document.createAttribute("style");
  pAttr.value = getAttrValue(settings);
  return pAttr;
}

const getAttrValue = (settings: Partial<Record<string, string>>) => {
  const hasSettings = settings !== undefined && objectValues(settings).length !== 0;
  if (!hasSettings) {
    return "text-align:center";
  }

  return (
    "position: absolute;" +
    "margin: 0;" +
    `${getTransformStyle(settings)}` +
    `${getSizeStyle(settings.size)}` +
    `${getPositionStyle(settings)}` +
    `${getLineStyle(settings.line)}` +
    `${getAlignStyle(settings.align)}`
  );
};

enum PositionAlignment {
  LINE_LEFT = "line-left",
  CENTER = "center",
  LINE_RIGHT = "line-right",
}

enum Align {
  LEFT = "left",
  CENTER = "center",
  RIGHT = "right",
}

enum LineAlignment {
  START = "start",
  CENTER = "center",
  END = "end",
}

/**
 * Used to shift cue box origin in order to define
 * what the position and line values are relating to.
 */
const getTransformStyle = (settings: Partial<Record<string, string>>) => {
  return `transform: translate(${getTransformX(settings)}%,${getTransformY(settings.line)}%);`;
};

const getTransformX = (settings: Partial<Record<string, string>>) => {
  const positionAlignmentMap = {
    [PositionAlignment.LINE_LEFT]: 0,
    [PositionAlignment.CENTER]: -50,
    [PositionAlignment.LINE_RIGHT]: -100,
  };

  const positionAlignment = settings.position !== undefined ?
    getPositionAlignment(settings.position) :
    null;

  if (positionAlignment !== null) {
    return positionAlignmentMap[positionAlignment];
  }

  const alignMap = {
    [Align.LEFT]: 0,
    [Align.CENTER]: -50,
    [Align.RIGHT]: -100,
  };

  const align = settings.align !== undefined ?
    getAlign(settings.align)
    : Align.CENTER;

  return alignMap[align];
};

const getTransformY = (lineSetting: string | undefined) => {
  const lineAlignmentMap = {
    [LineAlignment.START]: 0,
    [LineAlignment.CENTER]: -50,
    [LineAlignment.END]: -100,
  };

  if (lineSetting === undefined) {
    return lineAlignmentMap[LineAlignment.START];
  }

  const lineAlignment = getLineAlignment(lineSetting);

  return lineAlignment !== null ?
    lineAlignmentMap[lineAlignment] :
    lineAlignmentMap[LineAlignment.START];
};

const getPositionAlignment = (positionSetting: string): PositionAlignment | null => {
  const positionRegex = /,(line-left|line-right|center)/;
  const matches = positionRegex.exec(positionSetting);

  if (!Array.isArray(matches) || matches.length < 2) {
    return null;
  }

  return matches[1] as PositionAlignment;
};

const getLineAlignment = (lineSetting: string): LineAlignment | null => {
  const positionRegex = /,(start|center|end)/;
  const matches = positionRegex.exec(lineSetting);

  if (!Array.isArray(matches) || matches.length < 2) {
    return null;
  }

  return matches[1] as LineAlignment;
};

const getSizeStyle = (sizeSetting: string | undefined) => {
  const defaultSize = 100;
  const size = getPercentageValueOrDefault(sizeSetting, defaultSize);
  return `width:${size}%;`;
};

const getPositionStyle = (settings: Partial<Record<string, string>>) => {
  const positionStyle = (value: number) => `left:${value}%;`;

  const position = getPercentageValue(settings.position);
  if (position !== null) {
    return positionStyle(position);
  }

  const align = getAlign(settings.align);
  const alignMap = {
    [Align.LEFT]: 0,
    [Align.CENTER]: 50,
    [Align.RIGHT]: 100,
  };

  return positionStyle(alignMap[align]);
};

const getAlignStyle = (alignSetting: string | undefined) => {
  return alignSetting !== undefined ?
    `text-align:${getAlign(alignSetting)};` :
    "";
};

const getAlign = (alignSetting: string | undefined): Align => {
  switch (alignSetting) {
    case "left":
    case "start":
      return "left" as Align;
    case "right":
    case "end":
      return "right" as Align;
    default:
      return "center" as Align;
  }
};

const getLineStyle = (lineSetting: string | undefined) => {
  if (lineSetting === undefined) {
    return "";
  }

  const line = getPercentageValue(lineSetting);
  return line !== null ?
    `top:${line}%;` :
    "";
};

const getPercentageValueOrDefault = (
  percentageString: string | undefined, defaultValue: number
): number => {
  const value = getPercentageValue(percentageString);

  return value !== null ?
    value :
    defaultValue;
};

const getPercentageValue = (percentageString: string | undefined): number | null => {
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
