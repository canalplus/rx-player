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
  IBaseAdaptationDash,
  IBasePeriodDash,
  IBaseRepresentationDash,
  IContentComponentDash,
  IContentProtectionDash,
  IMultipleSegmentBase,
  IPeriodDash,
  IRepresentationDash,
  IRole,
  ISegmentBase,
  ISegmentTemplate,
  ISegmentTimeLine,
  ISegmentURL,
} from "../types";

import {
  IBaseManifest,
  IParsedManifest,
} from "../../types";

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

function feedRole(node: Element): IRole {
  if (node.nodeName !== "Role"){
    throw new Error(`Expected 'Role' instead of nodeName: ${node.nodeName}`);
  }

  const schemeIdUri = node.getAttribute("schemeIdUri");
  const value = node.getAttribute("value");

  return {
    schemeIdUri: schemeIdUri ? parseString(schemeIdUri) : "",
    value: value ? parseString(value) : "",
  };
}

function feedContentProtection(node: Element): IContentProtectionDash {
  if (node.nodeName !== "ContentProtection"){
    throw new Error(`Expected 'ContentProtection' instead of nodeName: ${node.nodeName}`);
  }

  const schemeIdUri = node.getAttribute("schemeIdUri");
  const value = node.getAttribute("value");

  return {
    schemeIdUri: schemeIdUri ? parseString(schemeIdUri) : "",
    value: value ? parseString(value) : "",
  };
}

function feedSegmentURL(node: Element): ISegmentURL {
  if (node.nodeName !== "SegmentURL"){
    throw new Error(`Expected 'SegmentURL' instead of nodeName: ${node.nodeName}`);
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

function feedSegmentTimeLine(node: Element): ISegmentTimeLine {
  if (node.nodeName !== "S"){
    throw new Error(`Expected 'S' instead of nodeName: ${node.nodeName}`);
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

function feedAdaptation(node: Element, base: IBaseAdaptationDash): IAdaptationDash {
  if (node.nodeName !== "AdaptationSet"){
    throw new Error(`Expected 'AdaptationSet' instead of nodeName: ${node.nodeName}`);
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
    id: id ? parseString(id) : undefined,
    type: type ? parseString(type) : "",
    index: base.index || null,
    mimeType: mimeType ? parseString(mimeType) : null,
    representations: base.representations || [],
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
  base: IBaseRepresentationDash
): IRepresentationDash {
  if (node.nodeName !== "Representation"){
    throw new Error(`Expected 'Representation' instead of nodeName: ${node.nodeName}`);
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
    id: id ? parseString(id) : undefined,
    index: base.index || null,
    mimeType: mimeType ? parseString(mimeType) : null,
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

function feedMPD(node: Element, base: IBaseManifest): IParsedManifest {
if (node.nodeName !== "MPD"){
  throw new Error(`Expected 'MPD' instead of nodeName: ${node.nodeName}`);
}

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
  transportType: "dash",
  periods: base.periods || [],
  locations: base.locations || [],
  id: id ? parseString(id) :  undefined,
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

function feedPeriod(node: Element, base: IBasePeriodDash): IPeriodDash {
  if (node.nodeName !== "Period"){
    throw new Error(`Expected 'Period' instead of nodeName: ${node.nodeName}`);
  }

  const id = node.getAttribute("id");
  const start = node.getAttribute("start");
  const duration = node.getAttribute("duration");
  const bitstreamSwitching = node.getAttribute("bitstreamSwitching");

  return {
    id: id ? parseString(id) : undefined,
    adaptations: base.adaptations || [],
    baseURL: base.baseURL,
    start: start ? parseDuration(start) : undefined,
    duration: duration ? parseDuration(duration) : undefined,
    bitstreamSwitching: bitstreamSwitching ?
      parseBoolean(bitstreamSwitching) :
      undefined,
  };
}

function feedContentComponent(node: Element): IContentComponentDash {
  if (node.nodeName !== "ContentComponent"){
    throw new Error(`Expected 'ContentComponent' instead of nodeName: ${node.nodeName}`);
  }

  const id = node.getAttribute("id");
  const lang = node.getAttribute("lang");
  const contentType = node.getAttribute("contentType");
  const par = node.getAttribute("par");

  return {
    id: id ? parseString(id) : undefined,
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

function feedSegmentTemplate(node: Element): ISegmentTemplate {
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

function feedSegmentList(node: Element): IMultipleSegmentBase {
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

function feedSegmentNode(node: Element):
  ISegmentBase|
  ISegmentTemplate|
  IMultipleSegmentBase
{
  switch(node.nodeName) {
    case "SegmentBase": return feedSegmentBase(node);
    case "SegmentTemplate": return feedSegmentTemplate(node);
    case "SegmentList": return feedSegmentList(node);
    default: throw new Error("Invalid segment element.");
  }
}

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
