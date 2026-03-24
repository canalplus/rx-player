import BROWSER_GLOBALS from "../../compat/browser_compatibility_types";
import { formatError } from "../../errors";
import type { ICorePlaybackObservation } from "../../main_thread/init/utils/create_core_playback_observer";
import { createRepresentationFilterFromFnString } from "../../manifest";
import type Manifest from "../../manifest/classes";
import type {
  IManifestLoader,
  IRepresentationFilter,
  ISegmentLoader,
} from "../../public_types";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import type SegmentSinksStore from "../segment_sinks";
import type { ISentError } from "../types";

/**
 * "Plugins" are a specific kind of API where an application can define complex
 * functions that the RxPlayer will call in some normally-core aspects of media
 * playback: e.g. loading segments.
 *
 * This interface lists them.
 */
export interface ICorePlugins {
  representationFilters: Map<string, IRepresentationFilter>;
  segmentLoaders: Map<string, ISegmentLoader>;
  manifestLoaders: Map<string, IManifestLoader>;
}

/**
 * Format an error, which may be of any form, into an Object than can easily be
 * serialized - e.g. to be communicated through a postMessage-like API.
 * @param {*} error - The error to serialized
 * @returns {Object} - A serialization-safe error format
 */
export function formatErrorForSender(error: unknown): ISentError {
  const formattedError = formatError(error, {
    defaultCode: "NONE",
    defaultReason: "An unknown error stopped content playback.",
  });

  return formattedError.serialize();
}

/**
 * Synchronize SegmentSinks with what has been buffered.
 * @param {Object} observation - The just-received playback observation,
 * including what has been buffered on lower-level buffers
 * @param {Object} segmentSinksStore - Interface allowing to interact
 * with `SegmentSink`s, so their inventory can be updated accordingly.
 */
export function synchronizeSegmentSinksOnObservation(
  observation: ICorePlaybackObservation,
  segmentSinksStore: SegmentSinksStore,
): void {
  // Synchronize SegmentSinks with what has been buffered.
  ["video" as const, "audio" as const, "text" as const].forEach((tType) => {
    const segmentSinkStatus = segmentSinksStore.getStatus(tType);
    if (segmentSinkStatus.type === "initialized") {
      segmentSinkStatus.value.synchronizeInventory(observation.buffered[tType] ?? []);
    }
  });
}

/**
 * Set Representation.isCodecSupportedInWebWorker to true or false
 * If the codec is supported in the current context.
 * If MSE in worker is not available, the attribute is not set.
 */
export function updateCodecSupportInWorkerMode(manifestToUpdate: Manifest) {
  if (isNullOrUndefined(BROWSER_GLOBALS.MediaSource_)) {
    return;
  }

  const codecsMap = new Map<string, boolean>();
  for (const period of manifestToUpdate.periods) {
    const checkedAdaptations = [
      ...(period.adaptations.video ?? []),
      ...(period.adaptations.audio ?? []),
    ];
    for (const adaptation of checkedAdaptations) {
      for (const representation of adaptation.representations) {
        const codec = `${representation.mimeType};codecs="${representation.codecs[0]}"`;
        if (codecsMap.has(codec)) {
          representation.isCodecSupportedInWebWorker = codecsMap.get(codec);
        } else {
          const supported = BROWSER_GLOBALS.MediaSource_.isTypeSupported(codec);
          representation.isCodecSupportedInWebWorker = supported;
          codecsMap.set(codec, supported);
        }
      }
    }
  }
}

/**
 * Some functions may be defined by the API, we call those "plugins".
 * This function parses and extract the actual function from the different
 * ways an application can provide it to us.
 * @param {Object} input - The API input
 * @param {Object} corePlugins - Context on what identified functions are
 * defined right now.
 * @returns {Function}
 */
export function extractExternalPlugins(
  input: {
    manifestLoader:
      | {
          fn?: IManifestLoader | undefined;
          workerId?: string | undefined;
        }
      | undefined;
    segmentLoader:
      | {
          fn?: ISegmentLoader | undefined;
          workerId?: string | undefined;
        }
      | undefined;
    representationFilter:
      | undefined
      | {
          fn?: IRepresentationFilter | undefined;
          eval?: string | undefined;
          workerId?: string | undefined;
        };
  },
  corePlugins: ICorePlugins,
): {
  manifestLoader: IManifestLoader | undefined;
  segmentLoader: ISegmentLoader | undefined;
  representationFilter: IRepresentationFilter | undefined;
} {
  let manifestLoader;
  let segmentLoader;
  let representationFilter;
  if (typeof input.representationFilter?.fn === "function") {
    representationFilter = input.representationFilter.fn;
  } else if (typeof input.representationFilter?.eval === "string") {
    representationFilter = createRepresentationFilterFromFnString(
      input.representationFilter.eval,
    );
  } else if (typeof input.representationFilter?.workerId === "string") {
    representationFilter = corePlugins.representationFilters.get(
      input.representationFilter.workerId,
    );
  }

  if (typeof input.manifestLoader?.fn === "function") {
    manifestLoader = input.manifestLoader.fn;
  } else if (typeof input.manifestLoader?.workerId === "string") {
    manifestLoader = corePlugins.manifestLoaders.get(input.manifestLoader.workerId);
  }

  if (typeof input.segmentLoader?.fn === "function") {
    segmentLoader = input.segmentLoader.fn;
  } else if (typeof input.segmentLoader?.workerId === "string") {
    segmentLoader = corePlugins.segmentLoaders.get(input.segmentLoader.workerId);
  }
  return {
    manifestLoader,
    segmentLoader,
    representationFilter,
  };
}
