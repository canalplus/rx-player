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

interface IFakeDocument {
  createElement(eltType: string) : HTMLElement;
  fullscreenElement? : Element | null;
  mozCancelFullScreen? : () => void;
  mozFullScreenElement? : HTMLElement;
  msExitFullscreen? : () => void;
  exitFullscreen? : () => void;
  msFullscreenElement? : Element | null;
  webkitExitFullscreen : () => void;
  webkitFullscreenElement : Element | null | undefined;
  webkitHidden? : boolean;
}

const doc = document as unknown as IFakeDocument;

describe("compat - isFullScreen", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return false when is not fullscreen", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origmozFullScreenElement = doc.mozFullScreenElement;
    const origWebkitFullscreenElement = doc.webkitFullscreenElement;
    const origMsFullscreenElement = doc.msFullscreenElement;

    doc.fullscreenElement = undefined;
    doc.mozFullScreenElement = undefined;
    doc.webkitFullscreenElement = undefined;
    doc.msFullscreenElement = undefined;

    const { isFullscreen } = require("../fullscreen");
    expect(isFullscreen()).toBe(false);

    doc.fullscreenElement = origFullscreenElement;
    doc.mozFullScreenElement = origmozFullScreenElement;
    doc.webkitFullscreenElement = origWebkitFullscreenElement;
    doc.msFullscreenElement = origMsFullscreenElement;
  });

  it("should return true when is fullscreen", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origmozFullScreenElement = doc.mozFullScreenElement;
    const origWebkitFullscreenElement = doc.webkitFullscreenElement;
    const origMsFullscreenElement = doc.msFullscreenElement;

    doc.fullscreenElement = doc.createElement("video");
    doc.mozFullScreenElement = undefined;
    doc.webkitFullscreenElement = undefined;
    doc.msFullscreenElement = undefined;

    const { isFullscreen } = require("../fullscreen");
    expect(isFullscreen()).toBe(true);

    doc.fullscreenElement = origFullscreenElement;
    doc.mozFullScreenElement = origmozFullScreenElement;
    doc.webkitFullscreenElement = origWebkitFullscreenElement;
    doc.msFullscreenElement = origMsFullscreenElement;
  });
});

describe("compat - requestFullscreen", () => {
  it("should request full screen with requestFullscreen API", () => {
    const origFullscreenElement = doc.fullscreenElement;
    doc.fullscreenElement = undefined;

    const { requestFullscreen } = require("../fullscreen");
    const videoElt = doc.createElement("video");
    const mockRequestFullscreen = jest.fn(() =>
      doc.fullscreenElement = videoElt);
    const fakeElement = {
      requestFullscreen: mockRequestFullscreen,
    };

    requestFullscreen(fakeElement);
    expect(doc.fullscreenElement).toBe(videoElt);

    doc.fullscreenElement = origFullscreenElement;
  });

  it("should request full screen with msRequestFullscreen API", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origMsFullscreenElement = doc.msFullscreenElement;

    doc.fullscreenElement = undefined;
    doc.msFullscreenElement = undefined;

    const { requestFullscreen } = require("../fullscreen");
    const videoElt = doc.createElement("video");
    const mockRequestFullscreen =
      jest.fn(() => doc.msFullscreenElement = videoElt);
    const fakeElement = {
      msRequestFullscreen: mockRequestFullscreen,
    };

    requestFullscreen(fakeElement);
    expect(doc.msFullscreenElement).toBe(videoElt);

    doc.fullscreenElement = origFullscreenElement;
    doc.msFullscreenElement = origMsFullscreenElement;
  });

  it("should request full screen with mozRequestFullScreen API", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origMsFullscreenElement = doc.msFullscreenElement;
    const origmozFullScreenElement = doc.mozFullScreenElement;

    doc.fullscreenElement = undefined;
    doc.msFullscreenElement = undefined;
    doc.mozFullScreenElement = undefined;

    const { requestFullscreen } = require("../fullscreen");
    const videoElt = doc.createElement("video");
    const mockRequestFullscreen =
      jest.fn(() => doc.mozFullScreenElement = videoElt);
    const fakeElement = {
      mozRequestFullScreen: mockRequestFullscreen,
    };

    requestFullscreen(fakeElement);
    expect(doc.mozFullScreenElement).toBe(videoElt);

    doc.fullscreenElement = origFullscreenElement;
    doc.msFullscreenElement = origMsFullscreenElement;
    doc.mozFullScreenElement = origmozFullScreenElement;
  });

  it("should request full screen with webkitRequestFullscreen API", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origMsFullscreenElement = doc.msFullscreenElement;
    const origmozFullScreenElement = doc.mozFullScreenElement;
    const origWebkitFullscreenElement = doc.webkitFullscreenElement;

    doc.fullscreenElement = undefined;
    doc.msFullscreenElement = undefined;
    doc.mozFullScreenElement = undefined;
    doc.webkitFullscreenElement = undefined;

    const { requestFullscreen } = require("../fullscreen");
    const videoElt = doc.createElement("video");
    const mockRequestFullscreen =
      jest.fn(() => doc.webkitFullscreenElement = videoElt);
    const fakeElement = {
      webkitRequestFullscreen: mockRequestFullscreen,
    };

    requestFullscreen(fakeElement);
    expect(doc.webkitFullscreenElement).toBe(videoElt);

    doc.fullscreenElement = origFullscreenElement;
    doc.msFullscreenElement = origMsFullscreenElement;
    doc.mozFullScreenElement = origmozFullScreenElement;
    doc.webkitFullscreenElement = origWebkitFullscreenElement;
  });
});

