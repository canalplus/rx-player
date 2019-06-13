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

import { combineLatest, Observable, of } from "rxjs";
import { filter, finalize, mergeMap, take, tap } from "rxjs/operators";

import EMEManager from "../../../../../core/eme/eme_manager";
import {
  IKeySystemOption,
  IPersistedSessionData,
} from "../../../../../core/eme/types";
import createMediaSource, {
  resetMediaSource,
} from "../../../../../core/init/create_media_source";
import { IUtils } from "../../types";

export type TypedArray =
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array;

/**
 * Get the licence when keysSystems are specified
 *
 * @remarks
 * This function is basically reproducing the getLicence from the rx-player, but we are
 * adding an additional step to catch the licence and resolve a promise with the licence
 * To get the challenge we need to retrieve the licence
 * we are instanciating a minimal rxPlayer
 * @param ILicenceOptions - The parameters we need to get the licence
 * @returns The licence under a buffer form
 *
 */
function getLicense(
  settingsKeySystem: IKeySystemOption,
  externalSettings: {
  initSegment: TypedArray | ArrayBuffer;
  codec: string;
  storageUtils: IUtils;
  contentID: string;
  }
): Observable<any> {
  const video = document.createElement("video");
  const keySystems = [
    {
      ...settingsKeySystem,
      licenseStorage: {
        save(sessionsIDS: IPersistedSessionData[]) {
          externalSettings.storageUtils.db
            .add("drm", {
              contentID: externalSettings.contentID,
              keySystems: {
                sessionsIDS,
                type: settingsKeySystem.type,
              },
            })
            .catch(err => {
              throw new Error(err);
            });
        },
        load() {
          return [];
        },
      },
      persistentLicense: true,
      persistentStateRequired: true,
    },
  ];
  return createMediaSource(video).pipe(
    mergeMap(mediaSource => {
      const emeManager$ = EMEManager(video, keySystems);
      const sessionsUpdate$ = emeManager$.pipe(
        filter(evt => evt.type === "session-updated")
      );
      const sourceBuffer = mediaSource.addSourceBuffer(externalSettings.codec);
      const appendedSegment$ = of(externalSettings.initSegment).pipe(
        tap(segmentData => sourceBuffer.appendBuffer(segmentData))
      );
      return combineLatest([sessionsUpdate$, appendedSegment$]).pipe(
        finalize(() => resetMediaSource(video, mediaSource))
      );
    }),
    take(2),
    finalize(() => {
      video.remove();
    })
  );
}

export default getLicense;
