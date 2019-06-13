import { IDBPDatabase } from "idb";
import { ManifestFetcher } from "../../../../../core/fetchers";
import features from "../../../../../features/";
import Manifest from "../../../../../manifest";
import { ILocalManifest } from "../../../../../parsers/manifest/local";
import {
  IContentProtections,
  ILocalAdaptation,
  ILocalPeriod,
  ILocalRepresentation,
} from "../../../../../parsers/manifest/local/types";
import { ITransportPipelines } from "../../../../../transports";
import {
  CancellationError,
  CancellationSignal,
} from "../../../../../utils/task_canceller";
import { SegmentConstuctionError } from "../../utils";
import { ISegmentStored, IStoredManifestInfo } from "./types";

/**
 * Get the transport pipeline for the given transport.
 * @param {string} transport - HTTP streaming transport protocol
 *  type for current download to use.
 * @returns {Object} A instance of TransportPipelines for the current download.
 *
 */
export function getTransportPipelineFromTransport(
  transport: string,
): ITransportPipelines {
  const transportFn = features.transports[transport];
  if (typeof transportFn !== "function") {
    throw new Error(`transport "${transport}" not supported`);
  }
  return transportFn({
    lowLatencyMode: false,
  });
}

/**
 * @param {Object} transportPipelines
 * @param {string} manifestURLs - Manifest url.
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export function loadManifest(
  transportPipelines: ITransportPipelines,
  manifestURLs: string[],
  cancelSignal: CancellationSignal,
): Promise<Manifest> {
  return new Promise((res, rej) => {
    const manifestFetcher = new ManifestFetcher(manifestURLs, transportPipelines, {
      lowLatencyMode: false,
      maxRetry: 5,
      initialManifest: undefined,
      // XXX TODO
      requestTimeout: 15,
      minimumManifestUpdateInterval: -1,
    });
    let isDisposed = false;
    const unregisterCancel = cancelSignal.register((error: CancellationError) => {
      isDisposed = true;
      manifestFetcher.dispose();
      rej(error);
    });
    manifestFetcher.addEventListener("manifestReady", (manifest) => {
      unregisterCancel();
      manifestFetcher.dispose();
      res(manifest);
    });
    manifestFetcher.addEventListener("error", (error) => {
      unregisterCancel();
      rej(error);
    });
    if (!isDisposed) {
      manifestFetcher.start();
    }
  });
}

/**
 * Returns the structure of the Manifest needed by the RxPlayer's "local"
 * transport.
 * @param {Object} storedManifest - The Manifest we downloaded when online
 * @param {Object} db
 * @param {boolean} isFinished
 * @returns {Object} - A ILocalManifest to the RxPlayer transport local
 */
export function createLocalManifestFromStoredInformation(
  storedManifest: IStoredManifestInfo,
  db: IDBPDatabase,
  isFinished: boolean,
): ILocalManifest {
  return {
    type: "local",
    version: "0.1",
    minimumPosition: storedManifest.minimumPosition,
    maximumPosition: storedManifest.maximumPosition,
    isFinished,
    periods: storedManifest.periods.map<ILocalPeriod>((period): ILocalPeriod => {
      return {
        start: period.start,
        end: period.end ?? Number.MAX_VALUE,
        adaptations: period.adaptations.map(
          (adaptation): ILocalAdaptation => ({
            type: adaptation.type,
            audioDescription: adaptation.audioDescription,
            closedCaption: adaptation.closedCaption,
            language: adaptation.language,
            representations: adaptation.representations.map(
              ({
                mimeType,
                codec,
                id,
                contentProtections,
                ...representation
              }): ILocalRepresentation => ({
                bitrate: representation.bitrate ?? 0,
                contentProtections: {
                  keyIds: contentProtections?.keyIds,
                  initData: (contentProtections?.initData ?? []).reduce(
                    (acc: IContentProtections["initData"], idata) => {
                      let initDataTypeArr = acc[idata.type];
                      if (initDataTypeArr === undefined) {
                        initDataTypeArr = [];
                      }
                      initDataTypeArr.push(...idata.values);
                      return acc;
                    },
                    {},
                  ),
                },
                mimeType: mimeType !== undefined ? mimeType : "",
                codecs: codec !== undefined ? codec : "",
                width: representation.width,
                height: representation.height,
                index: {
                  // TODO more finely grained
                  isFinished,
                  loadInitSegment: ({ resolve, reject }) => {
                    db.get(
                      "segments",
                      `init/${storedManifest.contentId}/${representation.uniqueId}`,
                    )
                      .then((segment: ISegmentStored | undefined) => {
                        if (segment === undefined) {
                          reject(
                            new SegmentConstuctionError(
                              "Impossible to retrieve Initialized segment in IndexedDB " +
                                `for representation: ${id}.`,
                            ),
                          );
                          return;
                        }
                        return resolve({ data: segment.data });
                      })
                      .catch(reject);
                  },
                  loadSegment: ({ time: reqSegmentTime }, { resolve, reject }) => {
                    db.get(
                      "segments",
                      `media/${storedManifest.contentId}/` +
                        `${representation.uniqueId}/${reqSegmentTime}`,
                    )
                      .then((segment: ISegmentStored | undefined) => {
                        if (segment === undefined) {
                          return resolve({ data: null });
                        }
                        return resolve({ data: segment.data });
                      })
                      .catch(reject);
                  },
                  segments: representation.segments,
                },
              }),
            ),
          }),
        ),
      };
    }),
  };
}
