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

import { expect } from "chai";

import {
  from as observableFrom,
  Observable,
  of as observableOf,
  timer,
} from "rxjs";
import {
  concatMap,
  delay,
  mapTo,
} from "rxjs/operators";
import concatMapLatest from "../concat_map_latest";

describe("utils - concatMapLatest", () => {
  it("should output all inner values", (done) => {
    const innerValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    const counter$: Observable<number> = observableFrom(innerValues).pipe(
      concatMap((v) => timer(5).pipe(mapTo(v)))
    );

    return counter$.pipe(
      /* tslint:disable no-unnecessary-callback-wrapper */
      concatMapLatest((i: number) => observableOf(i))
      /* tslint:enable no-unnecessary-callback-wrapper */
    ).subscribe((res: number) => {
      const expectedResult = innerValues.shift();
      expect(res).to.be.equal(expectedResult);
      if (innerValues.length === 0) {
        done();
        return;
      }
    });
  });

  it("should skip all inner values but the last", (done) => {
    const innerValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const expectedResults = [0, 9];

    const counter$: Observable<number> = observableFrom(innerValues);

    return counter$.pipe(
      concatMapLatest((i: number) => {
        return observableOf(i).pipe(
          delay(30)
        );
      })
    ).subscribe((result: number) => {
      const expectedResult = expectedResults.shift();
      expect(result).to.be.equal(expectedResult);
      if (expectedResults.length === 0) {
        done();
        return;
      }
    });
  });
});
