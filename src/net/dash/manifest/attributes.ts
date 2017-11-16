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
  parseBoolean,
  parseByteRange,
  parseDateTime,
  parseDuration,
  parseFrameRate,
  parseIntOrBoolean,
  parseRatio,
  parseString,
} from "./helpers";

import {
  IAdaptationDash,
  IContentComponentDash,
  IContentProtectionDash,
  IPeriodDash,
  IRepresentationDash,
  IRole,
  ISegmentBase,
  ISegmentList,
  ISegmentTemplate,
  ISegmentTimeLine,
  ISegmentURL,
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
) : { media : string; range : undefined } {
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

function parseSchemeIdUriPattern(node: Element): {schemeIdUri: string; value: string} {
  const schemeIdUri = node.getAttribute("schemeIdUri");
  const value = node.getAttribute("value");

  return {
    schemeIdUri: schemeIdUri ? parseString(schemeIdUri) : "",
    value: value ? parseString(value) : "",
  };
}

function feedRole(node: Element): IRole {
  if (node.nodeName !== "Role"){
    throw new Error("Expected 'Role' instead on nodeName: "+node.nodeName);
  }

  return parseSchemeIdUriPattern(node);
}

function feedSegmentURL(node: Element): ISegmentURL {
  if (node.nodeName !== "SegmentURL"){
    throw new Error("Expected 'SegmentURL' instead on nodeName: "+node.nodeName);
  }

  const media = node.getAttribute("media");
  const mediaRange = node.getAttribute("mediaRange");
  const index = node.getAttribute("index");
  const indexRange = node.getAttribute("indexRange");

  return {
    media: media ? parseString(media) : "",
    mediaRange: mediaRange ?
      (parseByteRange(mediaRange) || [0,0]) : [0,0],
    index: index ? parseString(index) : "",
    indexRange: indexRange ?
      (parseByteRange(indexRange) || [0,0]) : [0,0],
  };
}

function feedContentProtection(node: Element): IContentProtectionDash {
  if (node.nodeName !== "ContentProtection"){
    throw new Error(
      "Expected 'ContentProtection' instead on nodeName: "+node.nodeName
    );
  }

  return parseSchemeIdUriPattern(node);
}

function feedSegmentTimeLine(node: Element): ISegmentTimeLine {
  if (node.nodeName !== "S"){
    throw new Error("Expected 'S' instead on nodeName: "+node.nodeName);
  }

  const t = node.getAttribute("t");
  const d = node.getAttribute("d");
  const r = node.getAttribute("r");

  return {
    ts: t ? parseInt(t, 10) : undefined,
    d: d ? parseInt(d, 10) : undefined,
    r: r ? parseInt(r, 10) : undefined,
  };
}

function feedAdaptation(node: Element, base: IAdaptationDash): IAdaptationDash {
  if (node.nodeName !== "AdaptationSet"){
    throw new Error("Expected 'AdaptationSet' instead on nodeName: "+node.nodeName);
  }
  const type = node.getAttribute("type");
  const id = node.getAttribute("id");
  const group = node.getAttribute("group");
  const language = node.getAttribute("lang");
  const normalizedLanguage = node.getAttribute("lang");
  const contentType = node.getAttribute("contentType");
  const par = node.getAttribute("par");
  const minBitrate = node.getAttribute("minBandwidth");
  const maxBitrate = node.getAttribute("maxBandwidth");
  const minWidth = node.getAttribute("minWidth");
  const maxWidth = node.getAttribute("maxWidth");
  const minHeight = node.getAttribute("minHeight");
  const maxHeight = node.getAttribute("maxHeight");
  const minFrameRate = node.getAttribute("minFrameRate");
  const maxFrameRate = node.getAttribute("maxFrameRate");
  const segmentAlignment = node.getAttribute("segmentAlignement");
  const subsegmentAlignment = node.getAttribute("subsegmentAlignment");
  const bitstreamSwitching = node.getAttribute("bitstreamSwitching");
  const profiles = node.getAttribute("profiles");
  const width = node.getAttribute("width");
  const height = node.getAttribute("height");
  const frameRate = node.getAttribute("frameRate");
  const audioSamplingRate = node.getAttribute("audioSamplingRate");
  const mimeType = node.getAttribute("mimeType");
  const segmentProfiles = node.getAttribute("segmentProfiles");
  const codecs = node.getAttribute("codecs");
  const maximumSAPPeriod = node.getAttribute("maximumSAPPeriod");
  const maxPlayoutRate = node.getAttribute("maxPlayoutRate");
  const codingDependency = node.getAttribute("codingDependency");

  return {
    baseURL: base.baseURL,
    id: (base.id !== "") ? base.id : (id ? parseString(id) : ""),
    type: type ? parseString(type) : "",
    index: base.index,
    mimeType: (base.mimeType !== "" && base.mimeType != null) ?
      base.mimeType :
      (mimeType ? parseString(mimeType) : null),
    representations: base.representations,
    group: group ? parseInt(group, 10) : undefined,
    language: language ? parseString(language) : undefined,
    normalizedLanguage: normalizedLanguage ?
      normalizeLang(normalizedLanguage) :
      undefined,
    contentType: contentType ? parseString(contentType) : undefined,
    par: par ? parseRatio(par) : undefined,
    minBitrate: minBitrate ? parseInt(minBitrate, 10) : undefined,
    maxBitrate: maxBitrate ? parseInt(maxBitrate, 10) : undefined,
    minWidth: minWidth ? parseInt(minWidth, 10) : undefined,
    maxWidth: maxWidth ? parseInt(maxWidth, 10) : undefined,
    minHeight: minHeight ? parseInt(minHeight, 10) : undefined,
    maxHeight: maxHeight ? parseInt(maxHeight, 10) : undefined,
    minFrameRate: minFrameRate ? parseFrameRate(minFrameRate) : undefined,
    maxFrameRate: maxFrameRate ? parseFrameRate(maxFrameRate) : undefined,
    segmentAlignment: segmentAlignment ? parseIntOrBoolean(segmentAlignment) : undefined,
    subsegmentAlignment: subsegmentAlignment ?
      parseIntOrBoolean(subsegmentAlignment) :
      undefined,
    bitstreamSwitching: bitstreamSwitching ? parseBoolean(bitstreamSwitching) : undefined,
    profiles: profiles ? parseString(profiles) : undefined,
    width: width ? parseInt(width, 10) : undefined,
    height: height ? parseInt(height, 10) : undefined,
    frameRate: frameRate ? parseFrameRate(frameRate) : undefined,
    audioSamplingRate: audioSamplingRate ? parseString(audioSamplingRate) : undefined,
    segmentProfiles: segmentProfiles ? parseString(segmentProfiles) : undefined,
    codecs: codecs ? parseString(codecs) : undefined,
    maximumSAPPeriod: maximumSAPPeriod ? parseFloat(maximumSAPPeriod) : undefined,
    maxPlayoutRate: maxPlayoutRate ? parseFloat(maxPlayoutRate) : undefined,
    codingDependency: codingDependency ? parseBoolean(codingDependency) : undefined,
  };
}

function feedRepresentation(
  node: Element,
  base: IRepresentationDash
): IRepresentationDash {
  if (node.nodeName !== "Representation"){
    throw new Error("Expected 'Representation' instead on nodeName: "+node.nodeName);
  }

  const profiles = node.getAttribute("profiles");
  const width = node.getAttribute("width");
  const height = node.getAttribute("height");
  const frameRate = node.getAttribute("frameRate");
  const audioSamplingRate = node.getAttribute("audioSamplingRate");
  const mimeType = node.getAttribute("mimeType");
  const segmentProfiles = node.getAttribute("segmentProfiles");
  const codecs = node.getAttribute("codecs");
  const maximumSAPPeriod = node.getAttribute("maximumSAPPeriod");
  const maxPlayoutRate = node.getAttribute("maxPlayoutRate");
  const codingDependency = node.getAttribute("codingDependency");
  const id = node.getAttribute("id");
  const bitrate = node.getAttribute("bandwidth");
  const qualityRanking = node.getAttribute("qualityRanking");

  return {
    baseURL: base.baseURL,
    id: (base.id !== "" && base.id != null) ?
      base.id :
      (id ? parseString(id) : ""),
    index: base.index,
    mimeType: (base.mimeType !== "" && base.mimeType != null) ?
      base.mimeType :
      (mimeType ? parseString(mimeType) : null),
    bitrate: bitrate ? parseInt(bitrate, 10) : undefined,
    qualityRanking: qualityRanking ? parseInt(qualityRanking, 10) : undefined,
    profiles: profiles ? parseString(profiles) : undefined,
    width: width ? parseInt(width, 10) : undefined,
    height: height ? parseInt(height, 10) : undefined,
    frameRate: frameRate ? parseFrameRate(frameRate) : undefined,
    audioSamplingRate: audioSamplingRate ? parseString(audioSamplingRate) : undefined,
    segmentProfiles: segmentProfiles ? parseString(segmentProfiles) : undefined,
    codecs: codecs ? parseString(codecs) : undefined,
    maximumSAPPeriod: maximumSAPPeriod ? parseFloat(maximumSAPPeriod) : undefined,
    maxPlayoutRate: maxPlayoutRate ? parseFloat(maxPlayoutRate) : undefined,
    codingDependency: codingDependency ? parseBoolean(codingDependency) : undefined,
  };
}

function feedMPD(
  node: Element,
  base: IParsedManifest
): IParsedManifest {

const id = node.getAttribute("id");
const profiles = node.getAttribute("profiles");
const type = node.getAttribute("type");
const availabilityStartTime = node.getAttribute("availabilityStartTime");
const availabilityEndTime = node.getAttribute("availabilityEndTime");
const publishTime = node.getAttribute("publishTime");
const duration = node.getAttribute("mediaPresentationDuration");
const minimumUpdatePeriod = node.getAttribute("minimumUpdatePeriod");
const minBufferTime = node.getAttribute("minBufferTime");
const timeShiftBufferDepth = node.getAttribute("timeShiftBufferDepth");
const maxSegmentDuration = node.getAttribute("maxSegmentDuration");
const maxSubsegmentDuration = node.getAttribute("maxSubsegmentDuration");
const suggestedPresentationDelay = node.getAttribute("suggestedPresentationDelay");

return {
  transportType: base.transportType,
  periods: base.periods,
  locations: base.locations,
  id: id ? parseString(id) : undefined,
  profiles: profiles ? parseString(profiles) : undefined,
  type: type ? parseString(type) : "static",
  availabilityStartTime: availabilityStartTime ?
    parseDateTime(availabilityStartTime) :
    undefined,
  availabilityEndTime: availabilityEndTime ?
    parseDateTime(availabilityEndTime) :
    undefined,
  publishTime: publishTime ? parseDateTime(publishTime) : undefined,
  duration: duration ? parseDuration(duration) : undefined,
  minimumUpdatePeriod: minimumUpdatePeriod ?
    parseDuration(minimumUpdatePeriod) :
      undefined,
  minBufferTime: minBufferTime ? parseDuration(minBufferTime) : undefined,
  timeShiftBufferDepth : timeShiftBufferDepth ?
    parseDuration(timeShiftBufferDepth) :
    undefined,
  maxSegmentDuration : maxSegmentDuration ? parseDuration(maxSegmentDuration) : undefined,
  maxSubsegmentDuration : maxSubsegmentDuration ?
    parseDuration(maxSubsegmentDuration) :
    undefined,
  suggestedPresentationDelay: suggestedPresentationDelay ?
    parseDuration(suggestedPresentationDelay) :
    config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.DASH,
};
}

function feedPeriod(
  node: Element,
  base: IPeriodDash): IPeriodDash {

    const id = node.getAttribute("id");
    const start = node.getAttribute("start");
    const duration = node.getAttribute("duration");
    const bitstreamSwitching = node.getAttribute("bitstreamSwitching");

    return {
      id: id ? parseString(id) : null,
      adaptations: base.adaptations,
      baseURL: base.baseURL,
      start: start ? parseDuration(start) : undefined,
      duration: duration ? parseDuration(duration) : undefined,
      bitstreamSwitching: bitstreamSwitching ?
        parseBoolean(bitstreamSwitching) :
        undefined,
    };
}

function feedContentComponent(
  node: Element
): IContentComponentDash {
  const id = node.getAttribute("id");
  const lang = node.getAttribute("lang");
  const contentType = node.getAttribute("contentType");
  const par = node.getAttribute("par");

  return {
    id: id ? parseString(id) : "",
    language: lang ? parseString(lang) : undefined,
    normalizedLanguage: lang ? normalizeLang(lang) : undefined,
    contentType: contentType ? parseString(contentType) : undefined,
    par: par ? parseRatio(par) : undefined,
  };
}

function feedSegmentBase(
  node: Element
): ISegmentBase {
  const timescale = node.getAttribute("timescale");
  const timeShiftBufferDepth = node.getAttribute("timeShiftBufferDepth");
  const presentationTimeOffset = node.getAttribute("presentationTimeOffset");
  const indexRange = node.getAttribute("indexRange");
  const indexRangeExact = node.getAttribute("indexRangeExact");
  const availabilityTimeOffset = node.getAttribute("availabilityTimeOffset");
  const availabilityTimeComplete = node.getAttribute("availabilityTimeComplete");

  return {
    timeline: [],
    indexType: "base",
    list: [],
    timescale: timescale ? parseInt(timescale, 10) : 1,
    timeShiftBufferDepth: timeShiftBufferDepth ?
      parseDuration(timeShiftBufferDepth) :
      undefined,
    presentationTimeOffset: presentationTimeOffset ?
      parseFloat(presentationTimeOffset) :
      0,
    indexRange: indexRange ?
      (parseByteRange(indexRange) || undefined) : undefined,
    indexRangeExact: indexRangeExact ? parseBoolean(indexRangeExact) : false,
    availabilityTimeOffset: availabilityTimeOffset ?
      parseFloat(availabilityTimeOffset) :
      undefined,
    availabilityTimeComplete: availabilityTimeComplete ?
      parseBoolean(availabilityTimeComplete) :
      true,
  };
}

function feedSegmentTemplate(
  node: Element
): ISegmentTemplate {

    const timescale = node.getAttribute("timescale");
    const timeShiftBufferDepth = node.getAttribute("timeShiftBufferDepth");
    const presentationTimeOffset = node.getAttribute("presentationTimeOffset");
    const indexRange = node.getAttribute("indexRange");
    const indexRangeExact = node.getAttribute("indexRangeExact");
    const availabilityTimeOffset = node.getAttribute("availabilityTimeOffset");
    const availabilityTimeComplete = node.getAttribute("availabilityTimeComplete");
    const duration = node.getAttribute("duration");
    const startNumber = node.getAttribute("startNumber");
    const initialization = node.getAttribute("initialization");
    const index = node.getAttribute("index");
    const bitstreamSwitching = node.getAttribute("bitstreamSwitching");
    const media = node.getAttribute("media");

    return {
      timeline: [],
      list: [],
      timescale: timescale ? parseInt(timescale, 10) : 1,
      timeShiftBufferDepth: timeShiftBufferDepth ?
        parseDuration(timeShiftBufferDepth) :
        undefined,
      presentationTimeOffset: presentationTimeOffset ?
        parseFloat(presentationTimeOffset) :
        undefined,
      indexRange: indexRange ?
        (parseByteRange(indexRange) || undefined) : undefined,
      indexRangeExact: indexRangeExact ? parseBoolean(indexRangeExact) : false,
      availabilityTimeOffset: availabilityTimeOffset ?
        parseFloat(availabilityTimeOffset) :
        undefined,
      availabilityTimeComplete: availabilityTimeComplete ?
        parseBoolean(availabilityTimeComplete) :
        true,
      duration: duration ? parseInt(duration, 10) : undefined,
      startNumber: startNumber ? parseInt(startNumber, 10) : undefined,
      initialization: initialization ?
        parseInitializationAttribute(initialization) :
        undefined,
      index: index ? parseString(index) : undefined,
      bitstreamSwitching: bitstreamSwitching ? parseString(bitstreamSwitching): undefined,
      media: media ? parseString(media) : undefined,
    };
}

function feedSegmentList(node: Element)
: ISegmentList {

  const timescale = node.getAttribute("timescale");
  const timeShiftBufferDepth = node.getAttribute("timeShiftBufferDepth");
  const presentationTimeOffset = node.getAttribute("presentationTimeOffset");
  const indexRange = node.getAttribute("indexRange");
  const indexRangeExact = node.getAttribute("indexRangeExact");
  const availabilityTimeOffset = node.getAttribute("availabilityTimeOffset");
  const availabilityTimeComplete = node.getAttribute("availabilityTimeComplete");
  const duration = node.getAttribute("duration");
  const startNumber = node.getAttribute("startNumber");

  return {
    list: [],
    timeline: [],
    timescale: timescale ? parseInt(timescale, 10) : 1,
    timeShiftBufferDepth: timeShiftBufferDepth ?
      parseDuration(timeShiftBufferDepth) :
      undefined,
    presentationTimeOffset: presentationTimeOffset ?
      parseFloat(presentationTimeOffset) :
      undefined,
    indexRange: indexRange ?
      (parseByteRange(indexRange) || undefined) : undefined,
    indexRangeExact: indexRangeExact ? parseBoolean(indexRangeExact) : false,
    availabilityTimeOffset: availabilityTimeOffset ?
      parseFloat(availabilityTimeOffset) :
      undefined,
    availabilityTimeComplete: availabilityTimeComplete ?
      parseBoolean(availabilityTimeComplete) :
      true,
    duration: duration ? parseInt(duration, 10) : undefined,
    startNumber: startNumber ? parseInt(startNumber, 10) : undefined,
  };
}

function feedSegmentNode(node: Element): ISegmentBase|ISegmentTemplate|ISegmentList {
  switch(node.nodeName) {
    case "SegmentBase": return feedSegmentBase(node);
    case "SegmentTemplate": return feedSegmentTemplate(node);
    case "SegmentList": return feedSegmentList(node);
    default: throw new Error("Invalid segment element.");
  }
}

export default feedAttributes;

export {
  feedRole,
  feedSegmentURL,
  feedContentProtection,
  feedSegmentTimeLine,
  feedAdaptation,
  feedRepresentation,
  feedMPD,
  feedPeriod,
  feedContentComponent,
  feedSegmentBase,
  feedSegmentTemplate,
  feedSegmentNode,
};
