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
  of as observableOf,
} from "rxjs";
import filterMap from "../filter_map";

describe("utils - filterMap", () => {
  it("should filter when the token given is mapped", (done) => {
    const counter$ : Observable<number> = observableOf(0);
    let itemReceived = false;
    counter$.pipe(
      filterMap((i: number) => i, 0)
    ).subscribe({
      next() { itemReceived = true; },
      complete() {
        expect(itemReceived).toBe(false);
        done();
      },
    });
  });

  it("should still map all other tokens", (done) => {
    const arr = [];
    for (let i = 0; i < 10; i++) {
      arr.push(i);
    }
    const counter$ : Observable<number> = observableOf(...arr);
    const receivedArr : number[] = [];
    counter$.pipe(
      filterMap((i: number) => i * 2, 6)
    ).subscribe({
      next(val) {
        receivedArr.push(val);
      },
      complete() {
        expect(receivedArr).toHaveLength(10 - 1);
        expect(receivedArr[0]).toEqual(0);
        expect(receivedArr[1]).toEqual(2);
        expect(receivedArr[2]).toEqual(4);
        expect(receivedArr[3]).toEqual(8);
        expect(receivedArr[4]).toEqual(10);
        done();
      },
    });
  });

  it("should map everything when the token is not found", (done) => {
    const arr = [];
    for (let i = 0; i < 10; i++) {
      arr.push(i);
    }
    const counter$ : Observable<number> = observableOf(...arr);
    const receivedArr : number[] = [];
    counter$.pipe(
      filterMap((i: number) => i * 2, null)
    ).subscribe({
      next(val) {
        receivedArr.push(val);
      },
      complete() {
        expect(receivedArr).toHaveLength(10);
        expect(receivedArr[0]).toEqual(0);
        expect(receivedArr[1]).toEqual(2);
        expect(receivedArr[2]).toEqual(4);
        expect(receivedArr[3]).toEqual(6);
        expect(receivedArr[4]).toEqual(8);
        done();
      },
    });
  });
});
