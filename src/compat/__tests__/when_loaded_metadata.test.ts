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

import {
  finalize,
  interval as observableInterval,
  mapTo,
  tap,
  timer as observableTimer,
} from "rxjs";

describe("compat - whenLoadedMetadata$", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should wait for loaded metadata if they are not yet loaded", (done) => {
    const fakeMediaElement = {
      readyState: 0,
    };

    const mockOnLoadedMetadata$ = jest.fn(() => {
      return observableTimer(500).pipe(
        tap(() => fakeMediaElement.readyState = 1),
        mapTo(null)
      );
    });

    jest.mock("../event_listeners", () => ({
      __esModule: true as const,
      onLoadedMetadata$: mockOnLoadedMetadata$,
    }));

    const whenLoadedMetadata$ = require("../when_loaded_metadata").default;
    whenLoadedMetadata$(fakeMediaElement).subscribe(() => {
      expect(fakeMediaElement.readyState).toBe(1);
      expect(mockOnLoadedMetadata$).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("should emit once when metadata is loaded several times", (done) => {
    const fakeMediaElement = {
      readyState: 0,
    };

    const mockOnLoadedMetadata$ = jest.fn(() => {
      return observableInterval(500).pipe(
        tap(() => fakeMediaElement.readyState++),
        mapTo(null)
      );
    });

    jest.mock("../event_listeners", () => ({
      __esModule: true as const,
      onLoadedMetadata$: mockOnLoadedMetadata$,
    }));

    const whenLoadedMetadata$ = require("../when_loaded_metadata").default;
    whenLoadedMetadata$(fakeMediaElement).pipe(
      finalize(() => {
        expect(fakeMediaElement.readyState).toBe(1);
        expect(mockOnLoadedMetadata$).toHaveBeenCalledTimes(1);
        done();
      })
    ).subscribe();
  });

  it("should emit if metadata is already loaded", (done) => {
    const fakeMediaElement = {
      readyState: 1,
    };

    const mockOnLoadedMetadata$ = jest.fn(() => null);

    jest.mock("../event_listeners", () => ({
      __esModule: true as const,
      onLoadedMetadata$: mockOnLoadedMetadata$,
    }));

    const whenLoadedMetadata$ = require("../when_loaded_metadata").default;
    whenLoadedMetadata$(fakeMediaElement).subscribe(() => {
      expect(fakeMediaElement.readyState).toBe(1);
      expect(mockOnLoadedMetadata$).not.toHaveBeenCalled();
      done();
    });
  });
});
