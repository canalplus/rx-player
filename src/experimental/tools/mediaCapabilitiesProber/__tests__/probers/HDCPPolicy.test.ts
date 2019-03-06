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

import { of as observableOf } from "rxjs";
import PPromise from "../../../../../utils/promise";
import { ProberStatus } from "../../types";

describe("MediaCapabilitiesProber probers - HDCPPolicy", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should throw if no requestMediaKeySystemAccess", () => {
    jest.mock("../../../../../compat", () => ({
      requestMediaKeySystemAccess: null,
    }));
    const probeHDCPPolicy = require("../../probers/HDCPPolicy").default;
    /* tslint:disable no-floating-promises */
    expect(probeHDCPPolicy({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: API not available");
    /* tslint:enable no-floating-promises */
  });

  it("should throw if no hdcp attribute in config", () => {
    jest.mock("../../../../../compat", () => ({
      requestMediaKeySystemAccess: {},
    }));
    const probeHDCPPolicy = require("../../probers/HDCPPolicy").default;
    /* tslint:disable no-floating-promises */
    expect(probeHDCPPolicy({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " +
      "Missing policy argument for calling getStatusForPolicy."
    );
    /* tslint:enable no-floating-promises */
  });

  it("should resolve with `Unknown` if no getStatusForPolicy API", (done) => {
    const mockCreateMediaKeys = jest.fn(() => {
      return PPromise.resolve({});
    });
    const mockRequestMediaKeySystemAcces = jest.fn(() => {
      return observableOf({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    jest.mock("../../../../../compat", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
    }));

    const probeHDCPPolicy = require("../../probers/HDCPPolicy").default;

    expect.assertions(3);
    probeHDCPPolicy({ hdcp: "1.1" })
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.Unknown);
        expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should resolve with `Supported` if policy is supported", (done) => {
    const mockCreateMediaKeys = jest.fn(() => {
      return PPromise.resolve({
        getStatusForPolicy: () => PPromise.resolve("usable"),
      });
    });
    const mockRequestMediaKeySystemAcces = jest.fn(() => {
      return observableOf({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    jest.mock("../../../../../compat", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
    }));

    const probeHDCPPolicy = require("../../probers/HDCPPolicy").default;

    expect.assertions(3);
    probeHDCPPolicy({ hdcp: "1.1" })
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should resolve with `NotSupported` if policy is not supported", (done) => {
    const mockCreateMediaKeys = jest.fn(() => {
      return PPromise.resolve({
        getStatusForPolicy: () => PPromise.resolve("not-usable"),
      });
    });
    const mockRequestMediaKeySystemAcces = jest.fn(() => {
      return observableOf({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    jest.mock("../../../../../compat", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
    }));

    const probeHDCPPolicy = require("../../probers/HDCPPolicy").default;

    expect.assertions(3);
    probeHDCPPolicy({ hdcp: "1.1" })
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });
});
