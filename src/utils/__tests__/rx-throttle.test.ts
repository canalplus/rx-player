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
  concat,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import throttle from "../rx-throttle";

describe("utils - throttle (RxJS)", () => {
  it("should execute every Observables for synchronous Observables", (done) => {
    const obsFunction = (x : number) : Observable<number> => {
      return observableOf(x);
    };
    const throttledObsFunction = throttle(obsFunction);
    const obs1 = throttledObsFunction(1);
    const obs2 = throttledObsFunction(2);

    let receivedItemFrom1 = false;
    let has1Completed = false;
    let receivedItemFrom2 = false;

    obs1.subscribe({
      next() { receivedItemFrom1 = true; },
      complete() { has1Completed = true; },
    });
    obs2.subscribe({
      next() { receivedItemFrom2 = true; },
      complete() {
        expect(receivedItemFrom1).toBe(true);
        expect(has1Completed).toBe(true);
        expect(receivedItemFrom2).toBe(true);
        done();
      },
    });
  });

  it("should complete new Observable if one is already pending", (done) => {
    const sub1 = new Subject<void>();
    const sub2 = new Subject<void>();
    const obsFunction = (sub : Subject<void>) : Observable<void> => {
      return concat(observableOf(undefined), sub);
    };
    const throttledObsFunction = throttle(obsFunction);
    const obs1 = throttledObsFunction(sub1);
    const obs2 = throttledObsFunction(sub2);

    let itemsReceivedFrom1 = 0;
    let itemsReceivedFrom2 = 0;

    let has2Completed = false;

    obs1.subscribe({
      next() { itemsReceivedFrom1++; },
      complete() {
        expect(itemsReceivedFrom1).toBe(2);
        expect(itemsReceivedFrom2).toBe(0);
        done();
      },
    });

    obs2.subscribe({
      next() { itemsReceivedFrom2++; },
      complete() { has2Completed = true; },
    });

    expect(itemsReceivedFrom2).toBe(0);
    expect(has2Completed).toBe(true);

    sub1.next();
    sub2.complete();
    sub1.complete();
  });

  it("should execute Observable coming after the previous one has completed", (done) => {
    const sub1 = new Subject<void>();
    const sub2 = new Subject<void>();
    const sub3 = new Subject<void>();
    const obsFunction = (sub : Subject<void>) : Observable<void> => {
      return concat(observableOf(undefined), sub);
    };
    const throttledObsFunction = throttle(obsFunction);
    const obs1 = throttledObsFunction(sub1);
    const obs2 = throttledObsFunction(sub2);
    const obs3 = throttledObsFunction(sub3);

    let itemsReceivedFrom1 = 0;
    let itemsReceivedFrom3 = 0;

    let has1Completed = false;

    obs2.subscribe();
    sub2.complete();

    obs1.subscribe({
      next() { itemsReceivedFrom1++; },
      complete() { has1Completed = true; },
    });
    sub1.complete();

    obs3.subscribe({
      next() { itemsReceivedFrom3++; },
      complete() {
        expect(has1Completed).toBe(true);
        expect(itemsReceivedFrom1).toBe(1);
        expect(itemsReceivedFrom3).toBe(1);
        done();
      },
    });

    sub3.complete();
  });

  it("should execute Observable coming after the previous one has errored", (done) => {
    const sub1 = new Subject<void>();
    const sub2 = new Subject<void>();
    const sub3 = new Subject<void>();
    const obsFunction = (sub : Subject<void>) : Observable<void> => {
      return concat(observableOf(undefined), sub);
    };
    const throttledObsFunction = throttle(obsFunction);
    const obs1 = throttledObsFunction(sub1);
    const obs2 = throttledObsFunction(sub2);
    const obs3 = throttledObsFunction(sub3);
    const error = new Error("ffo");

    let itemsReceivedFrom1 = 0;
    let itemsReceivedFrom3 = 0;

    let has1Errored = false;

    obs2.subscribe();
    sub2.complete();

    obs1.subscribe({
      next: () => { itemsReceivedFrom1++; },
      error: (e) => {
        expect(e).toBe("titi");
        has1Errored = true;
      },
    });
    sub1.error("titi");

    obs3.subscribe({
      next: () => { itemsReceivedFrom3++; },
      error: (e) => {
        expect(e).toBe(error);
        expect(has1Errored).toBe(true);
        expect(itemsReceivedFrom1).toBe(1);
        expect(itemsReceivedFrom3).toBe(1);
        done();
      },
    });

    sub3.error(error);
  });

  /* eslint-disable max-len */
  it("should execute Observable coming after the previous one was unsubscribed", (done) => {
  /* eslint-enable max-len */
    const sub1 = new Subject<void>();
    const sub2 = new Subject<void>();
    const sub3 = new Subject<void>();
    const obsFunction = (sub : Subject<void>) : Observable<void> => {
      return concat(observableOf(undefined), sub);
    };
    const throttledObsFunction = throttle(obsFunction);
    const obs1 = throttledObsFunction(sub1);
    const obs2 = throttledObsFunction(sub2);
    const obs3 = throttledObsFunction(sub3);

    let itemsReceivedFrom1 = 0;
    let itemsReceivedFrom3 = 0;

    let has1Completed = false;

    const subscription2 = obs2.subscribe();
    subscription2.unsubscribe();

    obs1.subscribe({
      next() { itemsReceivedFrom1++; },
      complete() { has1Completed = true; },
    });
    sub1.complete();

    obs3.subscribe({
      next() { itemsReceivedFrom3++; },
      complete() {
        expect(has1Completed).toBe(true);
        expect(itemsReceivedFrom1).toBe(1);
        expect(itemsReceivedFrom3).toBe(1);
        sub2.complete();
        done();
      },
    });

    sub3.complete();
  });

  it("should allow multiple throttledObsFunction Observables in parallel", (done) => {
    const sub1 = new Subject<void>();
    const sub2 = new Subject<void>();
    const obsFunction = (sub : Subject<void>) : Observable<void> => {
      return concat(observableOf(undefined), sub);
    };
    const throttledObsFunction1 = throttle(obsFunction);
    const throttledObsFunction2 = throttle(obsFunction);
    const obs1 = throttledObsFunction1(sub1);
    const obs2 = throttledObsFunction2(sub2);

    let itemsReceivedFrom1 = 0;
    let itemsReceivedFrom2 = 0;

    let has2Completed = false;

    obs1.subscribe({
      next() { itemsReceivedFrom1++; },
      complete() {
        expect(itemsReceivedFrom1).toBe(2);
        expect(itemsReceivedFrom2).toBe(1);
        done();
      },
    });

    obs2.subscribe({
      next() { itemsReceivedFrom2++; },
      complete() { has2Completed = true; },
    });

    expect(itemsReceivedFrom2).toBe(1);
    expect(has2Completed).toBe(false);

    sub1.next();
    sub2.complete();
    sub1.complete();
  });
});