describe("compat - exitFullScreen", () => {
  it("should exit full screen with exitFullscreen API", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origExitFullscreen = doc.exitFullscreen;

    doc.fullscreenElement = doc.createElement("video");
    doc.exitFullscreen = jest.fn(() => {
      doc.fullscreenElement = undefined;
    });

    const { exitFullscreen } = require("../fullscreen");

    exitFullscreen();
    expect(doc.fullscreenElement).toBe(undefined);

    doc.fullscreenElement = origFullscreenElement;
    doc.exitFullscreen = origExitFullscreen;
  });

  it("should exit full screen with msExitFullscreen API", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origMsFullscreenElement = doc.msFullscreenElement;
    const origExitFullscreen = doc.exitFullscreen;
    const origMsExitFullscreen = doc.msExitFullscreen;

    doc.fullscreenElement = undefined;
    doc.msFullscreenElement = doc.createElement("video");
    doc.exitFullscreen = undefined;
    doc.msExitFullscreen = jest.fn(() => {
      doc.msFullscreenElement = undefined;
    });

    const { exitFullscreen } = require("../fullscreen");

    exitFullscreen();
    expect(doc.msFullscreenElement).toBe(undefined);

    doc.fullscreenElement = origFullscreenElement;
    doc.msFullscreenElement = origMsFullscreenElement;
    doc.exitFullscreen = origExitFullscreen;
    doc.msExitFullscreen = origMsExitFullscreen;
  });

  it("should exit full screen with mozCancelFullScreen API", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origMsFullscreenElement = doc.msFullscreenElement;
    const origmozFullScreenElement = doc.mozFullScreenElement;
    const origExitFullscreen = doc.exitFullscreen;
    const origMsExitFullscreen = doc.msExitFullscreen;
    const origmozCancelFullScreen = doc.mozCancelFullScreen;

    doc.fullscreenElement = undefined;
    doc.msFullscreenElement = undefined;
    doc.mozFullScreenElement = doc.createElement("video");
    doc.exitFullscreen = undefined;
    doc.msExitFullscreen = undefined;
    doc.mozCancelFullScreen = jest.fn(() =>
      doc.mozFullScreenElement = undefined);

    const { exitFullscreen } = require("../fullscreen");

    exitFullscreen();
    expect(doc.mozFullScreenElement).toBe(undefined);

    doc.fullscreenElement = origFullscreenElement;
    doc.msFullscreenElement = origMsFullscreenElement;
    doc.mozFullScreenElement = origmozFullScreenElement;
    doc.exitFullscreen = origExitFullscreen;
    doc.msExitFullscreen = origMsExitFullscreen;
    doc.mozCancelFullScreen = origmozCancelFullScreen;
  });

  it("should exit full screen with webkitExitFullscreen API", () => {
    const origFullscreenElement = doc.fullscreenElement;
    const origMsFullscreenElement = doc.msFullscreenElement;
    const origmozFullScreenElement = doc.mozFullScreenElement;
    const origWebkitFullscreenElement = doc.webkitFullscreenElement;
    const origExitFullscreen = doc.exitFullscreen;
    const origMsExitFullscreen = doc.msExitFullscreen;
    const origmozCancelFullScreen = doc.mozCancelFullScreen;
    const origwebkitExitFullscreen = doc.webkitExitFullscreen;

    doc.fullscreenElement = undefined;
    doc.msFullscreenElement = undefined;
    doc.mozFullScreenElement = undefined;
    doc.webkitFullscreenElement = doc.createElement("video");
    doc.exitFullscreen = undefined;
    doc.msExitFullscreen = undefined;
    doc.mozCancelFullScreen = undefined;
    doc.webkitExitFullscreen = jest.fn(() =>
      doc.webkitFullscreenElement = undefined);

    const { exitFullscreen } = require("../fullscreen");

    exitFullscreen();
    expect(doc.webkitFullscreenElement).toBe(undefined);

    doc.fullscreenElement = origFullscreenElement;
    doc.msFullscreenElement = origMsFullscreenElement;
    doc.mozFullScreenElement = origmozFullScreenElement;
    doc.webkitFullscreenElement = origWebkitFullscreenElement;
    doc.exitFullscreen = origExitFullscreen;
    doc.msExitFullscreen = origMsExitFullscreen;
    doc.mozCancelFullScreen = origmozCancelFullScreen;
    doc.webkitExitFullscreen = origwebkitExitFullscreen;
  });
});
