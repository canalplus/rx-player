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

import { map } from "rxjs";

describe("compat - setElementSrc", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should set element src and clear it when unsubscribe", (done) => {
    const fakeMediaElement = {
      src: "",
      removeAttribute: () => null,
    };

    const mockLogInfo = jest.fn((message) => message);
    jest.mock("../../log", () => ({
      __esModule: true as const,
      default: {
        info: mockLogInfo,
      },
    }));
    const mockClearElementSrc = jest.fn(() => {
      fakeMediaElement.src = "";
    });
    jest.mock("../clear_element_src", () => ({
      __esModule: true as const,
      default: mockClearElementSrc,
    }));
    const fakeURL = "blob:http://fakeURL";

    const setElementSrc = require("../set_element_src").default;

    const setElementSrc$ = setElementSrc(fakeMediaElement, fakeURL);
    const subscribe = setElementSrc$.pipe(
      map(() => {
        expect(mockLogInfo).toHaveBeenCalledTimes(1);
        expect(mockLogInfo)
          .toHaveBeenCalledWith("Setting URL to Element", fakeURL, fakeMediaElement);
        expect(fakeMediaElement.src).toBe(fakeURL);
      })
    ).subscribe();

    setTimeout(() => {
      subscribe.unsubscribe();
      expect(fakeMediaElement.src).toBe("");
      done();
    }, 200);
  });
});
