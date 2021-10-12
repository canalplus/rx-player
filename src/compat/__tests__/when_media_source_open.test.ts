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

describe("compat - whenMediaSourceOpen$", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should wait for source open if not yet opened", (done) => {
    const fakeMediaSource = {
      readyState: "closed",
    };

    const mockOnSourceOpen$ = jest.fn(() => {
      return observableTimer(500).pipe(
        tap(() => fakeMediaSource.readyState = "open"),
        mapTo(null)
      );
    });

    jest.mock("../event_listeners", () => ({
      __esModule: true as const,
      onSourceOpen$: mockOnSourceOpen$,
    }));

    const whenMediaSourceOpen$ = require("../when_media_source_open").default;
    whenMediaSourceOpen$(fakeMediaSource).subscribe(() => {
      expect(fakeMediaSource.readyState).toBe("open");
      expect(mockOnSourceOpen$).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("should emit once if source open several times", (done) => {
    const fakeMediaSource = {
      readyState: "closed",
    };

    const mockOnSourceOpen$ = jest.fn(() => {
      return observableInterval(500).pipe(
        tap(() => fakeMediaSource.readyState = "open"),
        mapTo(null)
      );
    });

    jest.mock("../event_listeners", () => ({
      __esModule: true as const,
      onSourceOpen$: mockOnSourceOpen$,
    }));

    const whenMediaSourceOpen$ = require("../when_media_source_open").default;
    whenMediaSourceOpen$(fakeMediaSource).pipe(
      finalize(() => {
        expect(fakeMediaSource.readyState).toBe("open");
        expect(mockOnSourceOpen$).toHaveBeenCalledTimes(1);
        done();
      })
    ).subscribe();
  });

  it("should emit if readyState is already opened", (done) => {
    const fakeMediaSource = {
      readyState: "open",
    };

    const mockOnSourceOpen$ = jest.fn(() => null);

    jest.mock("../event_listeners", () => ({
      __esModule: true as const,
      onSourceOpen$: mockOnSourceOpen$,
    }));

    const whenMediaSourceOpen$ = require("../when_media_source_open").default;
    whenMediaSourceOpen$(fakeMediaSource).subscribe(() => {
      expect(fakeMediaSource.readyState).toBe("open");
      expect(mockOnSourceOpen$).not.toHaveBeenCalled();
      done();
    });
  });
});
