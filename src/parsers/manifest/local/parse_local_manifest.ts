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

import type { ITrackType } from "../../../public_types";
import idGenerator from "../../../utils/id_generator";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import type {
  IContentProtections,
  IContentProtectionInitData,
  IParsedTrack,
  IParsedManifest,
  IParsedPeriod,
  IParsedRepresentation,
  IParsedVariantStreamMetadata,
} from "../types";
import LocalRepresentationIndex from "./representation_index";
import type {
  IContentProtections as ILocalContentProtections,
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
  localManifest: ILocalManifest,
): IParsedManifest {
  if (localManifest.type !== "local") {
    throw new Error("Invalid local manifest given. It misses the `type` property.");
  }
  if (localManifest.version !== "0.2") {
    throw new Error(
      `The current Local Manifest version (${localManifest.version})` +
        " is not compatible with the current version of the RxPlayer",
    );
  }
  const periodIdGenerator = idGenerator();
  const { minimumPosition, maximumPosition, isFinished } = localManifest;
  const parsedPeriods = localManifest.periods.map((period) =>
    parsePeriod(period, { periodIdGenerator }),
  );

  return {
    availabilityStartTime: 0,
    expired: localManifest.expired,
    transportType: "local",
    isDynamic: !isFinished,
    isLastPeriodKnown: true,
    isLive: false,
    uris: [],
    timeBounds: {
      minimumSafePosition: minimumPosition ?? 0,
      timeshiftDepth: null,
      maximumTimeData: {
        isLinear: false,
        maximumSafePosition: maximumPosition,
        livePosition: undefined,
        time: getMonotonicTimeStamp(),
      },
    },
    periods: parsedPeriods,
  };
}

/**
 * @param {Object} period
 * @param {Object} ctxt
 * @returns {Object}
 */
function parsePeriod(
  period: ILocalPeriod,
  ctxt: { periodIdGenerator: () => string /* Generate next Period's id */ },
): IParsedPeriod {
  const trackIdGenerator = idGenerator();

  const tracksMetadata = period.adaptations.reduce<
    Record<"audio" | "video" | "text", IParsedTrack[]>
  >(
    (acc, ada) => {
      const parsed = parseAdaptation(ada, { trackIdGenerator });
      acc[ada.type].push(parsed);
      return acc;
    },
    { audio: [], video: [], text: [] },
  );
  const getMediaForType = (type: ITrackType) => {
    return tracksMetadata[type].map((t) => {
      return {
        id: t.id,
        linkedTrack: t.id,
        representations: t.representations.map((r) => r.id),
      };
    });
  };
  const variantStream: IParsedVariantStreamMetadata = {
    id: "0",
    bandwidth: undefined,
    media: {
      audio: getMediaForType("audio"),
      video: getMediaForType("video"),
      text: getMediaForType("text"),
    },
  };
  return {
    id: "period-" + ctxt.periodIdGenerator(),

    start: period.start,
    end: period.end,
    duration: period.end - period.start,
    variantStreams: [variantStream],
    tracksMetadata,
  };
}

/**
 * @param {Object} adaptation
 * @param {Object} ctxt
 * @returns {Object}
 */
function parseAdaptation(
  adaptation: ILocalAdaptation,
  ctxt: {
    trackIdGenerator: () => string /* Generate next track's id */;
  },
): IParsedTrack {
  const representationIdGenerator = idGenerator();
  return {
    id: "track-" + ctxt.trackIdGenerator(),
    trackType: adaptation.type,
    isAudioDescription: adaptation.audioDescription,
    isClosedCaption: adaptation.closedCaption,
    language: adaptation.language,
    representations: adaptation.representations.map((representation) =>
      parseRepresentation(representation, { representationIdGenerator }),
    ),
  };
}

/**
 * @param {Object} representation
 * @returns {Object}
 */
function parseRepresentation(
  representation: ILocalRepresentation,
  ctxt: { representationIdGenerator: () => string },
): IParsedRepresentation {
  const id = "representation-" + ctxt.representationIdGenerator();
  const contentProtections =
    representation.contentProtections === undefined
      ? undefined
      : formatContentProtections(representation.contentProtections);
  return {
    id,
    cdnMetadata: null,
    bitrate: representation.bitrate,
    height: representation.height,
    width: representation.width,
    codecs: representation.codecs,
    isSpatialAudio: representation.isSpatialAudio,
    mimeType: representation.mimeType,
    index: new LocalRepresentationIndex(representation.index, id),
    contentProtections,
  };
}

/**
 * Translate Local Manifest's `contentProtections` attribute to the one defined
 * for a `Manifest` structure.
 * @param {Object} localContentProtections
 * @returns {Object}
 */
function formatContentProtections(
  localContentProtections: ILocalContentProtections,
): IContentProtections {
  const keyIds = localContentProtections.keyIds;
  const initData: IContentProtectionInitData[] = Object.keys(
    localContentProtections.initData,
  ).map((currType) => {
    const localInitData = localContentProtections.initData[currType] ?? [];
    return { type: currType, values: localInitData };
  });
  return { keyIds, initData };
}
