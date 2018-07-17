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

import {
  Observable,
  Subject,
} from "rxjs";
import { map } from "rxjs/operators";

import log from "../../log";
import {
  bytesToHex,
  strToBytes,
} from "../../utils/bytes";

import Manifest from "../../manifest";
import { IAdaptationType } from "../../manifest/adaptation";

import getKID from "../../parsers/drm";

interface IStream {
  IDSet: IStreamIDSet;
  KID?: string;
}

interface IStreamIDSet {
  periodId : string|number;
  adaptationId : string|number;
  representationId : string|number;
}

export interface IAuthorization {
  IDSet: IStreamIDSet;
  isPlayable?: boolean;
}

/**
 * This class keep a trace of all streams (representations) currently present
 * in the manifest, and statuses associated with initDatas.
 * The statuses are defined in w3c EME recommendation, and rely on standardized
 * statuses returned from browser CDM.
 *
 * By crossing data, it defines if a stream is currently playable, or not.
 * A stream may be not playable due to:
 * - Hardware output restrictions (HDCP, colorGamut, etc).
 * - Expired license.
 * - Internal CDM error that doesn't permit playback.
 * - Other undefined reasons.
 */
export default class StreamAuthorizationManager {
  private streams: IStream[];
  private statuses: { [key: string]: string };
  private updatedStreams$: Subject<never>;

  constructor(manifest: Manifest) {
    this.streams = [];
    this.statuses = {};
    this.buildLocalStreamsFromManifest(manifest);
    this.updatedStreams$ = new Subject();
    this.updatedStreams$.next();
  }

  /**
   * Set or update initData for a given stream.
   * @param {Object} _IDSet
   * @param {Uint8Array} initData
   * @returns {void}
   */
  public setKIDForStream(
    _IDSet: IStreamIDSet,
    initData: Uint8Array
  ): void {
    const stream = this.streams.find(({ IDSet }) => {
      return IDSet === _IDSet;
    });
    if (stream) {
      if (stream.KID) {
        log.warn("StreamAuthorizationManager: Re-assign initData for stream.");
      }
      stream.KID = getKID(initData);
    } else {
      log.debug("StreamAuthorizationManager: No representation with such ids.");
    }
  }

  /**
   * Set or update status for KID
   * @param {Uint8Array|string} KID
   * @param {string} status
   * @returns {void}
   */
  public updateStatusForKID(bytesKID: ArrayBuffer|string, status: string): void {
    const KID = typeof bytesKID === "string" ?
      bytesKID :
      bytesToHex(new Uint8Array(bytesKID)).toUpperCase();
    if (this.statuses[KID] !== status) {
      this.statuses[KID] = status;
      this.updatedStreams$.next();
    }
  }

  /**
   * Returns true if a specific stream is currently playable.
   * An initData associated with a stream, must have a "usable" status.
   * If no initData or status is associated with given stream, we consider
   * the stream not to be restricted, so to be playable.
   *
   * Statuses are defined by w3c EME specs.
   * @param {Object} _IDSet
   * @returns {boolean|undefined}
   */
  public isStreamPlayable(_IDSet: IStreamIDSet): boolean|undefined {
    const stream = this.streams.find(({ IDSet }) => {
      return IDSet === _IDSet;
    });

    if (stream) {
      const KID = stream.KID;
      if (KID) {
        const status = this.statuses[KID];
        if (!status) {
          log.debug(
            "streamAuthorizationManager: No status associated with such initData.");
        }
        return (status === "usable" || status == null);
      }
      // As the stream does not appears to be restricted, it is considered as playable.
      log.debug(
        "streamAuthorizationManager: No initData associated with such representation.");
      return true;
    } else {
      log.debug("StreamAuthorizationManager: No representation with such ids.");
    }
  }

  /**
   * Update local streams from newly loaded manifest.
   * @param {Object} manifest
   */
  public updateStreams(manifest: Manifest) {
    this.buildLocalStreamsFromManifest(manifest);
  }

  /**
   * For a given stream type, get authorizations for each stream.
   * Emit each time authorizations are updated.
   * @param {string} streamType
   * @returns {Object}
   */
  public getAuthorizations$(): Observable<IAuthorization[]> {
    return this.updatedStreams$.pipe(
      map(() => {
        return this.streams.map((stream) => {
          const streamIDSet = stream.IDSet;
          const isPlayable = this.isStreamPlayable(streamIDSet);
          return {
            IDSet: streamIDSet,
            isPlayable,
          };
        });
      })
    );
  }

  /**
   * Get streams and content protection data from manifest.
   * @param {Object} manifest
   */
  private buildLocalStreamsFromManifest(manifest: Manifest) {
    const adaptationTypes: IAdaptationType[] = ["video", "audio", "image", "text"];
    manifest.periods.forEach((period) => {
      const periodId = period.id;
      const adaptations = period.adaptations;
      adaptationTypes.forEach((adaptationType) => {
        const streams = this.streams;
        const adaptationsByType = adaptations[adaptationType];
        if (adaptationsByType) {
          adaptationsByType.forEach((adaptation) => {
            const videoAdaptationId = adaptation.id;
            const representations = adaptation.representations;
            representations.forEach((representation) =>   {
              const representationId = representation.id;
              const contentProtections = representation.contentProtections;
              let KID;
              if (contentProtections) {
                for (const contentProtection of contentProtections) {
                  if (contentProtection.KID) {
                    KID = contentProtection.KID;
                  } else {
                    if (contentProtection.pssh) {
                      KID = getKID(strToBytes(contentProtection.pssh)) || KID;
                    }
                  }
                }
              }
              streams.push({
                IDSet: {
                  periodId,
                  adaptationId: videoAdaptationId,
                  representationId,
                },
                KID,
              });
            });
          });
        }
      });
    });
  }
}
