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
  concat as observableConcat,
  concatMap,
  interval,
  mapTo,
  merge as observableMerge,
  Observable,
  Subject,
  of as observableOf,
  take,
  tap,
  timer,
} from "rxjs";
import concatMapLatest from "../concat_map_latest";

describe("utils - concatMapLatest", () => {
  it("should act as a mergeMap for a single value", (done) => {
    const counter$ : Observable<number> = observableOf(0);
    let itemReceived = false;
    counter$.pipe(
      concatMapLatest<number, number>(observableOf)
    ).subscribe({
      next(res: number) : void {
        expect(res).toBe(0);
        itemReceived = true;
      },
      complete() {
        expect(itemReceived).toBe(true);
        done();
      },
    });
  });

  /* eslint-disable max-len */
  it("should consider all values if precedent inner Observable finished synchronously", (done) => {
  /* eslint-enable max-len */
    const innerValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const innerValuesLength = innerValues.length;
    let lastCount: number|undefined;

    const counter$ : Observable<number> = observableOf(...innerValues);
    counter$.pipe(
      concatMapLatest((i: number, count: number) => {
        lastCount = count;
        return observableOf(i);
      })
    ).subscribe({
      next(res: number) {
        const expectedResult = innerValues.shift();
        expect(res).toBe(expectedResult);
      },
      complete() {
        if (innerValues.length !== 0) {
          throw new Error("Not all values were received.");
        }
        expect(lastCount).toBe(innerValuesLength - 1);
        done();
      },
    });
  });

  /* eslint-disable max-len */
  it("should consider all values if precedent inner Observable had time to finish", (done) => {
  /* eslint-enable max-len */
    const innerValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const innerValuesLength = innerValues.length;
    let lastCount: number|undefined;

    const counter$ : Observable<number> = observableOf(...innerValues).pipe(
      concatMap((v) => timer(5).pipe(mapTo(v)))
    );
    counter$.pipe(
      concatMapLatest((i: number, count: number) => {
        lastCount = count;
        return observableOf(i);
      })
    ).subscribe({
      next(res: number) {
        const expectedResult = innerValues.shift();
        expect(res).toBe(expectedResult);
      },
      complete() {
        if (innerValues.length !== 0) {
          throw new Error("Not all values were received.");
        }
        expect(lastCount).toBe(innerValuesLength - 1);
        done();
      },
    });
  });

  /* eslint-disable max-len */
  it("should skip all inner values but the last when the inner Observable completes", (done) => {
  /* eslint-enable max-len */

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
    ).subscribe({
      next(result: number) {
        switch (itemProcessedCounter++) {
          case 0:
            expect(result).toBe(0);
            counter$.next(3); // should be ignored
            counter$.next(4);
            break;
          case 1:
            expect(result).toBe(4);
            counter$.complete();
            break;
          default:
            throw new Error("Should not have emitted that item");
        }
      },
      complete() {
        expect(itemEmittedCounter).toBe(5);
        expect(itemProcessedCounter).toBe(2);
        expect(lastCount).toBe(itemProcessedCounter - 1);
        done();
      },
    });

    counter$.next(0);
    counter$.next(1); // should be ignored
    counter$.next(2); // should be ignored
  });

  /* eslint-disable max-len */
  it("should increment the counter each times the callback is called", (done) => {
  /* eslint-enable max-len */

    let itemProcessed = 0;
    let nextCount = 0;
    const obs1$ = observableOf(1, 2, 3);
    const obs2$ = observableOf(4, 5);
    const obs3$ = observableOf(6, 7, 8, 9);

    observableOf(
      [0, obs1$] as [number, Observable<number>],
      [1, obs2$] as [number, Observable<number>],
      [2, obs3$] as [number, Observable<number>]
    ).pipe(
      concatMapLatest(([wantedCounter, obs$], counter) => {
        itemProcessed++;
        expect(counter).toBe(wantedCounter);
        return obs$;
      })
    ).subscribe({
      next() { nextCount++; },
      complete() {
        expect(itemProcessed).toBe(3);
        expect(nextCount).toBe(3 + 2 + 4);
        done();
      },
    });
  });

  it("should reset the counter for each subscription", async () => {
    const base$ = interval(10).pipe(take(10));
    const counter$ = base$.pipe(concatMapLatest((_, i) => observableOf(i)));

    function validateThroughMerge() {
      let nextCount = 0;
      return new Promise<void>(res => {
        observableMerge(counter$, counter$, counter$).subscribe({
          next(item) {
            expect(item).toBe(Math.floor(nextCount / 3));
            nextCount++;
          },
          complete() {
            expect(nextCount).toBe(30);
            res();
          },
        });
      });
    }

    function validateThroughConcat() {
      let nextCount = 0;
      return new Promise<void>(res => {
        observableConcat(counter$, counter$, counter$).subscribe({
          next(item) {
            expect(item).toBe(nextCount % 10);
            nextCount++;
          },
          complete() {
            expect(nextCount).toBe(30);
            res();
          },
        });
      });
    }

    // eslint-disable-next-line no-restricted-properties
    await Promise.all([validateThroughConcat(), validateThroughMerge()]);
  });
});
