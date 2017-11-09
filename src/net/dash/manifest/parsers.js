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

import log from "../../../utils/log";
import assert from "../../../utils/assert.js";
import {
  reduceChildren,
  getLastLiveTimeReference,
  isHardOfHearing,
  isVisuallyImpaired,
  inferAdaptationType,
  parseByteRange,
} from "./helpers.js";
import {
  filterMPD,
  filterPeriod,
  filterAdaptation,
  filterRepresentation,
} from "./filters.js";

import feedAttributes from "./attributes.js";

const representationKeysInheritedFromAdaptation = [
  "codecs",
  "height",
  "index",
  "mimeType",
  "width",
];

function parseMPD(root, contentProtectionParser) {
  const parser = reduceChildren(root, (res, name, node) => {
    switch(name) {

      case "BaseURL":
        res.baseURL = node.textContent;
        break;

      case "Location":
        res.locations.push(node.textContent);
        break;

      case "Period":
        res.periods.push(parsePeriod(node, contentProtectionParser));
        break;
    }

    return res;
  }, {
    transportType: "dash",
    periods: [],
    locations: [],
  });

  const parsed = feedAttributes(root, parser);

  if (/dynamic/.test(parsed.type)) {
    const adaptations = parsed.periods[0].adaptations;

    const videoAdaptation = adaptations.filter((a) => a.type == "video")[0];

    let lastRef = getLastLiveTimeReference(videoAdaptation);

    if (__DEV__) {
      assert(parsed.availabilityStartTime);
    }

    parsed.availabilityStartTime =
      parsed.availabilityStartTime.getTime() / 1000;
    parsed.presentationLiveGap = lastRef != null ?
      Date.now() / 1000 - (lastRef + parsed.availabilityStartTime) : 10;
  }

  return filterMPD(parsed);
}

/**
 * Parse a single manifest period.
 * @param {Document} root
 * @param {Function} contentProtectionParser
 * @returns {Object}
 */
function parsePeriod(root, contentProtectionParser) {
  const parsed =
    feedAttributes(root, reduceChildren(root, (res, name, node) => {
      switch(name) {

        case "BaseURL":
          res.baseURL = node.textContent;
          break;

        case "AdaptationSet":
          const ada = parseAdaptationSet(node, contentProtectionParser);
          if (ada.id == null) {
            ada.id = res.adaptations.length;
          }
          res.adaptations.push(ada);
          break;

      }
      return res;
    }, { adaptations: [] }));

  return filterPeriod(parsed);
}

function parseAdaptationSet(root, contentProtectionParser) {
  let accessibility;
  const parser = reduceChildren(root, (res, name, node) => {
    switch(name) {
    // case "Rating": break;
    // case "Viewpoint": break;

      case "Accessibility":
        accessibility = parseAccessibility(node);
        break;

      case "BaseURL":
        res.baseURL = node.textContent;
        break;

    // TODO seems to be unused
      case "ContentComponent":
        res.contentComponent = parseContentComponent(node);
        break;

    // TODO seems to be unused
      case "ContentProtection":
        res.contentProtection =
        parseContentProtection(node, contentProtectionParser);
        break;

      case "Representation":
        const rep = parseRepresentation(node);
        if (rep.id == null) {
          rep.id = res.representations.length;
        }
        res.representations.push(rep); break;

      case "Role":
        res.role = parseRole(node);
        break;

      case "SegmentBase":
        res.index = parseSegmentBase(node);
        break;

      case "SegmentList":
        res.index = parseSegmentList(node);
        break;

      case "SegmentTemplate":
        res.index = parseSegmentTemplate(node);
        break;
    }

    return res;
  }, { representations: [] });

  const parsed = feedAttributes(root, parser);

  parsed.type = inferAdaptationType(parsed);

  parsed.accessibility = [];

  if (isHardOfHearing(accessibility)) {
    parsed.accessibility.push("hardOfHearing");
  }

  if (isVisuallyImpaired(accessibility)) {
    parsed.accessibility.push("visuallyImpaired");
  }

  // representations inherit some adaptation keys
  parsed.representations = parsed.representations
    .map((representation) => {
      representationKeysInheritedFromAdaptation.forEach(key => {
        if (
          !representation.hasOwnProperty(key) &&
          parsed.hasOwnProperty(key)
        ) {
          // TODO clone objects, they should not share the same ref
          representation[key] = parsed[key];
        }
      });

      return representation;
    });

  return filterAdaptation(parsed);
}

