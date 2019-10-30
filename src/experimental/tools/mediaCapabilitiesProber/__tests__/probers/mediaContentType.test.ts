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

import { ProberStatus } from "../../types";

/* tslint:disable no-unsafe-any */

describe("MediaCapabilitiesProber - probers probeMediaContentType", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should throw if no compatible MediaSource API", () => {
    jest.mock("../../../../../compat", () => ({
      MediaSource_: null,
    }));
    const probeMediaContentType = require("../../probers/mediaContentType").default;
    /* tslint:disable no-floating-promises */
    expect(probeMediaContentType({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " +
        "MediaSource API not available"
    );
    /* tslint:enable no-floating-promises */
  });

  it("should throw if no compatible isTypeSupported API", () => {
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: false,
      },
    }));
    const probeMediaContentType = require("../../probers/mediaContentType").default;
    /* tslint:disable no-floating-promises */
    expect(probeMediaContentType({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " +
        "isTypeSupported not available"
    );
    /* tslint:enable no-floating-promises */
  });

  it("should throw if no specified contentType in config", (done) => {
    const mockIsTypeSupported = jest.fn(() => true);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
    };
    const probeMediaContentType = require("../../probers/mediaContentType").default;

    expect.assertions(1);
    probeMediaContentType(config)
      .then(() => {
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling isTypeSupported.");
        done();
      });
  });

  it("should resolve with `Supported` when video contentType is supported", (done) => {
    const mockIsTypeSupported = jest.fn(() => true);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = require("../../probers/mediaContentType").default;

    expect.assertions(2);
    probeMediaContentType(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should resolve with `Supported` when audio contentType is supported", (done) => {
    const mockIsTypeSupported = jest.fn(() => true);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = require("../../probers/mediaContentType").default;

    expect.assertions(2);
    probeMediaContentType(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should resolve with `Supported` when both contentTypes are supported", (done) => {
    const mockIsTypeSupported = jest.fn(() => true);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = require("../../probers/mediaContentType").default;

    expect.assertions(2);
    probeMediaContentType(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should return `NotSupported` when audio contentType is not supported", (done) => {
    const mockIsTypeSupported = jest.fn(() => false);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = require("../../probers/mediaContentType").default;

    expect.assertions(2);
    probeMediaContentType(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should return `NotSupported` when video contentType is not supported", (done) => {
    const mockIsTypeSupported = jest.fn(() => false);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = require("../../probers/mediaContentType").default;

    expect.assertions(2);
    probeMediaContentType(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should resolve with `NotSupported` when contentTypes are not supported", (done) => {
    const mockIsTypeSupported = jest.fn(() => false);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = require("../../probers/mediaContentType").default;

    expect.assertions(2);
    probeMediaContentType(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });

  it("should return `NotSupported` when one contentType is not supported", (done) => {
    const mockIsTypeSupported = jest.fn((type: string) => {
      return type === "video/mp5";
    });
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = require("../../probers/mediaContentType").default;

    expect.assertions(2);
    probeMediaContentType(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(() => {
        done();
      });
  });
});

/* tslint:enable no-unsafe-any */
