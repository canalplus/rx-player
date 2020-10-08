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

import idGenerator from "../../../utils/id_generator";

import {
  IParsedAdaptation,
  IParsedManifest,
  IParsedPeriod,
  IParsedRepresentation,
} from "../types";
import LocalRepresentationIndex from "./representation_index";
import {
  ILocalAdaptation,
  ILocalManifest,
  ILocalPeriod,
  ILocalRepresentation,
} from "./types";

/**
 * @param {Object} localManifest
 * @returns {Object}
 */
export default function parseLocalManifest(
  localManifest : ILocalManifest
) : IParsedManifest {
  if (localManifest.type !== "local") {
    throw new Error("Invalid local manifest given. It misses the `type` property.");
  }
  if (localManifest.version !== "0.2") {
    throw new Error(`The current Local Manifest version (${localManifest.version})` +
                    " is not compatible with the current version of the RxPlayer");
  }
  const periodIdGenerator = idGenerator();

  const { minimumPosition,
          maximumPosition,
          isFinished } = localManifest;
  const manifest: IParsedManifest = {
    availabilityStartTime: 0,
    expired: localManifest.expired,
    transportType: "local",
    isDynamic: !localManifest.isFinished,
    isLive: false,
    uris: [],
    periods: localManifest.periods
      .map(period => parsePeriod(period, { periodIdGenerator,
                                           isFinished })),
    minimumTime: { isContinuous : false,
                   value : minimumPosition !== undefined ? minimumPosition :
                                                           0,
                   time : performance.now() },
  };
  if (maximumPosition !== undefined) {
    manifest.maximumTime = { isContinuous: false,
                             value : maximumPosition,
                             time : performance.now() };
  }
  return manifest;
}

/**
 * @param {Object} period
 * @param {Object} ctxt
 * @returns {Object}
 */
function parsePeriod(
  period : ILocalPeriod,
  ctxt : { /** Generate next Period's id */
           periodIdGenerator : () => string;
           /** If true, the local Manifest has been fully downloaded. */
           isFinished : boolean; }
) : IParsedPeriod {
  const { isFinished } = ctxt;
  const adaptationIdGenerator = idGenerator();
  return {
    id: "period-" + ctxt.periodIdGenerator(),

    start: period.start,
    end: period.end,
    duration: period.end - period.start,
    adaptations: period.adaptations
      .reduce<Partial<Record<string, IParsedAdaptation[]>>>((acc, ada) => {
        const type = ada.type;
        let adaps = acc[type];
        if (adaps === undefined) {
          adaps = [];
          acc[type] = adaps;
        }
        adaps.push(parseAdaptation(ada, { adaptationIdGenerator,
                                          isFinished }));
        return acc;
      }, {}),
  };
}

/**
 * @param {Object} adaptation
 * @param {Object} ctxt
 * @returns {Object}
 */
function parseAdaptation(
  adaptation : ILocalAdaptation,
  ctxt : { /** Generate next Adaptation's id */
           adaptationIdGenerator : () => string;
           /** If true, the local Manifest has been fully downloaded. */
           isFinished : boolean; }
) : IParsedAdaptation {
  const { isFinished } = ctxt;
  const representationIdGenerator = idGenerator();
  return {
    id: "adaptation-" + ctxt.adaptationIdGenerator(),
    type: adaptation.type,
    audioDescription: adaptation.audioDescription,
    closedCaption: adaptation.closedCaption,
    language: adaptation.language,
    representations: adaptation.representations.map((representation) =>
      parseRepresentation(representation, { representationIdGenerator,
                                            isFinished })),
  };
}

/**
 * @param {Object} representation
 * @returns {Object}
 */
function parseRepresentation(
  representation : ILocalRepresentation,
  ctxt : { /** Generate next Adaptation's id */
           representationIdGenerator : () => string;
           /** If true, the local Manifest has been fully downloaded. */
           isFinished : boolean; }
) : IParsedRepresentation {
  const { isFinished } = ctxt;
  const id = "representation-" + ctxt.representationIdGenerator();
  return { id,
           bitrate: representation.bitrate,
           height: representation.height,
           width: representation.width,
           codecs: representation.codecs,
           mimeType: representation.mimeType,
           index: new LocalRepresentationIndex(representation.index, id, isFinished),
           contentProtections: representation.contentProtections };
}
