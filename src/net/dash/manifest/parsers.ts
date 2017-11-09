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

import assert from "../../../utils/assert";
import {
  reduceChildren,
  getLastLiveTimeReference,
  isHardOfHearing,
  isVisuallyImpaired,
  inferAdaptationType,
  parseByteRange,
} from "./helpers";
import {
  IRole,
  ISegmentURL,
  IPeriodDash,
  ISegmentBase,
  IAccessibility,
  IAdaptationDash,
  IInitialization,
  ISegmentTimeLine,
  IRepresentationDash,
  IMultipleSegmentBase,
  IContentComponentDash,
  IContentProtectionDash,
  ContentProtectionParser,
} from "../types";

import { IParsedManifest } from "../../types";

import feedAttributes from "./attributes";

function parseMPD(
  root: Element,
  contentProtectionParser?: ContentProtectionParser
) {
  const mpd = reduceChildren<IParsedManifest>(root, (res, name, node) => {
    switch (name) {

      case "BaseURL":
        res.baseURL = node.textContent;
        break;

      case "Location":
        if (!res.locations) {
          res.locations = [];
        }
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

  const parsedMpd = feedAttributes(root, mpd);

  if (parsedMpd.type && /dynamic/.test(parsedMpd.type)) {
    // As adaptations can either be from DASH or SMOOTH in parsed mpd object,
    // we must type adaptations as IAdaptationDash.
    const adaptations = parsedMpd.periods[0].adaptations as IAdaptationDash[];

    const videoAdaptation = adaptations
      .filter(a => a.type === "video")[0];

    const lastRef = getLastLiveTimeReference(videoAdaptation);

    if (__DEV__) {
      assert(parsedMpd.availabilityStartTime);
    }

    if (parsedMpd.availabilityStartTime &&
        typeof parsedMpd.availabilityStartTime !== "number") {
      parsedMpd.availabilityStartTime =
        parsedMpd.availabilityStartTime.getTime() / 1000;
      parsedMpd.presentationLiveGap = lastRef != null ?
        Date.now() / 1000 - (lastRef + parsedMpd.availabilityStartTime) : 10;
    }
  }

  return parsedMpd;
}

/**
 * Parse a single manifest period.
 * @param {Document} root
 * @param {Function} contentProtectionParser
 * @returns {Object}
 */
function parsePeriod(
  root: Element,
  contentProtectionParser?: ContentProtectionParser
): IPeriodDash {
  const period =
    feedAttributes(root, reduceChildren<IPeriodDash>(root, (res, name, node) => {
      switch (name) {

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
    }, {
      id: null,
      adaptations: [],
    }));

  return period;
}

function parseAdaptationSet(
  root: Element,
  contentProtectionParser?: ContentProtectionParser
): IAdaptationDash {
  let accessibility;
  const adapatationSet = reduceChildren<IAdaptationDash>(root, (res, name, node) => {
    switch (name) {
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
  }, {
      index: null,
      id: null,
      representations: [],
      mimeType: null,
  });

  const parsedAdaptation = feedAttributes(root, adapatationSet);

  parsedAdaptation.type = inferAdaptationType(parsedAdaptation);

  parsedAdaptation.accessibility = [];

  if (accessibility && isHardOfHearing(accessibility)) {
    parsedAdaptation.accessibility.push("hardOfHearing");
  }

  if (accessibility && isVisuallyImpaired(accessibility)) {
    parsedAdaptation.accessibility.push("visuallyImpaired");
  }

  // representations inherit some adaptation keys
  if (parsedAdaptation.representations) {
    parsedAdaptation.representations = parsedAdaptation.representations
    .map((representation: IRepresentationDash) => {
      if (parsedAdaptation.codecs && representation.codecs == null) {
        representation.codecs = parsedAdaptation.codecs;
      }
      if (parsedAdaptation.height && representation.height == null) {
        representation.height = parsedAdaptation.height;
      }
      if (parsedAdaptation.index && representation.index == null) {
        representation.index = parsedAdaptation.index;
      }
      if (parsedAdaptation.mimeType && representation.mimeType == null) {
        representation.mimeType = parsedAdaptation.mimeType;
      }
      if (parsedAdaptation.width && representation.width == null) {
          representation.width = parsedAdaptation.width;
      }
      return representation;
    });
  }

  return parsedAdaptation;
}

function parseRepresentation(root: Element): IRepresentationDash {
  const representation = reduceChildren<IRepresentationDash>(root, (res, name, node) => {
    switch (name) {
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
  }, {
    id: null,
    index: null,
    mimeType: null,
  });

  const parsedRep = feedAttributes(root, representation);
  return parsedRep;
}

function parseRole(root: Element): IRole {
  return feedAttributes<IRole>(root);
}

function parseAccessibility(root: Element): IAccessibility {
  return feedAttributes<IRole>(root);
}

function parseContentComponent(root: Element): IContentComponentDash {
  return feedAttributes<IContentComponentDash>(root);
}

function parseSegmentTemplate(root: Element): ISegmentBase {
  const base = parseMultipleSegmentBase(root);
  if (!base.indexType) {
    base.indexType = "template";
  }
  return base;
}

function parseSegmentList(root: Element): IMultipleSegmentBase {
  const base = parseMultipleSegmentBase(root);
  base.list = [];
  base.indexType = "list";
  return reduceChildren<IMultipleSegmentBase>(root, (res, name, node) => {
    if (name === "SegmentURL") {
      res.list.push(feedAttributes<ISegmentURL>(node));
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
function parseContentProtection(
  root: Element,
  contentProtectionParser?: ContentProtectionParser
): IContentProtectionDash|undefined {
  if (contentProtectionParser) {
    return contentProtectionParser(feedAttributes<IContentProtectionDash>(root), root);
  }
}

function parseSegmentBase(root: Element): ISegmentBase {
  const index = reduceChildren<ISegmentBase>(root, (res, name, node) => {
    if (name === "Initialization") {
      res.initialization = parseInitialization(node);
    }
    return res;
  }, feedAttributes<ISegmentBase>(root));

  if (root.nodeName === "SegmentBase") {
    index.indexType = "base";
    index.timeline = [];
  }
  return index;
}

function parseMultipleSegmentBase(root: Element): IMultipleSegmentBase {
  return reduceChildren<ISegmentBase>(root, (res, name, node) => {
    if (name === "SegmentTimeline") {
      res.indexType = "timeline";
      res.timeline = parseSegmentTimeline(node);
    }
    return res;
  }, parseSegmentBase(root));
}

function parseSegmentTimeline(root: Element): ISegmentTimeLine[] {
  return reduceChildren<ISegmentTimeLine[]>(root, (arr, _name, node) => {
    const len = arr.length;
    const seg = feedAttributes<ISegmentTimeLine>(node);
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

function parseInitialization(root: Element): IInitialization {
  let range;
  let media;

  if (root.hasAttribute("range")) {
    range = parseByteRange(root.getAttribute("range") as string);
  }

  if (root.hasAttribute("sourceURL")) {
    media = root.getAttribute("sourceURL");
  }

  return { range, media };
}

export {
  IParsedManifest,
  IRole,
  parseMPD,
  IPeriodDash,
  IAdaptationDash,
  IRepresentationDash,
};
