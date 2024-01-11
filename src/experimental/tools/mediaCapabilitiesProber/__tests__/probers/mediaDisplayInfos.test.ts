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


import globalScope from "../../../../../compat/global_scope";
import { ProberStatus } from "../../types";

describe("MediaCapabilitiesProber probers probeMediaDisplayInfos", () => {
  it("should throw if matchMedia is undefined", () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    (globalScope as any).matchMedia = undefined;
    const probeMediaDisplayInfos =
      jest.requireActual("../../probers/mediaDisplayInfos").default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeMediaDisplayInfos({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: matchMedia not available");
    /* eslint-enable @typescript-eslint/no-floating-promises */
    (globalScope as any).matchMedia  = origMatchMedia;
  });

  it("should throw if no colorSpace in display configuration", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => true);
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {
      display: {},
    };

    const probeMediaDisplayInfos =
      jest.requireActual("../../probers/mediaDisplayInfos").default;

    expect.assertions(1);
    probeMediaDisplayInfos(config)
      .then(() => {
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling matchMedia.");
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      });
  });

  it("should throw if no display in configuration", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => true);
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {};

    const probeMediaDisplayInfos =
      jest.requireActual("../../probers/mediaDisplayInfos").default;

    expect.assertions(1);
    probeMediaDisplayInfos(config)
      .then(() => {
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling matchMedia.");
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      });
  });

  it("should throw if mediaMatch called with bad arguments", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => ({
      media: "not all",
    }));
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const probeMediaDisplayInfos =
      jest.requireActual("../../probers/mediaDisplayInfos").default;

    expect.assertions(2);
    probeMediaDisplayInfos(config)
      .then(() => {
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe("MediaCapabilitiesProber >>> API_CALL: " +
          "Bad arguments for calling matchMedia.");
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      });
  });

  it("should resolves with `Supported` if color space is supported", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => ({
      matches: true,
    }));
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const probeMediaDisplayInfos =
      jest.requireActual("../../probers/mediaDisplayInfos").default;

    expect.assertions(2);
    probeMediaDisplayInfos(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      })
      .catch(() => {
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      });
  });

  it("should resolves with `NotSupported` if color space is not supported", (done) => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = jest.fn(() => ({
      matches: false,
    }));
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "p5",
      },
    };

    const probeMediaDisplayInfos =
      jest.requireActual("../../probers/mediaDisplayInfos").default;

    expect.assertions(2);
    probeMediaDisplayInfos(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      })
      .catch(() => {
        (globalScope as any).matchMedia = origMatchMedia;
        done();
      });
  });
});

