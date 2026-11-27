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

import log from "../../log.ts";
import { getNextBoxOffsets } from "../../parsers/containers/isobmff/index.ts";
import { be4toi, concat } from "../../utils/byte_parsing.ts";
import type { IMediaKeySession } from "../browser_compatibility_types.ts";
import { PSSH_TO_INTEGER } from "./constants.ts";

/**
 * Modify "initialization data" sent to a `generateKeyRequest` EME call to
 * improve the player's browser compatibility:
 *
 *   1. some browsers/CDM have problems when the CENC PSSH box is the first
 *      encountered PSSH box in the initialization data (for the moment just
 *      Edge was noted with this behavior).
 *      We found however that it works on every browser when the CENC pssh
 *      box(es) is/are the last box(es) encountered.
 *
 *      To that end, we move CENC pssh boxes at the end of the initialization
 *      data in this function.
 *
 *   2. Some poorly encoded/packaged contents communicate both a CENC with a
 *      pssh version of 0 and one with a version of 1. We found out that this is
 *      not always well handled on some devices/browsers (on Edge and some other
 *      embedded devices that shall remain nameless for now!).
 *
 *      Here this function will filter out CENC pssh with a version different to
 *      1 when one(s) with a version of 1 is/are already present.
 *
 * If the initData is unrecognized or if a CENC PSSH is not found, this function
 * throws.
 * @param {Uint8Array} initData - Initialization data you want to patch
 * @returns {Uint8Array} - Initialization data, patched
 */
export function patchInitData(
  initData: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> {
  log.info("DRM", "Trying to move CENC PSSH from init data at the end of it.");
  let foundCencV1 = false;
  let concatenatedCencs = new Uint8Array();
  let resInitData = new Uint8Array();
  /** Box going until the end of the data (size of `0`), kept last. */
  let lastBox = new Uint8Array();

  let offset = 0;
  while (offset < initData.length) {
    if (
      initData.length < offset + 8 ||
      be4toi(initData, offset + 4) !== PSSH_TO_INTEGER
    ) {
      log.warn("DRM", "unrecognized initialization data. Cannot patch it.");
      throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
    }

    let boxOffsets;
    try {
      boxOffsets = getNextBoxOffsets(initData.subarray(offset));
    } catch (err) {
      log.warn(
        "DRM",
        "unrecognized initialization data. Cannot patch it.",
        err instanceof Error ? err : "",
      );
      throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
    }
    if (boxOffsets === null || offset + boxOffsets[2] > initData.length) {
      log.warn("DRM", "unrecognized initialization data. Cannot patch it.");
      throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
    }
    const [, headerSize, len] = boxOffsets;
    // A size of `0` means that the box goes until the end of the data
    const goesToEnd = be4toi(initData, offset) === 0;

    if (len < headerSize + 20) {
      // Too small to contain a system ID. Drop it: some browsers reject the
      // whole initialization data because of such box.
      log.warn("DRM", "dropping PSSH too small to contain a system ID", len);
      offset += len;
      continue;
    }

    const currentPSSH: Uint8Array<ArrayBuffer> = initData.subarray(offset, offset + len);
    const systemIdOffset = offset + headerSize + 4; // after version and flags
    // yep
    if (
      initData[systemIdOffset] === 0x10 &&
      initData[systemIdOffset + 1] === 0x77 &&
      initData[systemIdOffset + 2] === 0xef &&
      initData[systemIdOffset + 3] === 0xec &&
      initData[systemIdOffset + 4] === 0xc0 &&
      initData[systemIdOffset + 5] === 0xb2 &&
      initData[systemIdOffset + 6] === 0x4d &&
      initData[systemIdOffset + 7] === 0x02 &&
      initData[systemIdOffset + 8] === 0xac &&
      initData[systemIdOffset + 9] === 0xe3 &&
      initData[systemIdOffset + 10] === 0x3c &&
      initData[systemIdOffset + 11] === 0x1e &&
      initData[systemIdOffset + 12] === 0x52 &&
      initData[systemIdOffset + 13] === 0xe2 &&
      initData[systemIdOffset + 14] === 0xfb &&
      initData[systemIdOffset + 15] === 0x4b
    ) {
      const version = currentPSSH[headerSize];
      log.info("DRM", "CENC PSSH found with version", version);
      if (foundCencV1 === (version === 1)) {
        // Either `concatenatedCencs` only contains v1 or does not contain any
        concatenatedCencs = concat(concatenatedCencs, currentPSSH);
      } else if (version === 1) {
        log.warn(
          "DRM",
          "cenc version 1 encountered, " + "removing every other cenc pssh box.",
        );
        concatenatedCencs = currentPSSH;
        foundCencV1 = true;
      } else {
        log.warn("DRM", "filtering out cenc pssh box with wrong version", version);
      }
    } else if (goesToEnd) {
      // Its size says that it goes until the end of the data: nothing can be
      // put after it.
      lastBox = currentPSSH;
    } else {
      resInitData = concat(resInitData, currentPSSH);
    }
    offset += len;
  }

  if (offset !== initData.length) {
    log.warn("DRM", "unrecognized initialization data. Cannot patch it.");
    throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
  }
  if (
    resInitData.length === 0 &&
    concatenatedCencs.length === 0 &&
    lastBox.length === 0
  ) {
    log.warn("DRM", "no usable PSSH in initialization data. Cannot patch it.");
    throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
  }
  return concat(resInitData, concatenatedCencs, lastBox);
}

/**
 * Generate a request from session.
 * @param {MediaKeySession} session - MediaKeySession on which the request will
 * be done.
 * @param {string} initializationDataType - Initialization data type given e.g.
 * by the "encrypted" event for the corresponding request.
 * @param {Uint8Array} initializationData - Initialization data given e.g. by
 * the "encrypted" event for the corresponding request.
 * @returns {Promise} - Emit when done. Errors if fails.
 */
export default function generateKeyRequest(
  session: IMediaKeySession,
  initializationDataType: string | undefined,
  initializationData: Uint8Array<ArrayBuffer>,
): Promise<unknown> {
  let patchedInit: Uint8Array<ArrayBuffer>;
  try {
    patchedInit = patchInitData(initializationData);
  } catch (_e) {
    patchedInit = initializationData;
  }
  const initDataType = initializationDataType ?? "";
  log.debug("DRM", "Calling generateRequest on the MediaKeySession");
  return session
    .generateRequest(initDataType, patchedInit)
    .catch((error) => {
      if (initDataType !== "" || !(error instanceof TypeError)) {
        throw error;
      }

      // On newer EME versions of the specification, the initialization data
      // type given to generateRequest cannot be an empty string (it returns
      // a rejected promise with a TypeError in that case).
      // Retry with a default "cenc" value for initialization data type if
      // we're in that condition.
      log.warn(
        "DRM",
        "error while calling `generateRequest` with an empty " +
          'initialization data type. Retrying with a default "cenc" value.',
        error,
      );
      return session.generateRequest("cenc", patchedInit);
    })
    .then(
      (result) => {
        log.debug("DRM", "generateRequest succeeded");
        return result;
      },
      (error: unknown) => {
        log.debug("DRM", "generateRequest failed");
        throw error;
      },
    );
}
