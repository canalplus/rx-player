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

// Needed for calling require (which itself is needed to mock properly) because
// it is not type-checked:
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("compat - browser compatibility types", () => {
  interface IFakeWindow {
    MediaSource? : unknown;
    MozMediaSource? : unknown;
    WebKitMediaSource? : unknown;
    MSMediaSource? : unknown;
  }
  const win = window as IFakeWindow;
  beforeEach(() => {
    jest.resetModules();
  });

  it("should set the MediaSource to `undefined` when running nodejs", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: true }));

    const origMediaSource = win.MediaSource;
    const origMozMediaSource = win.MozMediaSource;
    const origWebKitMediaSource = win.WebKitMediaSource;
    const origMSMediaSource = win.MSMediaSource;

    win.MediaSource = { a: 1 };
    win.MozMediaSource = { a: 2 };
    win.WebKitMediaSource = { a: 3 };
    win.MSMediaSource = { a: 4 };

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual(undefined);

    win.MediaSource = origMediaSource;
    win.MozMediaSource = origMozMediaSource;
    win.WebKitMediaSource = origWebKitMediaSource;
    win.MSMediaSource = origMSMediaSource;
  });

  it("should use the native MediaSource if defined", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: false }));

    const origMediaSource = win.MediaSource;
    const origMozMediaSource = win.MozMediaSource;
    const origWebKitMediaSource = win.WebKitMediaSource;
    const origMSMediaSource = win.MSMediaSource;

    win.MediaSource = { a: 1 };
    win.MozMediaSource = { a: 2 };
    win.WebKitMediaSource = { a: 3 };
    win.MSMediaSource = { a: 4 };

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 1 });

    win.MediaSource = origMediaSource;
    win.MozMediaSource = origMozMediaSource;
    win.WebKitMediaSource = origWebKitMediaSource;
    win.MSMediaSource = origMSMediaSource;
  });

  it("should use MozMediaSource if defined and MediaSource is not", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: false }));

    const origMediaSource = win.MediaSource;
    const origMozMediaSource = win.MozMediaSource;
    const origWebKitMediaSource = win.WebKitMediaSource;
    const origMSMediaSource = win.MSMediaSource;

    win.MediaSource = undefined;
    win.MozMediaSource = { a: 2 };
    win.WebKitMediaSource = undefined;
    win.MSMediaSource = undefined;

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 2 });

    win.MediaSource = origMediaSource;
    win.MozMediaSource = origMozMediaSource;
    win.WebKitMediaSource = origWebKitMediaSource;
    win.MSMediaSource = origMSMediaSource;
  });

  it("should use WebKitMediaSource if defined and MediaSource is not", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: false }));

    const origMediaSource = win.MediaSource;
    const origMozMediaSource = win.MozMediaSource;
    const origWebKitMediaSource = win.WebKitMediaSource;
    const origMSMediaSource = win.MSMediaSource;

    win.MediaSource = undefined;
    win.MozMediaSource = undefined;
    win.WebKitMediaSource = { a: 3 };
    win.MSMediaSource = undefined;

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 3 });

    win.MediaSource = origMediaSource;
    win.MozMediaSource = origMozMediaSource;
    win.WebKitMediaSource = origWebKitMediaSource;
    win.MSMediaSource = origMSMediaSource;
  });

  it("should use MSMediaSource if defined and MediaSource is not", () => {
    jest.mock("../is_node", () => ({ __esModule: true as const,
                                     default: false }));

    const origMediaSource = win.MediaSource;
    const origMozMediaSource = win.MozMediaSource;
    const origWebKitMediaSource = win.WebKitMediaSource;
    const origMSMediaSource = win.MSMediaSource;

    win.MediaSource = undefined;
    win.MozMediaSource = undefined;
    win.WebKitMediaSource = undefined;
    win.MSMediaSource = { a: 4 };

    const { MediaSource_ } = require("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 4 });

    win.MediaSource = origMediaSource;
    win.MozMediaSource = origMozMediaSource;
    win.WebKitMediaSource = origWebKitMediaSource;
    win.MSMediaSource = origMSMediaSource;
  });
});
