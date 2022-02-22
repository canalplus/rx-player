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

import log from "../log";
import { IRepresentation } from "../manifest";
import objectAssign from "../utils/object_assign";
import {
  isChromeCast,
  isSafariDesktop,
  isSafariMobile,
} from "./browser_detection";
import isNode from "./is_node";

/**
 * Object allowing to store short-term information on decoding capabilities, to
 * avoid calling multiple times the same API when video characteristics are
 * similar.
 */
let VideoDecodingInfoMemory : IVideoDecodingCharacteristics = {};

/**
 * Contains the timeout id of the timer used to clear `VideoDecodingInfoMemory`.
 */
let VideoCapabilitiesTimeout : number | undefined;

/**
 * If `false`, MediaCapability APIs cannot be relied on.
 * Most of the exception here are set due to Shaka-Player also avoiding to use
 * the API on them.
 */
const CanUseMediaCapabilitiesApi = !isNode &&
                                   !isChromeCast &&
                                   !isSafariMobile &&
                                   !isSafariDesktop &&
                                   typeof navigator.mediaCapabilities === "object";

/**
 * Use the `MediaCapabilities` web APIs to detect if the given Representation is
 * supported or not.
 * Returns `true` if it is supported, false it is not and `undefined if it
 * cannot tell.
 * @param {Object} representation
 * @param {string} adaptationType
 * @returns {Promise.<boolean|undefined>}
 */
export default async function checkDecodingCapabilitiesSupport(
  representation : IRepresentation,
  adaptationType : "audio" | "video"
) : Promise<boolean | undefined> {
  if (!CanUseMediaCapabilitiesApi || adaptationType !== "video") {
    return undefined;
  }
  const mimeTypeStr = representation.getMimeTypeString();
  const tmpFrameRate = representation.frameRate !== undefined ?
    parseMaybeDividedNumber(representation.frameRate) :
    null;
  const framerate = tmpFrameRate !== null &&
                    !isNaN(tmpFrameRate) &&
                    isFinite(tmpFrameRate) ? tmpFrameRate :
                                             1;
  const width = representation.width ?? 1;
  const height = representation.height ?? 1;
  const bitrate = representation.bitrate ?? 1;

  const decodingForMimeType = VideoDecodingInfoMemory[mimeTypeStr];
  if (decodingForMimeType === undefined) {
    return runCheck();
  }
  for (const characteristics of decodingForMimeType) {
    if (characteristics.bitrate === bitrate &&
        characteristics.width === width &&
        characteristics.height === height &&
        characteristics.framerate === framerate)
    {
      return characteristics.result.supported;
    }
  }

  async function runCheck() : Promise<boolean> {
    try {
      const videoCharacs = { contentType: mimeTypeStr,
                             width,
                             height,
                             bitrate,
                             framerate };
      const supportObj = await navigator.mediaCapabilities.decodingInfo({
        type: "media-source",
        video: videoCharacs,
      });
      if (VideoDecodingInfoMemory[mimeTypeStr] === undefined) {
        VideoDecodingInfoMemory[mimeTypeStr] = [];
      }
      VideoDecodingInfoMemory[mimeTypeStr].push(objectAssign({ result: supportObj },
                                                             videoCharacs));
      if (VideoCapabilitiesTimeout === undefined) {
        VideoCapabilitiesTimeout = window.setTimeout(() => {
          VideoCapabilitiesTimeout = undefined;
          VideoDecodingInfoMemory = {};
        }, 0);
      }
      return supportObj.supported;
    } catch (err) {
      log.warn("Compat: mediaCapabilities.decodingInfo API failed for video content",
               err);
      throw err;
    }
  }
}

/**
 * Frame rates can be expressed as divisions of integers.
 * This function tries to convert it to a floating point value.
 * TODO in v4, declares `frameRate` as number directly
 * @param {string} val
 * @param {string} displayName
 * @returns {Array.<number | Error | null>}
 */
function parseMaybeDividedNumber(val : string) : number | null {
  const matches = /^(\d+)\/(\d+)$/.exec(val);
  if (matches !== null) {
    // No need to check, we know both are numbers
    return +matches[1] / +matches[2];
  }
  return Number.parseFloat(val);
}

interface IVideoDecodingCharacteristics {
  [x : string] : Array<{ width : number;
                         height : number;
                         bitrate : number;
                         framerate : number;
                         contentType : string;
                         result: MediaCapabilitiesDecodingInfo; }>;
}
