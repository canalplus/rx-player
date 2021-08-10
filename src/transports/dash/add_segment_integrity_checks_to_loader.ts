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

import TaskCanceller, {
  CancellationError,
} from "../../utils/task_canceller";
import { ISegmentLoader } from "../types";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import inferSegmentContainer from "../utils/infer_segment_container";

/**
 * Add multiple checks on the response given by the `segmentLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} segmentLoader
 * @returns {Function}
 */
export default function addSegmentIntegrityChecks<T>(
  segmentLoader : ISegmentLoader<T>
) : ISegmentLoader<T> {
  return (url, context, initialCancelSignal, callbacks) => {
    return new Promise((res, rej) => {

      const canceller = new TaskCanceller();
      const unregisterCancelLstnr = initialCancelSignal
        .register(function onCheckCancellation(err : CancellationError) {
          canceller.cancel();
          rej(err);
        });

      /**
       * If the data's seems to be corrupted, cancel the loading task and reject
       * with an `INTEGRITY_ERROR` error.
       * @param {*} data
       */
      function cancelAndRejectOnBadIntegrity(data : T) : void {
        if (!(data instanceof Array) && !(data instanceof Uint8Array) ||
            inferSegmentContainer(context.type, context.mimeType) !== "mp4")
        {
          return;
        }
        try {
          checkISOBMFFIntegrity(new Uint8Array(data), context.segment.isInit);
        } catch (err) {
          unregisterCancelLstnr();
          canceller.cancel();
          rej(err);
        }
      }

      segmentLoader(url, context, canceller.signal, {
        ...callbacks,
        onNewChunk(data) {
          cancelAndRejectOnBadIntegrity(data);
          if (!canceller.isUsed) {
            callbacks.onNewChunk(data);
          }
        },
      }).then((info) => {
        if (canceller.isUsed) {
          return;
        }
        unregisterCancelLstnr();

        if (info.resultType === "segment-loaded") {
          cancelAndRejectOnBadIntegrity(info.resultData.responseData);
        }
        res(info);

      }, (error : unknown) => {
        // The segmentLoader's cancellations cases are all handled here
        if (!TaskCanceller.isCancellationError(error)) {
          unregisterCancelLstnr();
          rej(error);
        }
      });
    });
  };
}
