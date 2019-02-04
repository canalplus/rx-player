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

import PPromise from "../../utils/promise";

describe("compat - play", () => {
  it("should start to play", (done) => {
    const mockPlay = jest.fn(() => PPromise.resolve());
    const fakeMediaElement = {
      play: mockPlay,
    };

    const play$ = require("../play").default;
    play$(fakeMediaElement).subscribe(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("should fail to start to play", (done) => {
    const notAllowedError = new Error("NotAllowedError: Can't play");
    const mockPlay = jest.fn(() => {
      return PPromise.reject(notAllowedError);
    });
    const fakeMediaElement = {
      play: mockPlay,
    };

    const play$ = require("../play").default;
    play$(fakeMediaElement).subscribe(() => null, (err: any) => {
      expect(err).toBe(notAllowedError);
      done();
    });
  });
});
