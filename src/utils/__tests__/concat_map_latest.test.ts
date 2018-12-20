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
  Observable,
  of as observableOf,
  Subject,
  timer,
} from "rxjs";
import {
  concatMap,
  mapTo,
  tap,
} from "rxjs/operators";
import concatMapLatest from "../concat_map_latest";

describe("utils - concatMapLatest", () => {
  it("should act as a mergeMap for a single value", (done) => {
    const counter$ : Observable<number> = observableOf(0);
    let itemReceived = false;
    counter$.pipe(
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
    const innerValuesLength = innerValues.length;
    let lastCount: number|undefined;

    const counter$ : Observable<number> = observableOf(...innerValues);
    counter$.pipe(
      /* tslint:disable no-unnecessary-callback-wrapper */
      concatMapLatest((i: number, count: number) => {
        lastCount = count;
        return observableOf(i);
      })
      /* tslint:enable no-unnecessary-callback-wrapper */
    ).subscribe((res: number) => {
      const expectedResult = innerValues.shift();
      expect(res).to.equal(expectedResult);
    }, undefined, () => {
      if (innerValues.length !== 0) {
        throw new Error("Not all values were received.");
      }
      expect(lastCount).to.equal(innerValuesLength - 1);
      done();
    });
  });

  /* tslint:disable:max-line-length */
  it("should consider all values if precedent inner Observable had time to finish", (done) => {
  /* tslint:enable:max-line-length */
    const innerValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const innerValuesLength = innerValues.length;
    let lastCount: number|undefined;

    const counter$ : Observable<number> = observableOf(...innerValues).pipe(
      concatMap((v) => timer(5).pipe(mapTo(v)))
    );
    counter$.pipe(
      /* tslint:disable no-unnecessary-callback-wrapper */
      concatMapLatest((i: number, count: number) => {
        lastCount = count;
        return observableOf(i);
      })
      /* tslint:enable no-unnecessary-callback-wrapper */
    ).subscribe((res: number) => {
      const expectedResult = innerValues.shift();
      expect(res).to.be.equal(expectedResult);
    }, undefined, () => {
      if (innerValues.length !== 0) {
        throw new Error("Not all values were received.");
      }
      expect(lastCount).to.equal(innerValuesLength - 1);
      done();
    });
  });

  /* tslint:disable:max-line-length */
  it("should skip all inner values but the last when the inner Observable completes", (done) => {
  /* tslint:enable:max-line-length */

    const counter$ = new Subject<number>();
    let itemEmittedCounter = 0;
    let itemProcessedCounter = 0;
    let lastCount: number|undefined;

    counter$.pipe(
      tap(() => { itemEmittedCounter++; }),
      concatMapLatest((i: number, count: number) => {
        lastCount = count;
        return timer(230).pipe(mapTo(i));
      })
    ).subscribe((result: number) => {
      switch (itemProcessedCounter++) {
        case 0:
          expect(result).to.equal(0);
          counter$.next(3); // should be ignored
          counter$.next(4);
          break;
        case 1:
          expect(result).to.equal(4);
          counter$.complete();
          break;
        default:
          throw new Error("Should not have emitted that item");
      }
    }, undefined, () => {
      expect(itemEmittedCounter).to.equal(5);
      expect(itemProcessedCounter).to.equal(2);
      expect(lastCount).to.equal(itemProcessedCounter - 1);
      done();
    });

    counter$.next(0);
    counter$.next(1); // should be ignored
    counter$.next(2); // should be ignored
  });
});
