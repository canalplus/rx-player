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

import { IDBPDatabase } from "idb";

import { ValidationArgsError } from "../../utils";
import { getOnlineMPDParsed } from "../dash/dashConnectivity";
import { fillStructMapping } from "../dash/dashSegmentsBuilder";

import { IParserResponse } from "../../../../../parsers/manifest/dash/parse_mpd";
import {
  ILocalAdaptation,
  ILocalIndexSegment,
  ILocalManifest,
  ILocalPeriod,
  ILocalRepresentation,
} from "../../../../../parsers/manifest/local/types";
import { IParsedManifest } from "../../../../../parsers/manifest/types";
import { ISettingsDownloader } from "../../types";
import { ILocalManifestOnline, IOptionsBuilder } from "../dash/types";
import { IUtils } from "./../../types";

/**
 * Check the parsed dash manifest then launch the pipeline building of the structure
 *
 * @param IParserResponse - dash parsed manifest
 * @param IOptionsBuilder - Variables needed to construct the loader
 * @returns The rxpManifest ready to be inserted in IndexDB
 *
 */
export async function buildRxpManifestPipeline(
  dashParsedStruct: IParserResponse<IParsedManifest>,
  builderSettings: IOptionsBuilder,
  utilsBuilder: IUtils
): Promise<ILocalManifestOnline> {
  if (
    dashParsedStruct.type === "done" &&
    dashParsedStruct.value.transportType === "dash"
  ) {
    const rxpManifestOnline = await fillStructMapping(
      builderSettings,
      utilsBuilder
    )(dashParsedStruct.value);
    return rxpManifestOnline;
  }
  throw new Error(
    "The MPD needs external resources or is not at a valid transport type (dash)"
  );
}

/**
 * Launch the pipeline by url or by parsed dash manifest directly
 *
 * @param IOptions - Options needed by the pipeline
 * @returns The rxpManifest ready to be inserted in IndexDB
 *
 */
export async function initDownloaderAssets(
  settings: ISettingsDownloader,
  { db, emitter, progressBarBuilder$ }: IUtils
): Promise<ILocalManifestOnline | never> {
  const {
    url,
    dbSettings: { contentID },
    videoSettings: { quality, keySystems },
  } = settings;
  if (url) {
    return buildRxpManifestPipeline(
      await getOnlineMPDParsed(url),
      {
        contentID,
        keySystemsOptions: keySystems,
        quality,
      },
      {
        db,
        emitter,
        ...(progressBarBuilder$ && { progressBarBuilder$ }),
      }
    );
  }
  throw new ValidationArgsError("Need the url of the dash file");
}

/**
 * Returns the structure of the manifest needed by the rxPlayer transport local.
 *
 * @remarks
 * It's mandatory to construct again the rxpManifest
 * when the user want it because we can't insert function type in IndexDB
 *
 * @param ILocalManifestOnline - The rxpManifest we downloaded when online
 * @returns The manifest that the rxPlayer expect
 *
 */
export function constructOfflineManifest(
  rxpManifestOnlineFormat: ILocalManifestOnline,
  db: IDBPDatabase
): ILocalManifest {
  return {
    ...rxpManifestOnlineFormat,
    periods: rxpManifestOnlineFormat.periods.map(
      (period): ILocalPeriod => ({
        ...period,
        adaptations: period.adaptations.map(
          (adaptation): ILocalAdaptation => ({
            ...adaptation,
            representations: adaptation.representations.map(
              (representation): ILocalRepresentation => {
                return {
                  ...representation,
                  index: {
                    ...(representation.index.init && {
                      init: {
                        load({ resolve, reject }) {
                          if (representation.index.init) {
                            db.get("segments", representation.index.init)
                              .then(segmentIndex => {
                                if (!segmentIndex) {
                                  reject(new Error("Segment not found"));
                                }
                                resolve({
                                  data: segmentIndex.data,
                                  duration: segmentIndex.duration,
                                  size: segmentIndex.size,
                                });
                              })
                              .catch(err => {
                                reject(err);
                              });
                          }
                        },
                      },
                    }),
                    segments: representation.index.segments.map(
                      (segment): ILocalIndexSegment => {
                        if (!Array.isArray(segment)) {
                          return {
                            duration: 0,
                            time: 0,
                            timescale: 0,
                            load({ reject }) {
                              reject(
                                new Error("Segment has not been built yet")
                              );
                            },
                          };
                        }
                        const [[key], time, timescale, duration] = segment;
                        return {
                          duration,
                          time,
                          timescale,
                          load({ resolve, reject }) {
                            db.get("segments", key)
                              .then(({ data, size }) => {
                                resolve({
                                  data,
                                  duration,
                                  size,
                                });
                              })
                              .catch(err => {
                                reject(err);
                              });
                          },
                        };
                      }
                    ),
                  },
                };
              }
            ),
          })
        ),
      })
    ),
  };
}
