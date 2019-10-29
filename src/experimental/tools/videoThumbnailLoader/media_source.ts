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

import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
import openMediaSource from "../../../core/init/create_media_source";
import LightVideoQueuedSourceBuffer from "./light_video_queued_source_buffer";

export default function prepareSourceBuffer(
  elt: HTMLVideoElement, codec: string
): Observable<LightVideoQueuedSourceBuffer> {
  return openMediaSource(elt).pipe(
    mergeMap((mediaSource) => {
      return new Observable<LightVideoQueuedSourceBuffer>((obs) => {
        const queuedSourceBuffer =
          new LightVideoQueuedSourceBuffer(codec, mediaSource);
        obs.next(queuedSourceBuffer);
        return () => {
          queuedSourceBuffer.dispose();
        };
      });
    })
  );
}
