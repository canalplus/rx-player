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

/**
 * Keys in a parsed manifest are, after parsing, filtered to only the keys
 * actually used to simplify manifest management and debugging in the core.
 *
 * This allows to clearly see what manifest property is exploited in this player
 * for now and allows a cleaner management down the line. It also allows to
 * greatly simplify the update / creation of other streaming technologies
 * (MSS, HLS...) for this player, as they should all give the same properties.
 *
 * The arrays of strings declared here are the keys used in each type of object
 * (periods, adaptations, etc.).
 *
 * NOTE: This object can be totally removed without losing any feature. It had
 * mainly been added to simplify debugging.
 */
const FILTERED_KEYS = {

  /**
   * Every keys in a returned manifest (@see parseMDP).
   * The commented ones are the ones available here but not yet exploited.
   */
  MPD: [
    // "availabilityEndTime",
    // "minimumUpdatePeriod",
    // "profiles",
    // "publishTime",
    // "maxSegmentDuration",
    // "maxSubsegmentDuration",
    // "minBufferTime",
    "availabilityStartTime",
    "baseURL",
    "duration",
    "id",
    "locations",
    "periods",
    "presentationLiveGap",
    "suggestedPresentationDelay",
    "timeShiftBufferDepth",
    "transportType",
    "type",
  ],

  /**
   * Every keys in a returned period (@see parsePeriod).
   * The commented ones are the ones available here but not yet exploited.
   */
  PERIOD: [
    // "bitstreamSwitching",
    "adaptations",
    "baseURL",
    "duration",
    "id",
    "start",
  ],

  /**
   * Every keys in a returned adaptation (@see parseAdaptationSet).
   * The commented ones are the ones available here but not yet exploited.
   */
  ADAPTATION: [
    // "audioSamplingRate",
    // "bitstreamSwitching",
    // "codingDependency",
    // "contentComponent",
    // "contentType",
    // "frameRate",
    // "group",
    // "maxBitrate",
    // "maxFrameRate",
    // "maxHeight",
    // "maxPlayoutRate",
    // "maxWidth",
    // "maximumSAPPeriod",
    // "minBitrate",
    // "minFrameRate",
    // "minHeight",
    // "minWidth",
    // "par",
    // "profiles",
    // "role",
    // "segmentAlignment",
    // "segmentProfiles",
    // "subsegmentAlignment",
    "contentProtection",
    "accessibility",
    "baseURL",
    "contentProtection",
    "id",
    "language",
    "normalizedLanguage",
    "representations",
    "type",
  ],

  /**
   * Every keys in a returned representation (@see parseRepresentation).
   * The commented ones are the ones available here but not yet exploited.
   */
  REPRESENTATION: [
    // "audioSamplingRate",
    // "codingDependency",
    // "frameRate",
    // "maxPlayoutRate",
    // "maximumSAPPeriod",
    // "profiles",
    // "qualityRanking",
    // "segmentProfiles",
    "bitrate",
    "baseURL",
    "codecs",
    "height",
    "id",
    "index",
    "mimeType",
    "width",
  ],
};

/**
 * Create filter function for a corresponding FILTERED_KEYS array
 * of string.
 * @param {Array.<string>} filter - Array containing only the keys to filter in.
 * @returns {Function} - Function taking in argument an object and applying the
 * filter on it (keeping only the declared keys).
 */
const createFilter = (filter) => (obj) =>
  filter.reduce((acc, key) => {
    if (obj.hasOwnProperty(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});

export const filterMPD = createFilter(FILTERED_KEYS.MPD);
export const filterPeriod = createFilter(FILTERED_KEYS.PERIOD);
export const filterAdaptation = createFilter(FILTERED_KEYS.ADAPTATION);
export const filterRepresentation = createFilter(FILTERED_KEYS.REPRESENTATION);
