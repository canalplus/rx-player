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

import objectAssign = require("object-assign");
import arrayIncludes from "../../../../utils/array-includes";
import {
  normalize as normalizeLang,
} from "../../../../utils/languages";
import log from "../../../../utils/log";
import { resolveURL } from "../../../../utils/url";
import {
  inheritAttributes,
  IScheme,
  isHardOfHearing,
  isVisuallyImpaired,
  parseBoolean,
  parseFrameRate,
  parseIntOrBoolean,
  parseScheme,
} from "../helpers";

import parseContentComponent, {
  IParsedContentComponent,
} from "./ContentComponent";
import parseContentProtection, {
  IContentProtectionParser,
  IParsedContentProtection,
} from "./ContentProtection";
import parseRepresentation, {
  IParsedRepresentation,
} from "./Representation";
import parseSegmentBase from "./SegmentBase";
import parseSegmentList from "./SegmentList";
import parseSegmentTemplate from "./SegmentTemplate";

interface IRepresentation {
  // required
  baseURL : string;
  bitrate : number;
  index : any; // TODO
  id: string;

  // optional
  audioSamplingRate?: string;
  codecs?: string;
  codingDependency?: boolean;
  contentComponent?: IParsedContentComponent;
  contentProtection?: IParsedContentProtection;
  frameRate?: number;
  height?: number;
  maxPlayoutRate?: number;
  maximumSAPPeriod?: number;
  mimeType?: string;
  profiles?: string;
  qualityRanking?: number;
  segmentProfiles?: string;
  width?: number;
}

export interface IParsedAdaptationSet {
  // required
  id: string;
  representations: IRepresentation[];
  type: string;

  // optional
  audioDescription? : boolean;
  bitstreamSwitching?: boolean;
  closedCaption? : boolean;
  contentComponent?: IParsedContentComponent;
  contentProtection?: IParsedContentProtection|undefined;
  language?: string;
  maxBitrate?: number;
  maxFrameRate?: number;
  maxHeight?: number;
  maxWidth?: number;
  minBitrate?: number;
  minFrameRate?: number;
  minHeight?: number;
  minWidth?: number;
  normalizedLanguage? : string;
  par?: string;
  segmentAlignment?: number|boolean;
  subsegmentAlignment?: number|boolean;
}

interface IAdaptationSetChildNodes {
  accessibility? : IScheme;
  baseURL? : string;
  contentComponent? : IParsedContentComponent;
  contentProtection? : IParsedContentProtection;
  representations : Node[];
  role? : IScheme;
  index? : any; // TODO
}

interface IAdaptationSetAttributes {
  bitstreamSwitching? : boolean;
  contentType? : string;
  group? : number;
  id? : string;
  language? : string;
  maxBitrate? : number;
  maxFrameRate? : number;
  maxHeight? : number;
  maxWidth? : number;
  minBitrate? : number;
  minFrameRate? : number;
  minHeight? : number;
  minWidth? : number;
  normalizedLanguage? : string;
  par? : string;
  segmentAlignment? : number|boolean;
  subsegmentAlignment? : number|boolean;

  audioSamplingRate? : string;
  codecs? : string;
  codingDependency? : boolean;
  frameRate? : number;
  height? : number;
  maxPlayoutRate? : number;
  maximumSAPPeriod? : number;
  mimeType? : string;
  profiles? : string;
  segmentProfiles? : string;
  width? : number;
}

const KNOWN_ADAPTATION_TYPES = ["audio", "video", "text", "image"];

/**
 * Infers the type of adaptation from codec and mimetypes found in it.
 *
 * This follows the guidelines defined by the DASH-IF IOP:
 *   - one adaptation set contains a single media type
 *   - The order of verifications are:
 *       1. mimeType
 *       2. Role
 *       3. codec
 *
 * Note: This is based on DASH-IF-IOP-v4.0 with some more freedom.
 * @param {Object} adaptation
 * @returns {string} - "audio"|"video"|"text"|"image"|"metadata"|"unknown"
 */
