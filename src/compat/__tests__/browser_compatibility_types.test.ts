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

describe("compat - browser compatibility types", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should set the MediaSource to `undefined` when running nodejs", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: true }));

    const origMediaSource = (window as any).MediaSource;
    const origMozMediaSource = (window as any).MozMediaSource;
    const origWebKitMediaSource = (window as any).WebKitMediaSource;
    const origMSMediaSource = (window as any).MSMediaSource;

    (window as any).MediaSource = { a: 1 };
    (window as any).MozMediaSource = { a: 2 };
    (window as any).WebKitMediaSource = { a: 3 };
    (window as any).MSMediaSource = { a: 4 };

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual(undefined);

    (window as any).MediaSource = origMediaSource;
    (window as any).MozMediaSource = origMozMediaSource;
    (window as any).WebKitMediaSource = origWebKitMediaSource;
    (window as any).MSMediaSource = origMSMediaSource;
  });

  it("should use the native MediaSource if defined", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: false }));

    const origMediaSource = (window as any).MediaSource;
    const origMozMediaSource = (window as any).MozMediaSource;
    const origWebKitMediaSource = (window as any).WebKitMediaSource;
    const origMSMediaSource = (window as any).MSMediaSource;

    (window as any).MediaSource = { a: 1 };
    (window as any).MozMediaSource = { a: 2 };
    (window as any).WebKitMediaSource = { a: 3 };
    (window as any).MSMediaSource = { a: 4 };

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 1 });

    (window as any).MediaSource = origMediaSource;
    (window as any).MozMediaSource = origMozMediaSource;
    (window as any).WebKitMediaSource = origWebKitMediaSource;
    (window as any).MSMediaSource = origMSMediaSource;
  });

  it("should use MozMediaSource if defined and MediaSource is not", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: false }));

    const origMediaSource = (window as any).MediaSource;
    const origMozMediaSource = (window as any).MozMediaSource;
    const origWebKitMediaSource = (window as any).WebKitMediaSource;
    const origMSMediaSource = (window as any).MSMediaSource;

    (window as any).MediaSource = undefined;
    (window as any).MozMediaSource = { a: 2 };
    (window as any).WebKitMediaSource = undefined;
    (window as any).MSMediaSource = undefined;

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 2 });

    (window as any).MediaSource = origMediaSource;
    (window as any).MozMediaSource = origMozMediaSource;
    (window as any).WebKitMediaSource = origWebKitMediaSource;
    (window as any).MSMediaSource = origMSMediaSource;
  });

  it("should use WebKitMediaSource if defined and MediaSource is not", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: false }));

    const origMediaSource = (window as any).MediaSource;
    const origMozMediaSource = (window as any).MozMediaSource;
    const origWebKitMediaSource = (window as any).WebKitMediaSource;
    const origMSMediaSource = (window as any).MSMediaSource;

    (window as any).MediaSource = undefined;
    (window as any).MozMediaSource = undefined;
    (window as any).WebKitMediaSource = { a: 3 };
    (window as any).MSMediaSource = undefined;

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 3 });

    (window as any).MediaSource = origMediaSource;
    (window as any).MozMediaSource = origMozMediaSource;
    (window as any).WebKitMediaSource = origWebKitMediaSource;
    (window as any).MSMediaSource = origMSMediaSource;
  });

  it("should use MSMediaSource if defined and MediaSource is not", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: false }));

    const origMediaSource = (window as any).MediaSource;
    const origMozMediaSource = (window as any).MozMediaSource;
    const origWebKitMediaSource = (window as any).WebKitMediaSource;
    const origMSMediaSource = (window as any).MSMediaSource;

    (window as any).MediaSource = undefined;
    (window as any).MozMediaSource = undefined;
    (window as any).WebKitMediaSource = undefined;
    (window as any).MSMediaSource = { a: 4 };

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 4 });

    (window as any).MediaSource = origMediaSource;
    (window as any).MozMediaSource = origMozMediaSource;
    (window as any).WebKitMediaSource = origWebKitMediaSource;
    (window as any).MSMediaSource = origMSMediaSource;
  });
});
