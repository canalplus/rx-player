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

import config from "../../../config";
import assert from "../../../utils/assert";
import { normalize as normalizeLang } from "../../../utils/languages";
import {
  parseString,
  parseFrameRate,
  parseByteRange,
  parseBoolean,
  parseDateTime,
  parseDuration,
  parseIntOrBoolean,
  parseRatio,
} from "./helpers";

import {
  IRole,
  ISegmentURL,
  IPeriodDash,
  ISegmentBase,
  IAdaptationDash,
  ISegmentTimeLine,
  IRepresentationDash,
  IContentComponentDash,
  IContentProtectionDash,
} from "../types";

import { IParsedManifest } from "../../types";

/**
 * Parse initialization attribute found in segment Template to
 * correspond to the initialization found in a regular segmentBase.
 * @param {string} attrValue
 * @returns {Object}
 */
function parseInitializationAttribute(
  attrValue : string
) : { media : string, range : undefined } {
  return { media: attrValue, range: undefined };
}

interface IMPDAttribute {
  k: string;
  fn: (x: string) => object|Date|string|number|boolean|null|[number, number];
  def?: boolean|number|string;
  n?: string;
}

// @see attributes
const representationBaseType : IMPDAttribute[] = [
  { k: "profiles",          fn: parseString },
  { k: "width",             fn: parseInt },
  { k: "height",            fn: parseInt },
  { k: "frameRate",         fn: parseFrameRate },
  { k: "audioSamplingRate", fn: parseString },
  { k: "mimeType",          fn: parseString },
  { k: "segmentProfiles",   fn: parseString },
  { k: "codecs",            fn: parseString },
  { k: "maximumSAPPeriod",  fn: parseFloat },
  { k: "maxPlayoutRate",    fn: parseFloat },
  { k: "codingDependency",  fn: parseBoolean },
];

// @see attributes
const segmentBaseType : IMPDAttribute[] = [
  { k: "timescale",                fn: parseInt, def: 1 },
  { k: "timeShiftBufferDepth",     fn: parseDuration },
  { k: "presentationTimeOffset",   fn: parseFloat, def: 0 },
  { k: "indexRange",               fn: parseByteRange },
  { k: "indexRangeExact",          fn: parseBoolean, def: false },
  { k: "availabilityTimeOffset",   fn: parseFloat },
  { k: "availabilityTimeComplete", fn: parseBoolean, def: true },
];

// @see attributes
const multipleSegmentBaseType : IMPDAttribute[] = segmentBaseType.concat([
  { k: "duration",    fn: parseInt },
  { k: "startNumber", fn: parseInt },
]);

/**
 * Object describing how a Dash MPD should be parsed automatically.
 *
 * Basically, immediate keys are the nodeName concerned.
 * They contain array of Objects, each concerning a unique node attributes.
 *
 * The keys these Objects have are as such:
 *
 *   - k {string}: the name of the node attribute
 *
 *   - fn {Function}: the function called to parse this attribute. It takes
 *     as argument the attribute value and should return the parsed value.
 *
 *   - n {string}: new name used for the attribute in the parsed object.
 *
 *   - def {*}: the default value used if the attribute is not found in the
 *     MPD.
 */
