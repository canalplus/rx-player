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

import { isCodecSupported } from "../compat";
import { IContentProtection } from "../core/eme";
import log from "../log";
import { IParsedRepresentation } from "../parsers/manifest";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import {
  IAdaptationType,
  IRepresentation,
} from "./types";

/**
 * Create an `IRepresentation`-compatible object, which will declare a single
 * "Representation" (i.e. quality) of a track.
 * @param {Object} args
 * @param {Object} opts
 * @returns {Object}
 */
export function createRepresentationObject(
  args : IParsedRepresentation,
  opts : { type : IAdaptationType }
) : IRepresentation {
  const representationObj : IRepresentation = {
    id: args.id,
    bitrate: args.bitrate,
    codec: args.codecs,
    index: args.index,
    getMimeTypeString,
    getEncryptionData,
    getAllEncryptionData,
    _addProtectionData,

    // Set first to default `false` value, to have a valid Representation object
    // before calling `isCodecSupported`.
    isCodecSupported: false,
  };

  if (args.height !== undefined) {
    representationObj.height = args.height;
  }

  if (args.width !== undefined) {
    representationObj.width = args.width;
  }

  if (args.mimeType !== undefined) {
    representationObj.mimeType = args.mimeType;
  }

  if (args.contentProtections !== undefined) {
    representationObj.contentProtections = args.contentProtections;
  }

  if (args.frameRate !== undefined) {
    representationObj.frameRate = args.frameRate;
  }

  if (args.hdrInfo !== undefined) {
    representationObj.hdrInfo = args.hdrInfo;
  }

  representationObj.isCodecSupported = opts.type === "audio" ||
                                       opts.type === "video" ?
    isCodecSupported(getMimeTypeString()) :
    true; // TODO for other types
  return representationObj;

  /** @link IRepresentation */
  function getMimeTypeString() : string {
    return `${representationObj.mimeType ?? ""};` +
           `codecs="${representationObj.codec ?? ""}"`;
  }

  /** @link IRepresentation */
  function getEncryptionData(drmSystemId : string) : IContentProtection[] {
    const allInitData = getAllEncryptionData();
    const filtered = [];
    for (let i = 0; i < allInitData.length; i++) {
      let createdObjForType = false;
      const initData = allInitData[i];
      for (let j = 0; j < initData.values.length; j++) {
        if (initData.values[j].systemId.toLowerCase() === drmSystemId.toLowerCase()) {
          if (!createdObjForType) {
            const keyIds = representationObj.contentProtections?.keyIds
              .map(val => val.keyId);
            filtered.push({ type: initData.type,
                            keyIds,
                            values: [initData.values[j]] });
            createdObjForType = true;
          } else {
            filtered[filtered.length - 1].values.push(initData.values[j]);
          }
        }
      }
    }
    return filtered;
  }

  /** @link IRepresentation */
  function getAllEncryptionData() : IContentProtection[] {
    const { contentProtections } = representationObj;
    if (contentProtections === undefined ||
        contentProtections.initData.length === 0)
    {
      return [];
    }
    const keyIds = contentProtections?.keyIds.map(val => val.keyId);
    return contentProtections.initData.map((x) => {
      return { type: x.type,
               keyIds,
               values: x.values };
    });
  }

  /** @link IRepresentation */
  function _addProtectionData(
    initDataType : string,
    data : Array<{
      systemId : string;
      data : Uint8Array;
    }>
  ) : boolean {
    const { contentProtections } = representationObj;
    let hasUpdatedProtectionData = false;
    if (contentProtections === undefined) {
      representationObj.contentProtections = { keyIds: [],
                                               initData: [ { type: initDataType,
                                                             values: data } ] };
      return true;
    }

    const cInitData = contentProtections.initData;
    for (let i = 0; i < cInitData.length; i++) {
      if (cInitData[i].type === initDataType) {
        const cValues = cInitData[i].values;

        // loop through data
        for (let dataI = 0; dataI < data.length; dataI++) {
          const dataToAdd = data[dataI];
          let cValuesIdx;
          for (cValuesIdx = 0; cValuesIdx < cValues.length; cValuesIdx++) {
            if (dataToAdd.systemId === cValues[cValuesIdx].systemId) {
              if (areArraysOfNumbersEqual(dataToAdd.data, cValues[cValuesIdx].data)) {
                // go to next dataToAdd
                break;
              } else {
                log.warn("Manifest: different init data for the same system ID");
              }
            }
          }
          if (cValuesIdx === cValues.length) {
            // we didn't break the loop === we didn't already find that value
            cValues.push(dataToAdd);
            hasUpdatedProtectionData = true;
          }
        }
        return hasUpdatedProtectionData;
      }
    }

    // If we are here, this means that we didn't find the corresponding
    // init data type in this.contentProtections.initData.
    contentProtections.initData.push({ type: initDataType,
                                       values: data });
    return true;
  }
}
