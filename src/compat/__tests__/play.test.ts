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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import PPromise from "../../utils/promise";

describe("compat - play", () => {
  it("should call play and returns an Observable if play returns a Promise", (done) => {
    const mockPlay = jest.fn(() => PPromise.resolve());
    const fakeMediaElement = { play: mockPlay };

    const play$ = require("../play").default;
    play$(fakeMediaElement).subscribe(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("should return an Observable even if play does not return a promise", (done) => {
    const mockPlay = jest.fn();
    const fakeMediaElement = { play: mockPlay };

    const play$ = require("../play").default;
    play$(fakeMediaElement).subscribe(() => {
      done();
    });
  });

  it("should throw through an Observable if the `play` promise is rejected", (done) => {
    const notAllowedError = new Error("NotAllowedError: Can't play");
    const mockPlay = jest.fn(() => {
      return PPromise.reject(notAllowedError);
    });
    const fakeMediaElement = { play: mockPlay };

    const play$ = require("../play").default;
    play$(fakeMediaElement).subscribe(() => null, (err: unknown) => {
      expect(err).toBe(notAllowedError);
      done();
    });
  });

  it("should throw through an Observable if `play` throws", (done) => {
    const notAllowedError = new Error("NotAllowedError: Can't play");
    const mockPlay = jest.fn(() => {
      throw notAllowedError;
    });
    const fakeMediaElement = { play: mockPlay };

    const play$ = require("../play").default;
    play$(fakeMediaElement).subscribe(() => null, (err: unknown) => {
      expect(err).toBe(notAllowedError);
      done();
    });
  });
});