const attributes : { [keyName : string]: IMPDAttribute[] } = {
  ContentProtection: [
    { k: "schemeIdUri", fn: parseString },
    { k: "value", fn: parseString },
  ],

  SegmentURL: [
    { k: "media",      fn: parseString },
    { k: "mediaRange", fn: parseByteRange },
    { k: "index",      fn: parseString },
    { k: "indexRange", fn: parseByteRange },
  ],

  S: [
    { k: "t", fn: parseInt, n: "ts"},
    { k: "d", fn: parseInt },
    { k: "r", fn: parseInt },
  ],

  SegmentTimeline: [],
  SegmentBase: segmentBaseType,
  SegmentTemplate: multipleSegmentBaseType.concat([
    { k: "initialization",     fn: parseInitializationAttribute },
    { k: "index",              fn: parseString },
    { k: "media",              fn: parseString },
    { k: "bitstreamSwitching", fn: parseString },
  ]),
  SegmentList: multipleSegmentBaseType,

  ContentComponent: [
    { k: "id",          fn: parseString },
    { k: "lang",        fn: parseString, n: "language" },
    { k: "lang",        fn: normalizeLang, n: "normalizedLanguage" },
    { k: "contentType", fn: parseString },
    { k: "par",         fn: parseRatio },
  ],

  Representation: representationBaseType.concat([
    { k: "id",             fn: parseString },
    { k: "bandwidth",      fn: parseInt, n: "bitrate" },
    { k: "qualityRanking", fn: parseInt },
  ]),

  AdaptationSet: representationBaseType.concat([
    { k: "id",                  fn: parseString },
    { k: "group",               fn: parseInt },
    { k: "lang",                fn: parseString, n: "language" },
    { k: "lang",                fn: normalizeLang, n: "normalizedLanguage" },
    { k: "contentType",         fn: parseString },
    { k: "par",                 fn: parseRatio },
    { k: "minBandwidth",        fn: parseInt, n: "minBitrate" },
    { k: "maxBandwidth",        fn: parseInt, n: "maxBitrate" },
    { k: "minWidth",            fn: parseInt },
    { k: "maxWidth",            fn: parseInt },
    { k: "minHeight",           fn: parseInt },
    { k: "maxHeight",           fn: parseInt },
    { k: "minFrameRate",        fn: parseFrameRate },
    { k: "maxFrameRate",        fn: parseFrameRate },
    { k: "segmentAlignment",    fn: parseIntOrBoolean },
    { k: "subsegmentAlignment", fn: parseIntOrBoolean },
    { k: "bitstreamSwitching",  fn: parseBoolean },
  ]),

  Period: [
    { k: "id",                 fn: parseString },
    { k: "start",              fn: parseDuration },
    { k: "duration",           fn: parseDuration },
    { k: "bitstreamSwitching", fn: parseBoolean },
  ],

  MPD: [
    { k: "id",                         fn: parseString },
    { k: "profiles",                   fn: parseString },
    { k: "type",                       fn: parseString, def: "static" },
    { k: "availabilityStartTime",      fn: parseDateTime },
    { k: "availabilityEndTime",        fn: parseDateTime },
    { k: "publishTime",                fn: parseDateTime },
    { k: "mediaPresentationDuration",  fn: parseDuration, n: "duration" },
    { k: "minimumUpdatePeriod",        fn: parseDuration },
    { k: "minBufferTime",              fn: parseDuration },
    { k: "timeShiftBufferDepth",       fn: parseDuration },
    {
      k: "suggestedPresentationDelay",
      fn: parseDuration,
      def: config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.DASH,
    },
    { k: "maxSegmentDuration",         fn: parseDuration },
    { k: "maxSubsegmentDuration",      fn: parseDuration },
  ],

  Role: [
    { k: "schemeIdUri", fn: parseString },
    { k: "value",       fn: parseString},
  ],

  Accessibility: [
    { k: "schemeIdUri", fn: parseString },
    { k: "value",       fn: parseInt},
  ],
};

/**
 * @param {Document} node - The Node content
 * @param {Object} [base] - Base object that will be enriched
 * @returns {Object}
 */
type types =
  IRole | IContentComponentDash| IParsedManifest |
  IAdaptationDash | IRepresentationDash | IPeriodDash |
  ISegmentURL | ISegmentBase | ISegmentTimeLine;

function feedAttributes(node: Element, base?: IParsedManifest): IParsedManifest;
function feedAttributes(node: Element, base?: IAdaptationDash): IAdaptationDash;
function feedAttributes(node: Element, base?: IRepresentationDash): IRepresentationDash;
function feedAttributes(
  node: Element,
  base?: IContentComponentDash
): IContentComponentDash;
function feedAttributes(node: Element, base?: ISegmentURL): ISegmentURL;
function feedAttributes(
  node: Element,
  base?: IContentProtectionDash
): IContentProtectionDash;
function feedAttributes(node: Element, base?: ISegmentBase): ISegmentBase;
function feedAttributes(node: Element, base?: ISegmentTimeLine): ISegmentTimeLine;
function feedAttributes(node: Element, base?: IPeriodDash): IPeriodDash;
function feedAttributes(node: Element, base?: IRole): IRole;
function feedAttributes<T>(node: Element): T;
function feedAttributes<T>(node: Element, base?: types): T | types {
  const attrs = attributes[node.nodeName];

  assert(attrs, "no attributes for " + node.nodeName);

  /**
   * XXX TODO Remove the obj with any type. Only security we got in this method
   * is the assumption that fields in attr match exactly with properties of 
   * input elements.
   */
  const obj: any = base || {};
  for (let i = 0; i < attrs.length; i++) {
    const { k, fn, n, def } = attrs[i];
    if (node.hasAttribute(k)) {
      obj[n || k] = fn(node.getAttribute(k) as string);
    } else if (def != null) {
      obj[n || k] = def;
    }
  }
  return obj;
}

export default feedAttributes;
