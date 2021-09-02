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
  mapTo,
  share,
  startWith,
  timer,
} from "rxjs";
import deferSubscriptions from "../defer_subscriptions";

describe("utils - deferSubscriptions", () => {
  /* eslint-disable max-len */
  it("should wait until all subscription in the current script are done before emitting", (done) => {
  /* eslint-enable max-len */
    let logs = "";
    const myObservableDeferred = timer(5).pipe(mapTo("A"),
                                               startWith("S"),
                                               deferSubscriptions(),
                                               share());

    myObservableDeferred.subscribe({
      next: x => { logs += `1:${x}-`; },
      error: () => { /* noop */ },
      complete: () => {
        expect(logs).toEqual("1:S-2:S-1:A-2:A-3:A-4:A-");
        done();
      },
    });
    myObservableDeferred.subscribe(x => { logs += `2:${x}-`; });

    setTimeout(() => {
      myObservableDeferred.subscribe(x => { logs += `3:${x}-`; });
      myObservableDeferred.subscribe(x => { logs += `4:${x}-`; });
    }, 1);
  });
});