function inferAdaptationType(
  mimeType : string,
  role : IScheme|null,
  representations: IParsedRepresentation[]
) : string {
  const topLevel = mimeType.split("/")[0];
  if (arrayIncludes(KNOWN_ADAPTATION_TYPES, topLevel)) {
    return topLevel;
  }

  if (mimeType === "application/bif") {
    return "image";
  }

  if (mimeType === "application/ttml+xml") {
    return "text";
  }

  // manage DASH-IF mp4-embedded subtitles and metadata
  if (mimeType === "application/mp4") {
    if (role) {
      if (
        role.schemeIdUri === "urn:mpeg:dash:role:2011" &&
        role.value === "subtitle"
      ) {
        return "text";
      }
    }
    return "metadata";
  }

  // take 1st representation's mimetype as default
  if (representations.length) {
    const firstReprMimeType = representations[0].mimeType || "";
    const _topLevel = firstReprMimeType.split("/")[0];
    if (arrayIncludes(KNOWN_ADAPTATION_TYPES, _topLevel)) {
      return _topLevel;
    }
  }

  // TODO infer from representations' codecs?
  return "unknown";
}

/**
 * @param {Node} root
 * @param {Function} [contentProtectionParser]
 * @returns {Object}
 */
function parseAdaptationSetChildNodes(
  root : Node,
  contentProtectionParser?: IContentProtectionParser
) : IAdaptationSetChildNodes {
  const parsedAdaptation : IAdaptationSetChildNodes = {
    representations: [],
  };

  const adaptationSetChildren = root.childNodes;
  for (let i = 0; i < adaptationSetChildren.length; i++) {
    const currentNode = adaptationSetChildren[i];

    switch(currentNode.nodeName) {
        // case "Rating": break;
        // case "Viewpoint": break;

      case "Accessibility":
        parsedAdaptation.accessibility = parseScheme(currentNode);
        break;

      case "BaseURL":
        parsedAdaptation.baseURL = currentNode.textContent || "";
        break;

        // TODO seems to be unused
      case "ContentComponent":
        parsedAdaptation.contentComponent = parseContentComponent(currentNode);
        break;

        // TODO seems to be unused
      case "ContentProtection":
        parsedAdaptation.contentProtection =
          parseContentProtection(currentNode, contentProtectionParser);
        break;

      case "Representation":
        parsedAdaptation.representations.push(currentNode);
        break;

      case "Role":
        parsedAdaptation.role = parseScheme(currentNode);
        break;

      case "SegmentBase":
        parsedAdaptation.index = parseSegmentBase(currentNode);
        break;

      case "SegmentList":
        parsedAdaptation.index = parseSegmentList(currentNode);
        break;

      case "SegmentTemplate":
        parsedAdaptation.index = parseSegmentTemplate(currentNode);
        break;
    }
  }
  return parsedAdaptation;
}

