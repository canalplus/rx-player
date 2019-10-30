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
import { map } from "rxjs/operators";
import { ProberStatus } from "../../types";

/* tslint:disable no-unsafe-any */

describe("MediaCapabilitiesProber probers - DRMInfos", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should throw if no keySystem provided", () => {
    const configuration = {};
    const probeDRMInfos = require("../../probers/DRMInfos").default;
    /* tslint:disable no-floating-promises */
    expect(probeDRMInfos(configuration)).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " +
      "Missing a type argument to request a media key system access."
    );
    /* tslint:enable no-floating-promises */
  });

  it("should throw if no type of keySystem provided", () => {
    const configuration = {
      keySystem: {},
    };
    const probeDRMInfos = require("../../probers/DRMInfos").default;
    /* tslint:disable no-floating-promises */
    expect(probeDRMInfos(configuration)).rejects.toThrow(
      "MediaCapabilitiesProber >>> API_CALL: " +
      "Missing a type argument to request a media key system access."
    );
    /* tslint:enable no-floating-promises */
  });

  it("should resolve with `NotSupported` if no requestMediaKeySystemAccess", () => {
    const configuration = {
      keySystem: {
        type: "clearkick",
      },
    };
    jest.mock("../../../../../compat", () => ({
      requestMediaKeySystemAccess: null,
    }));
    const probeDRMInfos = require("../../probers/DRMInfos").default;
    /* tslint:disable no-floating-promises */
    expect(probeDRMInfos(configuration)).resolves.toEqual(
      [ProberStatus.NotSupported, { configuration: {}, type: "clearkick" }]
    /* tslint:enable no-floating-promises */
    );
  });

  it("should resolve with `Supported` if config is supported", (done) => {
    const configuration = {
      keySystem: {
        type: "clearkick",
      },
    };
    const mockRequestMediaKeySystemAccess = jest.fn(() => {
      return observableOf({
        getConfiguration: () => ({}),
      });
    });
    jest.mock("../../../../../compat", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    }));
    const probeDRMInfos = require("../../probers/DRMInfos").default;
    expect.assertions(2);
    probeDRMInfos(configuration)
      .then((res: any) => {
        expect(res).toEqual(
          [
            ProberStatus.Supported,
            { compatibleConfiguration: {}, configuration: {}, type: "clearkick" },
          ]
        );
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should resolve with `NotSupported` if config is not supported", (done) => {
    const configuration = {
      keySystem: {
        type: "clearkick",
      },
    };
    const mockRequestMediaKeySystemAccess = jest.fn(
      () => {
        return observableOf(null).pipe(
          map(() => {
            throw new Error();
          })
        );
      }
    );
    jest.mock("../../../../../compat", () => ({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    }));

    const probeDRMInfos = require("../../probers/DRMInfos").default;
    expect.assertions(2);
    probeDRMInfos(configuration)
      .then((res: any) => {
        expect(res).toEqual(
          [
            ProberStatus.NotSupported,
            { configuration: {}, type: "clearkick" },
          ]
        );
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });
});

/* tslint:enable no-unsafe-any */