function parseRepresentation(root) {
  const parser = reduceChildren(root, (res, name, node) => {
    switch(name) {
    // case "FramePacking": break;
    // case "AudioChannelConfiguration": break;
    // case "ContentProtection":
    //   res.contentProtection = parseContentProtection(node);
    //   break;
    // case "EssentialProperty": break;
    // case "SupplementalProperty": break;
    // case "InbandEventStream": break;
    // case "SubRepresentation": break;

      case "BaseURL":
        res.baseURL = node.textContent;
        break;

      case "SegmentBase":
        res.index = parseSegmentBase(node);
        break;

      case "SegmentList":
        res.index = parseSegmentList(node);
        break;

      case "SegmentTemplate":
        res.index = parseSegmentTemplate(node);
        break;
    }
    return res;
  }, {});

  const parsed = feedAttributes(root, parser);
  return filterRepresentation(parsed);
}

function parseRole(root) {
  return feedAttributes(root);
}

function parseAccessibility(root) {
  return feedAttributes(root);
}

function parseContentComponent(root) {
  return feedAttributes(root);
}

function parseSegmentTemplate(root) {
  const base = parseMultipleSegmentBase(root);
  if (!base.indexType) {
    base.indexType = "template";
  }
  return base;
}

function parseSegmentList(root) {
  const base = parseMultipleSegmentBase(root);
  base.list = [];
  base.indexType = "list";
  return reduceChildren(root, (res, name, node) => {
    if (name == "SegmentURL") {
      res.list.push(feedAttributes(node));
    }
    return res;
  }, base);
}

/**
 * Parse the contentProtection node of a MPD.
 * @param {Document} root
 * @param {Function} contentProtectionParser
 * @returns {Object}
 */
function parseContentProtection(root, contentProtectionParser) {
  return contentProtectionParser(feedAttributes(root), root);
}

function parseSegmentBase(root) {
  const index = reduceChildren(root, (res, name, node) => {
    if (name == "Initialization") {
      res.initialization = parseInitialization(node);
    }
    return res;
  }, feedAttributes(root));

  if (root.nodeName == "SegmentBase") {
    index.indexType = "base";
    index.timeline = [];
  }
  return index;
}

function parseMultipleSegmentBase(root) {
  return reduceChildren(root, (res, name, node) => {
    if (name == "SegmentTimeline") {
      res.indexType = "timeline";
      res.timeline = parseSegmentTimeline(node);
    }
    return res;
  }, parseSegmentBase(root));
}

function parseSegmentTimeline(root) {
  return reduceChildren(root, (arr, name, node) => {
    const len = arr.length;
    const seg = feedAttributes(node);
    if (seg.ts == null) {
      const prev = (len > 0) && arr[len - 1];
      seg.ts = prev
        ? prev.ts + prev.d * (prev.r + 1)
        : 0;
    }
    if (seg.r == null) {
      seg.r = 0;
    }
    arr.push(seg);
    return arr;
  }, []);
}

function parseInitialization(root) {
  let range, media;

  if (root.hasAttribute("range")) {
    range = parseByteRange(root.getAttribute("range"));
  }

  if (root.hasAttribute("sourceURL")) {
    media = root.getAttribute("sourceURL");
  }

  return { range, media };
}

export {
  parseMPD,
};
