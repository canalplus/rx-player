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
  interval,
  Observable,
  of as observableOf,
  timer,
} from "rxjs";
import {
  concatMap,
  mapTo,
  take,
} from "rxjs/operators";
import concatMapLatest from "../concat_map_latest";

describe("utils - concatMapLatest", () => {
  it("should act as a mergeMap for a single value", (done) => {
    const counter$ : Observable<number> = observableOf(0);
    let itemReceived = false;
    return counter$.pipe(
      /* tslint:disable no-unnecessary-callback-wrapper */
      concatMapLatest((i: number) => observableOf(i))
      /* tslint:enable no-unnecessary-callback-wrapper */
    ).subscribe((res: number) => {
      expect(res).to.equal(0);
      itemReceived = true;
    }, undefined, () => {
      expect(itemReceived).to.equal(true);
      done();
    });
  });

  /* tslint:disable:max-line-length */
  it("should consider all values if precedent inner Observable finished synchronously", (done) => {
  /* tslint:enable:max-line-length */
    const innerValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    const counter$ : Observable<number> = observableOf(...innerValues);
    return counter$.pipe(
      /* tslint:disable no-unnecessary-callback-wrapper */
      concatMapLatest((i: number) => observableOf(i))
      /* tslint:enable no-unnecessary-callback-wrapper */
    ).subscribe((res: number) => {
      const expectedResult = innerValues.shift();
      expect(res).to.equal(expectedResult);
    }, undefined, () => {
      if (innerValues.length !== 0) {
        throw new Error("Not all values were received.");
      }
      done();
    });
  });

  /* tslint:disable:max-line-length */
  it("should consider all values if precedent inner Observable had time to finish", (done) => {
  /* tslint:enable:max-line-length */
    const innerValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    const counter$ : Observable<number> = observableOf(...innerValues).pipe(
      concatMap((v) => timer(5).pipe(mapTo(v)))
    );
    return counter$.pipe(
      /* tslint:disable no-unnecessary-callback-wrapper */
      concatMapLatest((i: number) => observableOf(i))
      /* tslint:enable no-unnecessary-callback-wrapper */
    ).subscribe((res: number) => {
      const expectedResult = innerValues.shift();
      expect(res).to.be.equal(expectedResult);
    }, undefined, () => {
      if (innerValues.length !== 0) {
        throw new Error("Not all values were received.");
      }
      done();
    });
  });

  /* tslint:disable:max-line-length */
  it("should skip all inner values but the last when the inner Observable completes", (done) => {
  /* tslint:enable:max-line-length */
    const expectedResults = [0, 2, 4, 6, 8, 9];
    const counter$ : Observable<number> = interval(100).pipe(take(10));

    return counter$.pipe(
      concatMapLatest((i: number) => timer(210).pipe(mapTo(i)))
    ).subscribe((result: number) => {
      const expectedResult = expectedResults.shift();
      expect(result).to.equal(expectedResult);
    }, undefined, () => {
      if (expectedResults.length !== 0) {
        throw new Error("Not all values were received.");
      }
      done();
    });
  });
});
