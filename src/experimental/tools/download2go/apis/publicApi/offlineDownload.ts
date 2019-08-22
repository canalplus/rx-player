/**
 * Copyright 2019 CANAL+ Group
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
import { EMPTY, Observable, of } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { getOnlineManifest } from "../dash/dashConnectivity";

import {
  ILocalAdaptation,
  ILocalIndexSegment,
  ILocalManifest,
  ILocalPeriod,
  ILocalRepresentation,
} from "../../../../../parsers/manifest/local/types";
import { IParsedManifest } from "../../../../../parsers/manifest/types";
import { ILocalManifestOnline } from "../dash/types";
import { ISegmentInitStored, ISegmentStored } from "./types";

/**
 * Launch the pipeline by url or by parsed dash manifest directly
 *
 * @param IOptions - Options needed by the pipeline
 * @returns The rxpManifest ready to be inserted in IndexDB
 *
 */
export function initParsedManifest(url: string): Observable<IParsedManifest> {
  return getOnlineManifest(url).pipe(
    mergeMap(manifest => {
      if (manifest.type === "done") {
        return of(manifest.value);
      }
      // handle the "need-ressource case here..."
      return EMPTY;
    })
  );
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
            type: adaptation.type as "audio" | "video" | "text",
            representations: adaptation.representations.map(
              (representation): ILocalRepresentation => {
                return {
                  ...representation,
                  index: {
                    loadInitSegment({ resolve, reject }) {
                      if (representation.index.init) {
                        db.get("segments", representation.index.init)
                          .then(
                            (segmentIndex: ISegmentInitStored | undefined) => {
                              if (!segmentIndex) {
                                reject(new Error("Segment not found"));
                                return;
                              }
                              resolve({
                                data: segmentIndex.data,
                                size: segmentIndex.size,
                              });
                              return;
                            }
                          )
                          .catch(err => {
                            reject(err);
                          });
                        return;
                      }
                      resolve({
                        data: null,
                        size: 0,
                      });
                      return;
                    },
                    loadSegment(segmentID, { resolve, reject }) {
                      db.get("segments", segmentID)
                        .then((segment: ISegmentStored | undefined) => {
                          if (!segment) {
                            reject(new Error("Segment not found"));
                            return;
                          }
                          const { data, duration, size } = segment;
                          resolve({
                            data,
                            duration,
                            size,
                          });
                          return;
                        })
                        .catch(err => {
                          reject(err);
                        });
                    },
                    segments: representation.index.segments.map(
                      (segment): ILocalIndexSegment => {
                        if (!Array.isArray(segment)) {
                          return {
                            duration: 0,
                            time: 0,
                            timescale: 0,
                            id: "",
                          };
                        }
                        const [[id], time, timescale, duration] = segment;
                        return {
                          duration,
                          time,
                          timescale,
                          id,
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
