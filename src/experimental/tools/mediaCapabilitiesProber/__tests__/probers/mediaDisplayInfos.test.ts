/**
 * Copyright 2017 CANAL+ Group
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
/* eslint-disable @typescript-eslint/no-explicit-any */


import { ProberStatus } from "../../types";

describe("MediaCapabilitiesProber probers probeMediaDisplayInfos", () => {
  it("should throw if matchMedia is undefined", () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origWindowMatchMedia = window.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    (window as any).matchMedia = undefined;
    const probeMediaDisplayInfos = require("../../probers/mediaDisplayInfos").default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeMediaDisplayInfos({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: matchMedia not available");
    /* eslint-enable @typescript-eslint/no-floating-promises */
    (window as any).matchMedia  = origWindowMatchMedia;
  });

  it("should throw if no colorSpace in display configuration", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origWindowMatchMedia = window.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => true);
    (window as any).matchMedia = mockMatchMedia;
    const config = {
      display: {},
    };

    const probeMediaDisplayInfos = require("../../probers/mediaDisplayInfos").default;

    expect.assertions(1);
    probeMediaDisplayInfos(config)
      .then(() => {
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling matchMedia.");
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      });
  });

  it("should throw if no display in configuration", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origWindowMatchMedia = window.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => true);
    (window as any).matchMedia = mockMatchMedia;
    const config = {};

    const probeMediaDisplayInfos = require("../../probers/mediaDisplayInfos").default;

    expect.assertions(1);
    probeMediaDisplayInfos(config)
      .then(() => {
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling matchMedia.");
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      });
  });

  it("should throw if mediaMatch called with bad arguments", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origWindowMatchMedia = window.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => ({
      media: "not all",
    }));
    (window as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const probeMediaDisplayInfos = require("../../probers/mediaDisplayInfos").default;

    expect.assertions(2);
    probeMediaDisplayInfos(config)
      .then(() => {
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe("MediaCapabilitiesProber >>> API_CALL: " +
          "Bad arguments for calling matchMedia.");
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      });
  });

  it("should resolves with `Supported` if color space is supported", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origWindowMatchMedia = window.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => ({
      matches: true,
    }));
    (window as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const probeMediaDisplayInfos = require("../../probers/mediaDisplayInfos").default;

    expect.assertions(2);
    probeMediaDisplayInfos(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      })
      .catch(() => {
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      });
  });

  it("should resolves with `NotSupported` if color space is not supported", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origWindowMatchMedia = window.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => ({
      matches: false,
    }));
    (window as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "p5",
      },
    };

    const probeMediaDisplayInfos = require("../../probers/mediaDisplayInfos").default;

    expect.assertions(2);
    probeMediaDisplayInfos(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      })
      .catch(() => {
        (window as any).matchMedia = origWindowMatchMedia;
        done();
      });
  });
});

