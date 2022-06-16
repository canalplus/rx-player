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

import nextTick from "next-tick";
import { Observable } from "rxjs";

/**
 * Create Observable that emits and complete on the next micro-task.
 *
 * This Observable can be useful to prevent race conditions based on
 * synchronous task being performed in the wrong order.
 * By awaiting nextTickObs before performing a task, you ensure that all other
 * tasks that might have run synchronously either before or after it all already
 * ran.
 * @returns {Observable}
 */
export default function nextTickObs(): Observable<void> {
  return new Observable<void>((obs) => {
    let isFinished = false;
    nextTick(() => {
      if (!isFinished) {
        obs.next();
        obs.complete();
      }
    });
    return () => {
      isFinished = true;
    };
  });
}