function parseAdaptationSetAttributes(
  root : Node
) : IAdaptationSetAttributes {
  const parsedAdaptation : IAdaptationSetAttributes = {};

  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {

      case "id":
        parsedAdaptation.id = attribute.value;
        break;

      case "group": {
        const group = parseInt(attribute.value, 10);
        if (isNaN(group)) {
          log.warn(`DASH: invalid group ("${attribute.value}")`);
        } else {
          parsedAdaptation.group = group;
        }
      }
        break;

      case "lang":
        parsedAdaptation.language = attribute.value;
        parsedAdaptation.normalizedLanguage = normalizeLang(attribute.value);
        break;

      case "contentType":
        parsedAdaptation.contentType = attribute.value;
        break;

      case "par":
        parsedAdaptation.par = attribute.value;
        break;

      case "minBandwidth": {
        const minBitrate = parseInt(attribute.value, 10);
        if (isNaN(minBitrate)) {
          log.warn(`DASH: invalid minBandwidth ("${attribute.value}")`);
        } else {
          parsedAdaptation.minBitrate = minBitrate;
        }
      }
        break;

      case "maxBandwidth": {
        const maxBitrate = parseInt(attribute.value, 10);
        if (isNaN(maxBitrate)) {
          log.warn(`DASH: invalid maxBandwidth ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxBitrate = maxBitrate;
        }
      }
        break;

      case "minWidth": {
        const minWidth = parseInt(attribute.value, 10);
        if (isNaN(minWidth)) {
          log.warn(`DASH: invalid minWidth ("${attribute.value}")`);
        } else {
          parsedAdaptation.minWidth = minWidth;
        }
      }
        break;

      case "maxWidth": {
        const maxWidth = parseInt(attribute.value, 10);
        if (isNaN(maxWidth)) {
          log.warn(`DASH: invalid maxWidth ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxWidth = maxWidth;
        }
      }
        break;

      case "minHeight": {
        const minHeight = parseInt(attribute.value, 10);
        if (isNaN(minHeight)) {
          log.warn(`DASH: invalid minHeight ("${attribute.value}")`);
        } else {
          parsedAdaptation.minHeight = minHeight;
        }
      }
        break;

      case "maxHeight": {
        const maxHeight = parseInt(attribute.value, 10);
        if (isNaN(maxHeight)) {
          log.warn(`DASH: invalid maxHeight ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxHeight = maxHeight;
        }
      }
        break;

      case "minFrameRate": {
        const minFrameRate = parseFrameRate(attribute.value);
        if (isNaN(minFrameRate)) {
          log.warn(`DASH: invalid minFrameRate ("${attribute.value}")`);
        } else {
          parsedAdaptation.minFrameRate = minFrameRate;
        }
      }
        break;

      case "maxFrameRate": {
        const maxFrameRate = parseFrameRate(attribute.value);
        if (isNaN(maxFrameRate)) {
          log.warn(`DASH: invalid maxFrameRate ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxFrameRate = maxFrameRate;
        }
      }
        break;

      case "segmentAlignment": {
        const segmentAlignment = parseIntOrBoolean(attribute.value);
        if (typeof segmentAlignment === "number" && isNaN(segmentAlignment)) {
          log.warn(`DASH: invalid segmentAlignment ("${attribute.value}")`);
        } else {
          parsedAdaptation.segmentAlignment = segmentAlignment;
        }
      }
        break;

      case "subsegmentAlignment": {
        const subsegmentAlignment = parseIntOrBoolean(attribute.value);
        if (typeof subsegmentAlignment === "number" && isNaN(subsegmentAlignment)) {
          log.warn(`DASH: invalid subsegmentAlignment ("${attribute.value}")`);
        } else {
          parsedAdaptation.subsegmentAlignment = subsegmentAlignment;
        }
      }
        break;

      case "bitstreamSwitching":
        parsedAdaptation.bitstreamSwitching = parseBoolean(attribute.value);
        break;

      case "audioSamplingRate":
        parsedAdaptation.audioSamplingRate = attribute.value;
        break;

      case "codecs":
        parsedAdaptation.codecs = attribute.value;
        break;

      case "codingDependency":
        parsedAdaptation.codingDependency = parseBoolean(attribute.value);
        break;

      case "frameRate": {
        const frameRate = parseFrameRate(attribute.value);
        if (isNaN(frameRate)) {
          log.warn(`DASH: invalid frameRate ("${attribute.value}")`);
        } else {
          parsedAdaptation.frameRate = frameRate;
        }
      }
        break;

      case "height": {
        const height = parseInt(attribute.value, 10);
        if (isNaN(height)) {
          log.warn(`DASH: invalid height ("${attribute.value}")`);
        } else {
          parsedAdaptation.height = height;
        }
      }
        break;

      case "maxPlayoutRate": {
        const maxPlayoutRate = parseFloat(attribute.value);
        if (isNaN(maxPlayoutRate)) {
          log.warn(`DASH: invalid maxPlayoutRate ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxPlayoutRate = maxPlayoutRate;
        }
      }
        break;

      case "maximumSAPPeriod": {
        const maximumSAPPeriod = parseFloat(attribute.value);
        if (isNaN(maximumSAPPeriod)) {
          log.warn(`DASH: invalid maximumSAPPeriod ("${attribute.value}")`);
        } else {
          parsedAdaptation.maximumSAPPeriod = maximumSAPPeriod;
        }
      }
        break;

      case "mimeType":
        parsedAdaptation.mimeType = attribute.value;
        break;

      case "profiles":
        parsedAdaptation.profiles = attribute.value;
        break;

      case "segmentProfiles":
        parsedAdaptation.segmentProfiles = attribute.value;
        break;

      case "width": {
        const width = parseInt(attribute.value, 10);
        if (isNaN(width)) {
          log.warn(`DASH: invalid width ("${attribute.value}")`);
        } else {
          parsedAdaptation.width = width;
        }
      }
        break;
    }
  }

  return parsedAdaptation;
}

/**
 * @param {Node} root
 * @param {string} rootURL
 * @param {Function} [contentProtectionParser]
 * @returns {Object}
 */
export default function parseAdaptationSet(
  root: Node,
  rootURL : string,
  contentProtectionParser?: IContentProtectionParser
): IParsedAdaptationSet {

  const adaptationChildNodes =
    parseAdaptationSetChildNodes(root, contentProtectionParser);
  const adaptationAttributes = parseAdaptationSetAttributes(root);

  const adaptationBaseURL = resolveURL(rootURL, adaptationChildNodes.baseURL);
  const baseIndex = adaptationChildNodes.index != null ? adaptationChildNodes.index : {
    indexType: "template" as "template",
    duration: Number.MAX_VALUE,
    timescale: 1,
    startNumber: 0,
  };

  const parsedNodes : IRepresentation[] = adaptationChildNodes.representations
    .map((representationNode) => {
      let representationObject =
        parseRepresentation(representationNode, adaptationBaseURL);
      representationObject = inheritAttributes([
        "audioSamplingRate",
        "codecs",
        "codingDependency",
        "frameRate",
        "height",
        "maxPlayoutRate",
        "maximumSAPPeriod",
        "mimeType",
        "profiles",
        "segmentProfiles",
        "width",
      ], representationObject, adaptationAttributes);

      let representationID = representationObject.id;
      if (representationID == null) {
        representationID = representationObject.bitrate + "-" +
          (representationObject.codecs || "");
      }

      // Fix issue in some packagers, like GPAC, generating a non
      // compliant mimetype with RFC 6381. Other closed-source packagers
      // may be impacted.
      if (representationObject.codecs === "mp4a.40.02") {
        representationObject.codecs = "mp4a.40.2";
      }

      return objectAssign({
        index: baseIndex,
        id: representationID,
      }, representationObject);
    });

  let closedCaption : boolean|undefined;
  let audioDescription : boolean|undefined;

  const type = inferAdaptationType(
    adaptationAttributes.mimeType || "",
    adaptationChildNodes.role || null,
    parsedNodes
  );

  const accessibility = adaptationChildNodes.accessibility;
  if (type === "text" && accessibility && isHardOfHearing(accessibility)) {
    closedCaption = true;
  }

  if (type === "audio" && accessibility && isVisuallyImpaired(accessibility)) {
    audioDescription = true;
  }

  let id : string;
  if (adaptationAttributes.id != null) {
    id = adaptationAttributes.id;
  } else {
    let idString = `${type}`;
    if (adaptationAttributes.language) {
      idString += `-${adaptationAttributes.language}`;
    }
    if (closedCaption) {
      idString += "-cc";
    }
    if (audioDescription) {
      idString += "-ad";
    }
    if (adaptationAttributes.mimeType) {
      idString += `-${adaptationAttributes.mimeType}`;
    }
    id = idString;
  }

  let parsedAdaptationSet : IParsedAdaptationSet = {
    id,
    representations: parsedNodes,
    type,
  };

  if (closedCaption != null) {
    parsedAdaptationSet.closedCaption = closedCaption;
  }

  if (audioDescription != null) {
    parsedAdaptationSet.audioDescription = audioDescription;
  }

  const childNodesAndAttributes = objectAssign(
    {},
    adaptationChildNodes,
    adaptationAttributes
  );

  parsedAdaptationSet = inheritAttributes(
   [
     "bitstreamSwitching",
     "closedCaption",
     "contentComponent",
     "contentProtection",
     "language",
     "maxBitrate",
     "maxFrameRate",
     "maxHeight",
     "maxWidth",
     "minBitrate",
     "minFrameRate",
     "minHeight",
     "minWidth",
     "normalizedLanguage",
     "par",
     "segmentAlignment",
     "subsegmentAlignment",
   ],
    parsedAdaptationSet,
    childNodesAndAttributes
  );

  return parsedAdaptationSet;
}

export { IContentProtectionParser };
