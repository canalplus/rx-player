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

import PPromise from "../../../../../utils/promise";

import probeDecodingInfos from "../../probers/decodingInfo";
import {
  IMediaConfiguration,
  ProberStatus,
} from "../../types";

const origDecodingInfo = (navigator as any).mediaCapabilities;

/**
 * Stub decodingInfo API to resolve.
 * @param {boolean} isSupported
 * @param {undefined|boolean} mustReject
 */
function stubDecodingInfo(isSupported: boolean, mustReject?: boolean) {
  const decodingInfoStub = jest.fn(() => {
    if (mustReject === true) {
      return PPromise.reject();
    } else {
      return PPromise.resolve({
        supported: isSupported,
      });
    }
  });

  const mockMediaCapabilities = {
    decodingInfo: decodingInfoStub,
  };

  (navigator as any).mediaCapabilities = mockMediaCapabilities;
  return decodingInfoStub;
}

/**
 * Reset decodingInfo to native implementation.
 */
function resetDecodingInfos(): void {
  (navigator as any).mediaCapabilities = origDecodingInfo;
}

describe("MediaCapabilitiesProber probers - decodingInfo", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should throw if no video and audio config", (done) => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as "media-source",
    };

  expect.assertions(2);
  probeDecodingInfos(configuration)
    .then(() => {
      resetDecodingInfos();
      done();
    })
    .catch(({ message }: { message: string }) => {
      expect(message).toEqual("MediaCapabilitiesProber >>> API_CALL: " +
        "Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
      resetDecodingInfos();
      done();
    });
  });

  it("should throw if incomplete video config", (done) => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as "media-source",
      video: {
        contentType: "video/wmv",
      },
    };

    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling mediaCapabilites.");
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
        done();
      });
  });

  it("should throw if incomplete audio config", (done) => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };

    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling mediaCapabilites.");
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
        done();
      });
  });

  it("should throw if no type in config", (done) => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      audio: {
        contentType: "audio/wma",
      },
    };
    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling mediaCapabilites.");
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
        done();
      });
  });

  it("should throw if empty config", (done) => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {};

    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
        done();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual("MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling mediaCapabilites.");
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
        done();
      });
  });

  it("should throw if API mediaCapabilities not available", () => {
    const origMediaCapabilities = (navigator as any).mediaCapabilities;
    delete (navigator as any).mediaCapabilities;
    /* tslint:disable no-floating-promises */
    expect(probeDecodingInfos({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: MediaCapabilities API not available"
    );
    /* tslint:enable no-floating-promises */
    (navigator as any).mediaCapabilities = origMediaCapabilities;
  });

  it("should throw if API decodingInfo not available", () => {
    if ((navigator as any).mediaCapabilities) {
      /* tslint:disable no-unsafe-any */
      delete (navigator as any).mediaCapabilities.decodingInfo;
      /* tslint:enable no-unsafe-any */
    } else {
      (navigator as any).mediaCapabilities = {};
    }
    /* tslint:disable no-floating-promises */
    expect(probeDecodingInfos({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: Decoding Info not available"
    );
    /* tslint:enable no-floating-promises */
    if ((navigator as any).mediaCapabilities) {
      /* tslint:disable no-unsafe-any */
      (navigator as any).mediaCapabilities.decodingInfo = origDecodingInfo;
      /* tslint:enable no-unsafe-any */
    } else {
      (navigator as any).mediaCapabilities = undefined;
    }
  });

  it("should resolve with `Supported` if decodingInfo supports (video only)", (done) => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
    };

    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.Supported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
        done();
      })
      .catch(() => {
        resetDecodingInfos();
        done();
      });
  });

  it("should resolve with `Supported` if decodingInfo supports (audio only)", (done) => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };

    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.Supported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
        done();
      })
      .catch(() => {
        resetDecodingInfos();
        done();
      });
  });

  it("should resolve with `Supported` if decodingInfo supports video + audio", (done) => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };
    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.Supported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
        done();
      })
      .catch(() => {
        resetDecodingInfos();
        done();
      });
  });

  it("should return `NotSupported` if no decodingInfo support (video only)", (done) => {
    const decodingInfoStub = stubDecodingInfo(false);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
    };
    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.NotSupported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
        done();
      })
      .catch(() => {
        resetDecodingInfos();
        done();
      });
  });

  it("should return `NotSupported` if no decodingInfo support (audio only)", (done) => {
    const decodingInfoStub = stubDecodingInfo(false);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };
    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.NotSupported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
        done();
      })
      .catch(() => {
        resetDecodingInfos();
        done();
      });
  });

  it("should return `NotSupported` if no decodingInfo support", (done) => {
    const decodingInfoStub = stubDecodingInfo(false);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };
    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.NotSupported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
        done();
      })
      .catch(() => {
        resetDecodingInfos();
        done();
      });
  });

  it("should resolve with `NotSupported` if decodingInfo throws", (done) => {
    const decodingInfoStub = stubDecodingInfo(true, true);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };
    expect.assertions(2);
    probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.NotSupported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
        done();
      })
      .catch(() => {
        resetDecodingInfos();
        done();
      });
  });
});
