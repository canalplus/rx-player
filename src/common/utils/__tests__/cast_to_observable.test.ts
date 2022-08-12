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

/* eslint-disable @typescript-eslint/ban-types */

import { Observable } from "rxjs";
import castToObservable from "../cast_to_observable";

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
    castToObservable(prom).subscribe({
      next: (x) => {
        numberOfItemEmitted++;
        expect(x).toBe(emitItem);
      },
      complete: () => {
        expect(numberOfItemEmitted).toBe(1);
        done();
      },
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
    castToObservable(prom).subscribe({
      next: () => {
        numberOfItemEmitted++;
      },
      error: (err) => {
        expect(numberOfItemEmitted).toBe(0);
        expect(err).toBe(errorItem);
        done();
      },
    });
    if (reject === undefined) {
      throw new Error();
    }
    reject(errorItem);
  });

  it("should wrap other values in an rxJS Observable", (done) =>  {
    const err = new Error("TEST");
    const obs = castToObservable(err);
    let nextHasBeenCalled = 0;
    obs.subscribe({
      next: (e) => {
        nextHasBeenCalled++;
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe("TEST");
      },
      complete: () => {
        expect(nextHasBeenCalled).toBe(1);
        done();
      },
    });
  });
});
