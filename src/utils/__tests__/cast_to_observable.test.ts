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
  Observable,
  Subject,
} from "rxjs";
import { share } from "rxjs/operators";

import castToObservable from "../cast_to_observable";
import noop from "../noop";

describe("utils - castToObservable", () => {
  it("should return the argument if already an Observable", () => {
    const obs = new Observable<void>();
    expect(castToObservable(obs)).toBe(obs);
  });

  it("should convert promise's then to next", (done) => {
    let resolve : ((str : string) => void)|undefined;
    const emitItem = "je n'ai plus peur de, perdre mes dents";
    const prom = new Promise<string>((res) => {
      resolve = res;
    });

    let numberOfItemEmitted = 0;
    castToObservable(prom).subscribe((x) => {
      numberOfItemEmitted++;
      expect(x).toBe(emitItem);
    }, noop, () => {
      expect(numberOfItemEmitted).toBe(1);
      done();
    });

    if (resolve === undefined) {
      throw new Error();
    }
    resolve(emitItem);
  });

  it("should convert promise's error to Observable's error", (done) => {
    let reject : ((str : string) => void)|undefined;
    const errorItem = "je n'ai plus peur de, perdre mon temps";
    const prom = new Promise<string>((_, rej) => {
      reject = rej;
    });

    let numberOfItemEmitted = 0;
    castToObservable(prom).subscribe(() => {
      numberOfItemEmitted++;
    }, (err) => {
      expect(numberOfItemEmitted).toBe(0);
      expect(err).toBe(errorItem);
      done();
    });
    if (reject === undefined) {
      throw new Error();
    }
    reject(errorItem);
  });

  /* tslint:disable:max-line-length */
  it("should translate Observable implementation not from RxJS into RxJS Observables", (done) => {
  /* tslint:enable:max-line-length */

    const sub1 = new Subject<number>();
    const sub2 = new Subject<number>();
    const myObs1 = {
      subscribe(a : () => void, b : () => void, c : () => {}) {
        sub1.subscribe(a, b, c);
        return null;
      },
    };
    const myObs2 = {
      subscribe(a : () => void, b : () => void, c : () => {}) {
        sub2.subscribe(a, b, c);
        return null;
      },
    };

    const rxObs1 = castToObservable(myObs1);
    const rxObs2 = castToObservable(myObs2);
    let itemFromObs1 = 0;
    let itemFromObs2 = 0;
    rxObs1.subscribe(
      (num) => {
        switch (itemFromObs1++) {
          case 0:
            expect(num).toBe(1);
            break;
          case 1:
            expect(num).toBe(12);
            break;
          case 2:
            expect(num).toBe(5);
            break;
          default:
            throw new Error("Invalid item received");
        }
      },

      (err : Error) => {
        expect(err.message).toBe("ffob");
        expect(itemFromObs1).toBe(3);
        rxObs2.subscribe(
          () => { itemFromObs2++; },
          noop,
          () => {
            expect(itemFromObs2).toBe(0);
            done();
          }
        );
      }
    );
    sub1.next(1);
    sub1.next(12);
    sub1.next(5);
    sub2.complete();
    sub1.error(new Error("ffob"));
  });

  /* tslint:disable:max-line-length */
  it("should call dispose on unsubscription if the Observable implementation has a dispose function", () => {
  /* tslint:enable:max-line-length */

    let disposeHasBeenCalled = 0;
    const myObs = {
      subscribe(_a : () => void, _b : () => void, _c : () => {}) {
        return {
          dispose() {
            disposeHasBeenCalled++;
          },
        };
      },
    };
    const rxObs = castToObservable(myObs);
    const sub1 = rxObs.subscribe();
    const sub2 = rxObs.subscribe();
    sub1.unsubscribe();
    sub2.unsubscribe();
    expect(disposeHasBeenCalled).toBe(2);

    // reset counter
    disposeHasBeenCalled = 0;

    const sharedRxObs = rxObs.pipe(share());
    const sharedSub1 = sharedRxObs.subscribe();
    const sharedSub2 = sharedRxObs.subscribe();
    sharedSub1.unsubscribe();
    sharedSub2.unsubscribe();
    expect(disposeHasBeenCalled).toBe(1);
  });

  /* tslint:disable:max-line-length */
  it("should call unsubscribe on unsubscription if the Observable implementation has an unsubscribe function", () => {
  /* tslint:enable:max-line-length */

    let disposeHasBeenCalled = 0;
    const myObs = {
      subscribe(_a : () => void, _b : () => void, _c : () => {}) {
        return {
          unsubscribe() {
            disposeHasBeenCalled++;
          },
        };
      },
    };
    const rxObs = castToObservable(myObs);
    const sub1 = rxObs.subscribe();
    const sub2 = rxObs.subscribe();
    sub1.unsubscribe();
    sub2.unsubscribe();
    expect(disposeHasBeenCalled).toBe(2);

    // reset counter
    disposeHasBeenCalled = 0;

    const sharedRxObs = rxObs.pipe(share());
    const sharedSub1 = sharedRxObs.subscribe();
    const sharedSub2 = sharedRxObs.subscribe();
    sharedSub1.unsubscribe();
    sharedSub2.unsubscribe();
    expect(disposeHasBeenCalled).toBe(1);
  });

  it("should wrap other values in an rxJS Observable", (done) =>  {
    const err = new Error("TEST");
    const obs = castToObservable(err);
    let nextHasBeenCalled = 0;
    obs.subscribe(
      (e) => {
        nextHasBeenCalled++;
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe("TEST");
      },
      noop,
      () => {
        expect(nextHasBeenCalled).toBe(1);
        done();
      }
    );
  });
});
