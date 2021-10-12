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

import {
  map,
  of as observableOf,
} from "rxjs";
import { ProberStatus } from "../../types";


describe("MediaCapabilitiesProber probers - DRMInfos", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should throw if no keySystem provided", () => {
    const configuration = {};
    const probeDRMInfos = require("../../probers/DRMInfos").default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeDRMInfos(configuration)).rejects.toEqual(
      "MediaCapabilitiesProber >>> API_CALL: " +
      "Missing a type argument to request a media key system access."
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should throw if no type of keySystem provided", () => {
    const configuration = {
      keySystem: {},
    };
    const probeDRMInfos = require("../../probers/DRMInfos").default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeDRMInfos(configuration)).rejects.toEqual(
      "MediaCapabilitiesProber >>> API_CALL: " +
      "Missing a type argument to request a media key system access."
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
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
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeDRMInfos(configuration)).resolves.toEqual(
      [ProberStatus.NotSupported, { configuration: {}, type: "clearkick" }]
    /* eslint-enable @typescript-eslint/no-floating-promises */
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
      .then((res: unknown) => {
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
      .then((res: unknown) => {
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

