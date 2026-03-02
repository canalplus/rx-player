/**
 * This file contains "dummy" versions of the exported classes imported from
 * this location:
 *
 * - They respect the same API (e.g. a `DummyRepresentation` is a
 *   `Representation`-compliant type).
 *
 * - They're doing no side-effect.
 *
 * - All of their methods throw an error immediately on call (you have to
 *   implement the ones you want, generally through testing tools).
 */
import type { IRepresentationIndex, ISegment } from "../..";
import { makeMockedClass } from "../../../utils/test-utils";
import { ManifestMetadataFormat } from "../../types";
import type Adaptation from "../adaptation";
import type Manifest from "../manifest";
import type Period from "../period";
import type Representation from "../representation";

export const DummyManifest = makeMockedClass<Manifest>(
  {
    addEventListener: notImplemented("addEventListener"),
    removeEventListener: notImplemented("removeEventListener"),
    updateCodecSupport: notImplemented("updateCodecSupport"),
    getPeriod: notImplemented("getPeriod"),
    getPeriodForTime: notImplemented("getPeriodForTime"),
    getNextPeriod: notImplemented("getNextPeriod"),
    getPeriodAfter: notImplemented("getPeriodAfter"),
    getUrls: notImplemented("getUrls"),
    replace: notImplemented("replace"),
    update: notImplemented("update"),
    getMinimumSafePosition: notImplemented("getMinimumSafePosition"),
    getLivePosition: notImplemented("getLivePosition"),
    getMaximumSafePosition: notImplemented("getMaximumSafePosition"),
    updateCodecSupportList: notImplemented("updateCodecSupportList"),
    updateRepresentationsDeciperability: notImplemented(
      "updateRepresentationsDecipherability",
    ),
    addRepresentationsToAvoid: notImplemented("addRepresentationsToAvoid"),
    getAdaptations: notImplemented("getAdaptations"),
    getAdaptation: notImplemented("getAdaptation"),
    getAdaptationsForType: notImplemented("getAdaptationsForType"),
    getMetadataSnapshot: notImplemented("getMetadataSnapshot"),
    getCodecsWithUnknownSupport: notImplemented("getCodecsWithUnknownSupport"),
  },
  {
    id: "n/a",
    manifestFormat: ManifestMetadataFormat.Class,
    transport: "test",
    periods: [],
    expired: null,
    adaptations: {},
    isDynamic: false,
    isLive: false,
    isLastPeriodKnown: true,
    uris: [],
    updateUrl: undefined,
    suggestedPresentationDelay: undefined,
    lifetime: undefined,
    availabilityStartTime: undefined,
    publishTime: undefined,
    clockOffset: undefined,
    timeBounds: {
      minimumSafePosition: undefined,
      timeshiftDepth: null,
      maximumTimeData: {
        livePosition: undefined,
        isLinear: false,
        maximumSafePosition: Number.MAX_SAFE_INTEGER,
        time: 0,
      },
    },
  },
);

export const DummyPeriod = makeMockedClass<Period>(
  {
    getAdaptations: notImplemented("getAdaptations"),
    getAdaptation: notImplemented("getAdaptation"),
    getAdaptationsForType: notImplemented("getAdaptationsForType"),
    getSupportedAdaptations: notImplemented("getSupportedAdaptations"),
    getMetadataSnapshot: notImplemented("getMetadataSnapshot"),
    containsTime: notImplemented("containsTime"),
    refreshCodecSupport: notImplemented("refreshCodecSupport"),
  },
  {
    id: "n/a",
    start: 0,
    adaptations: {},
    streamEvents: [],
    thumbnailTracks: [],
    duration: undefined,
    end: undefined,
  },
);

export const DummyAdaptation = makeMockedClass<Adaptation>(
  {
    getRepresentation: notImplemented("getRepresentation"),
    getMetadataSnapshot: notImplemented("getMetadataSnapshot"),
    refreshCodecSupport: notImplemented("refreshCodecSupport"),
  },
  {
    id: "n/a",
    type: "video",
    representations: [],
    supportStatus: {
      hasCodecWithUndefinedSupport: false,
      hasSupportedCodec: true,
      isDecipherable: undefined,
    },
    isDub: undefined,
    label: undefined,
    language: undefined,
    manuallyAdded: undefined,
    isClosedCaption: undefined,
    trickModeTracks: undefined,
    isTrickModeTrack: undefined,
    isForcedSubtitles: undefined,
    isSignInterpreted: undefined,
    isAudioDescription: undefined,
    normalizedLanguage: undefined,
  },
);

export const DummyRepresentationIndex = makeMockedClass<IRepresentationIndex>(
  {
    getLastAvailablePosition: notImplemented("getLastAvailablePosition"),
    addPredictedSegments: notImplemented("addPredictedSegments"),
    getFirstAvailablePosition: notImplemented("getFirstAvailablePosition"),
    getTargetSegmentDuration: notImplemented("getTargetSegmentDuration"),
    getSegments: notImplemented("getSegments"),
    getEnd: notImplemented("getEnd"),
    getInitSegment: notImplemented("getInitSegment"),
    shouldRefresh: notImplemented("shouldRefresh"),
    isInitialized: notImplemented("isInitialized"),
    isSegmentStillAvailable: notImplemented("isSegmentStillAvailable"),
    initialize: notImplemented("initialize"),
    isStillAwaitingFutureSegments: notImplemented("isStillAwaitingFutureSegments"),
    canBeOutOfSyncError: notImplemented("canBeOutOfSyncError"),
    checkDiscontinuity: notImplemented("checkDiscontinuity"),
    awaitSegmentBetween: notImplemented("awaitSegmentBetween"),
    _replace: notImplemented("_replace"),
    _update: notImplemented("_update"),
  },
  {},
);

export const DummyRepresentation = makeMockedClass<Representation>(
  {
    isPlayable: notImplemented("isPlayable"),
    addProtectionData: notImplemented("addProtectionData"),
    getMimeTypeString: notImplemented("getMimeTypeString"),
    getEncryptionData: notImplemented("getEncryptionData"),
    getAllEncryptionData: notImplemented("getAllEncryptionData"),
    getMetadataSnapshot: notImplemented("getMetadataSnapshot"),
    refreshCodecSupport: notImplemented("refreshCodecSupport"),
  },
  {
    id: "n/a",
    isSupported: undefined,
    index: new DummyRepresentationIndex(),
    codecs: [],
    bitrate: 1000,
    uniqueId: "n/a",
    decipherable: undefined,
    isSpatialAudio: undefined,
    shouldBeAvoided: false,
    isCodecSupportedInWebWorker: undefined,
    trackType: "video",
    cdnMetadata: null,
    width: undefined,
    height: undefined,
    mimeType: undefined,
    frameRate: undefined,
    hdrInfo: undefined,
    contentProtections: undefined,
  },
);

export function createSegment(props: Partial<ISegment> = {}): ISegment {
  return {
    id: "n/a",
    isInit: false,
    time: 0,
    end: 2,
    duration: 2,
    timescale: 1,
    complete: true,
    url: null,
    privateInfos: {},
    ...props,
  };
}

function notImplemented(name: string): () => never {
  return () => {
    throw new Error(`${name} not implemented`);
  };
}
