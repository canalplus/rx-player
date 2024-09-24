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
/* eslint-disable no-restricted-properties */

import { ProberStatus } from "../../types";

// TODO for whatever reason about which I spent too much time already,
// `jest.mock` with `_esModule` set to `true` does not work as expected here
// like it does on every other RxPlayer test file on the planet.
// I chose to scrap that default import syntax in `jest.mock` just in this
// file and make it as if compat/eme exported an object instead.

describe("MediaCapabilitiesProber probers - HDCPPolicy", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("should throw if no requestMediaKeySystemAccess", () => {
    jest.mock("../../../../../compat/eme", () => ({}));
    const probeHDCPPolicy = jest.requireActual("../../probers/HDCPPolicy").default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeHDCPPolicy({})).rejects.toEqual(
      "MediaCapabilitiesProber >>> API_CALL: API not available",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should throw if no hdcp attribute in config", () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => {
      return Promise.resolve({
        getConfiguration: () => ({}),
      });
    });
    jest.mock("../../../../../compat/eme", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    }));
    const probeHDCPPolicy = jest.requireActual("../../probers/HDCPPolicy").default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeHDCPPolicy({})).rejects.toEqual(
      "MediaCapabilitiesProber >>> API_CALL: " +
        "Missing policy argument for calling getStatusForPolicy.",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should resolve with `Unknown` if no getStatusForPolicy API", (done) => {
    const mockCreateMediaKeys = jest.fn(() => {
      return Promise.resolve({});
    });
    const mockRequestMediaKeySystemAcces = jest.fn(() => {
      return Promise.resolve({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    jest.mock("../../../../../compat/eme", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
    }));

    const probeHDCPPolicy = jest.requireActual("../../probers/HDCPPolicy").default;

    probeHDCPPolicy({ hdcp: "1.1" })
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.Unknown);
        expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
        done();
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });
  });

  it("should resolve with `Supported` if policy is supported", (done) => {
    const mockCreateMediaKeys = jest.fn(() => {
      return Promise.resolve({
        getStatusForPolicy: () => Promise.resolve("usable"),
      });
    });
    const mockRequestMediaKeySystemAcces = jest.fn(() => {
      return Promise.resolve({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    jest.mock("../../../../../compat/eme", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
    }));

    const probeHDCPPolicy = jest.requireActual("../../probers/HDCPPolicy").default;

    probeHDCPPolicy({ hdcp: "1.1" })
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
        done();
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });
  });

  it("should resolve with `NotSupported` if policy is not supported", (done) => {
    const mockCreateMediaKeys = jest.fn(() => {
      return Promise.resolve({
        getStatusForPolicy: () => Promise.resolve("not-usable"),
      });
    });
    const mockRequestMediaKeySystemAcces = jest.fn(() => {
      return Promise.resolve({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    jest.mock("../../../../../compat/eme", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
    }));

    const probeHDCPPolicy = jest.requireActual("../../probers/HDCPPolicy").default;
    probeHDCPPolicy({ hdcp: "1.1" })
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
        done();
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });
  });
});
